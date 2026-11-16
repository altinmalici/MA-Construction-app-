import '@testing-library/jest-dom/vitest';

// Netzwerk-Sperre fuer alle Tests: Kein Test darf die echte Supabase
// erreichen. Ohne das schrieb z.B. der ErrorBoundary-Test ueber logError()
// echte Zeilen in die Produktions-Tabelle error_log (lokal via .env, in CI
// via Secrets). Tests, die Netzwerk brauchen, mocken fetch bzw. das
// jeweilige API-Modul selbst.
globalThis.fetch = () =>
  Promise.reject(new TypeError('Netzwerk ist in Tests gesperrt (src/test/setup.js)'));
