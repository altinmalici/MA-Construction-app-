import { useState, useEffect } from "react";
import { Check, AlertCircle } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { P, BTN, RED, GREEN } from "../../utils/helpers";
import { ScreenLayout, Spinner } from "../ui";
import { fehlerText, istNetzFehler } from "../../utils/errors";
import { clearInviteParam } from "../../utils/invite";

/**
 * Einladungs-Link: Der Mitarbeiter öffnet den Link vom Chef und legt seinen
 * eigenen 4-stelligen PIN fest. Danach ist er direkt angemeldet.
 * `onClose` führt zurück zur normalen Anmeldung.
 */
const Einladung = ({ token, onClose }) => {
  const { actions, completeLogin } = useApp();
  // status: "laedt" | "ok" | "ungueltig" | "netz" | "gespeichert"
  // "gespeichert": PIN ist gesetzt, nur die direkte Anmeldung scheiterte.
  const [status, setStatus] = useState("laedt");
  const [info, setInfo] = useState(null);
  const [step, setStep] = useState(1);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    actions.auth
      .validateOnboardingToken(token)
      .then((r) => {
        if (cancelled) return;
        if (r) {
          setInfo(r);
          setStatus("ok");
        } else {
          setStatus("ungueltig");
        }
      })
      .catch((e) => {
        if (cancelled) return;
        console.error("[Einladung.validate]", e);
        setStatus(istNetzFehler(e) ? "netz" : "ungueltig");
      });
    return () => {
      cancelled = true;
    };
    // actions wird pro Render neu erzeugt; geprüft wird pro Token/Versuch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, attempt]);

  const close = () => {
    clearInviteParam();
    onClose();
  };

  const submit = async (second) => {
    if (pin !== second) {
      setErr("PINs stimmen nicht überein");
      setPin("");
      setConfirm("");
      setStep(1);
      return;
    }
    setBusy(true);
    try {
      const u = await actions.auth.consumeOnboardingToken(token, pin);
      clearInviteParam();
      completeLogin(u);
    } catch (e) {
      console.error("[Einladung.consume]", e);
      // LoginError (hat .kind): Der PIN IST gesetzt und der Link verbraucht,
      // nur die direkte Anmeldung scheiterte (Netz, Rate-Limit). Nicht auf
      // dem PIN-Feld bleiben — ein zweiter Versuch würde "Einladung
      // ungültig" melden, obwohl alles geklappt hat.
      if (e?.kind) {
        clearInviteParam();
        setStatus("gespeichert");
        return;
      }
      setErr(fehlerText(e, "PIN konnte nicht gespeichert werden – bitte erneut versuchen"));
      if (/ung(ü|ue)ltig oder abgelaufen/i.test(String(e?.message || ""))) setStatus("ungueltig");
      setPin("");
      setConfirm("");
      setStep(1);
    } finally {
      setBusy(false);
    }
  };

  const tap = (n) => {
    if (busy) return;
    const value = step === 1 ? pin : confirm;
    const set = step === 1 ? setPin : setConfirm;
    if (n === "del") {
      set(value.slice(0, -1));
      setErr("");
      return;
    }
    if (value.length >= 4) return;
    const next = value + n;
    set(next);
    setErr("");
    if (next.length === 4) {
      if (step === 1) setTimeout(() => setStep(2), 250);
      else setTimeout(() => submit(next), 150);
    }
  };

  const center = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100%",
    textAlign: "center",
  };
  const linkBtn = {
    marginTop: 20,
    fontSize: 15,
    color: P,
    background: "none",
    border: "none",
    minHeight: 44,
  };

  if (status === "laedt")
    return (
      <ScreenLayout>
        <div style={center}>
          <Spinner size={28} color={P} />
          <p style={{ fontSize: 15, color: "#8e8e93", marginTop: 12 }}>Einladung wird geprüft…</p>
        </div>
      </ScreenLayout>
    );

  if (status === "gespeichert")
    return (
      <ScreenLayout>
        <div style={center}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 20,
              width: 64,
              height: 64,
              background: `${GREEN}15`,
              marginBottom: 14,
            }}
          >
            <Check size={28} style={{ color: GREEN }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#000", marginBottom: 8 }}>
            PIN gespeichert
          </h1>
          <p style={{ fontSize: 15, color: "#8e8e93", maxWidth: 300 }}>
            Dein PIN ist festgelegt. Die Anmeldung hat gerade nicht geklappt –
            bitte jetzt mit Benutzername{" "}
            <strong style={{ color: "#000" }}>{info?.username}</strong> und
            deinem PIN anmelden.
          </p>
          <button
            onClick={close}
            style={{
              marginTop: 20,
              minHeight: 50,
              padding: "0 28px",
              borderRadius: 14,
              border: "none",
              background: BTN,
              color: "white",
              fontWeight: 600,
              fontSize: 16,
            }}
          >
            Zur Anmeldung
          </button>
        </div>
      </ScreenLayout>
    );

  if (status !== "ok")
    return (
      <ScreenLayout>
        <div style={center}>
          <AlertCircle size={44} style={{ color: RED, marginBottom: 14 }} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#000", marginBottom: 8 }}>
            {status === "netz" ? "Keine Verbindung" : "Einladung nicht gültig"}
          </h1>
          <p style={{ fontSize: 15, color: "#8e8e93", maxWidth: 300 }}>
            {status === "netz"
              ? "Die Einladung konnte nicht geprüft werden. Bitte Empfang prüfen und erneut versuchen."
              : "Der Link ist abgelaufen oder wurde schon verwendet. Hast du gerade schon einen PIN festgelegt? Dann einfach normal anmelden. Sonst beim Bauleiter einen neuen Link anfordern."}
          </p>
          {status === "netz" && (
            <button
              onClick={() => {
                setStatus("laedt");
                setAttempt((a) => a + 1);
              }}
              style={{
                marginTop: 20,
                minHeight: 50,
                padding: "0 28px",
                borderRadius: 14,
                border: "none",
                background: BTN,
                color: "white",
                fontWeight: 600,
                fontSize: 16,
              }}
            >
              Erneut versuchen
            </button>
          )}
          <button onClick={close} style={linkBtn}>
            Zur Anmeldung
          </button>
        </div>
      </ScreenLayout>
    );

  const value = step === 1 ? pin : confirm;
  return (
    <ScreenLayout>
      <div style={center}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 20,
            width: 64,
            height: 64,
            background: `${GREEN}15`,
            marginBottom: 14,
          }}
        >
          <Check size={28} style={{ color: GREEN }} />
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#000", marginBottom: 4 }}>
          {step === 1 ? "PIN festlegen" : "PIN bestätigen"}
        </h1>
        <p style={{ fontSize: 15, color: "#8e8e93", marginBottom: 6, maxWidth: 300 }}>
          {step === 1
            ? `Hallo ${info.name.split(" ")[0]}! Wähle deinen persönlichen 4-stelligen PIN.`
            : "Gib den PIN zur Bestätigung erneut ein."}
        </p>
        <p style={{ fontSize: 13, color: "#8e8e93", marginBottom: 20 }}>
          Dein Benutzername: <strong style={{ color: "#000" }}>{info.username}</strong>
        </p>
        <div
          role="status"
          aria-label={`${value.length} von 4 Ziffern eingegeben`}
          style={{ display: "flex", justifyContent: "center", gap: 18, marginBottom: 12 }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: 15,
                height: 15,
                borderRadius: "50%",
                backgroundColor: value.length > i ? P : "#d1d5db",
              }}
            />
          ))}
        </div>
        <div role="alert" aria-live="assertive" style={{ minHeight: 24, marginBottom: 16, padding: "0 12px" }}>
          {err ? (
            <p style={{ fontSize: 14, color: RED, fontWeight: 600 }}>{err}</p>
          ) : busy ? (
            <p style={{ fontSize: 14, color: P, fontWeight: 600 }}>Speichere…</p>
          ) : null}
        </div>
        <div style={{ width: "100%", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "del"].map((n, i) => (
            <button
              key={i}
              onClick={() => n !== "" && tap(String(n))}
              disabled={n === "" || busy}
              aria-label={n === "del" ? "Letzte Ziffer löschen" : undefined}
              style={{
                height: 72,
                fontSize: n === "del" ? 24 : 30,
                borderRadius: 16,
                fontWeight: 600,
                border: "none",
                background: n === "" || n === "del" ? "transparent" : "white",
                color: n === "del" ? "#8e8e93" : "#000",
                boxShadow: n !== "" && n !== "del" ? "0 1px 2px rgba(0,0,0,0.06)" : undefined,
              }}
            >
              {n === "del" ? "←" : n}
            </button>
          ))}
        </div>
        <button onClick={close} disabled={busy} style={{ ...linkBtn, color: "#8e8e93" }}>
          Abbrechen
        </button>
      </div>
    </ScreenLayout>
  );
};

export default Einladung;
