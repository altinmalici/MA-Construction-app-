/**
 * Wrapper für Supabase-Queries mit Retry-Logic + Timeout + Abort-Support.
 *
 * Network-Errors (TypeError aus fetch, AbortError außerhalb timeout) werden
 * mit exponential backoff retried (delay, delay*3, delay*9, ...). Logic-
 * Errors aus dem Supabase-Result-Object (`{data, error}` mit error gesetzt)
 * werden NICHT retried — RLS-Denial, Constraint-Violation etc. sind keine
 * Race/Network-Probleme.
 *
 * @param {() => Promise<any>} queryFn — die Supabase-Query als Lambda
 * @param {object} [options]
 * @param {number} [options.retries=2]        max Retry-Versuche nach Initial-Call
 * @param {number} [options.retryDelayMs=500] Basis-Delay; verdreifacht sich pro Retry
 * @param {number} [options.timeoutMs=10000]  Timeout pro Versuch (mit AbortController)
 * @param {AbortSignal} [options.signal]      externes Abort-Signal vom Caller
 * @returns {Promise<any>} das von queryFn gelieferte Ergebnis
 *
 * @example
 *   const { data, error } = await requestWithRetry(
 *     () => supabase.from('baustellen').select('*'),
 *     { retries: 2, signal: ctrl.signal }
 *   );
 */
export async function requestWithRetry(queryFn, options = {}) {
  const {
    retries = 2,
    retryDelayMs = 500,
    timeoutMs = 10000,
    signal,
  } = options;

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort();
    signal?.addEventListener("abort", onAbort, { once: true });
    const timeoutId = setTimeout(() => ctrl.abort(), timeoutMs);

    try {
      // Race: queryFn vs. abort. Supabase-Queries akzeptieren keine
      // signal-Option direkt — wir lösen den Abort über Promise.race.
      const result = await Promise.race([
        queryFn(),
        new Promise((_, reject) => {
          ctrl.signal.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        }),
      ]);
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", onAbort);
      // Logic-Errors NICHT retried — direkt zurück an den Aufrufer.
      return result;
    } catch (err) {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", onAbort);
      lastErr = err;
      // Externes Abort durchreichen, kein Retry.
      if (signal?.aborted) throw err;
      // Letzter Versuch — Error werfen.
      if (attempt === retries) throw err;
      // Backoff: 500ms, 1500ms, 4500ms ...
      const delay = retryDelayMs * Math.pow(3, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastErr;
}
