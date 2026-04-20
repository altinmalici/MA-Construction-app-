import { createContext, useContext, useState, useRef, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { useAppData } from "../lib/useAppData.js";
import { G, P, BTN, RED } from "../utils/helpers";
import { Toast, Spinner } from "../components/ui";
import { compressImage, blobToDataURL } from "../utils/image";

const BACKGROUND_LOCK_MS = 120 * 1000;

const AppContext = createContext(null);

export { AppContext };

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function AppProvider({ children }) {
  const { data, loading, error: dataError, actions } = useAppData();
  const [cu, setCu] = useState(null);
  const [sessionUser, setSessionUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [v, setVRaw] = useState("login");
  const [history, setHistory] = useState([]);
  const prevV = history.length > 0 ? history[history.length - 1] : null;
  const nav = (newView) => {
    setHistory((h) => [...h, v]);
    setVRaw(newView);
  };
  const goBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory((h) => h.slice(0, -1));
      setVRaw(prev);
    }
  };
  const [sb, setSb] = useState(null);
  const [em, setEm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [mitSummary, setMitSummary] = useState(null);
  const [sq, setSq] = useState("");
  const [toasts, setToasts] = useState([]);
  const fileRef = useRef(null);
  const [photoCb, setPhotoCb] = useState(null);
  const [clockTime, setClockTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setClockTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  // Auth session init: gültige Session wird beim App-Start HART invalidiert
  // (signOut), damit kein altes JWT silently RLS-Queries machen kann (z.B.
  // via DevTools-Console). lastUser im localStorage bleibt erhalten, daher
  // funktioniert der "Willkommen zurück"-Greeting weiterhin ohne sessionUser.
  // PIN-Re-Entry läuft über loginAsUser → frischer signInWithPassword.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await actions.auth.getCurrentUser();
        if (cancelled) return;
        if (user) {
          await actions.auth.signOut();
        }
      } catch {
        /* getCurrentUser/signOut-Fehler → wir zeigen eh Login */
      } finally {
        if (!cancelled) {
          setSessionUser(null);
          setCu(null);
          setVRaw("login");
          setAuthChecking(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // onAuthStateChange
  useEffect(() => {
    const { data: { subscription } } = actions.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setCu(null);
        setSessionUser(null);
        setHistory([]);
        setVRaw("login");
      }
    });
    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist last_user nach Login. sessionUser wird unten direkt aus cu
  // abgeleitet — kein zusätzlicher setState im Effect nötig.
  useEffect(() => {
    if (!cu) return;
    try {
      localStorage.setItem(
        "ma_construction_last_user",
        JSON.stringify({ name: cu.name, username: cu.username }),
      );
    } catch {
      /* localStorage nicht verfügbar */
    }
  }, [cu]);
  const effectiveSessionUser = cu
    ? { name: cu.name, username: cu.username }
    : sessionUser;
  // Safety: if not logged in, show login
  useEffect(() => {
    if (!authChecking && !cu && v !== "login") {
      setHistory([]);
      setVRaw("login");
    }
  }, [cu, v, authChecking]);

  // Background-Lock: nur wenn die App >= BACKGROUND_LOCK_MS im Hintergrund
  // war (Homescreen, andere App, Screen gesperrt). Aktivität in der App
  // selbst löst keinen Lock aus. Supabase-Session bleibt aktiv (kein
  // signOut) — sessionUser bleibt gesetzt, damit der "Willkommen zurück"-
  // Screen direkt erscheint und PIN-Re-Entry den User auf das Dashboard
  // zurückbringt.
  const backgroundSinceRef = useRef(null);
  useEffect(() => {
    if (!cu) return;
    // Login während Tab schon hidden ist (z.B. PWA-Launch in den Hintergrund):
    // Hintergrundzeit ab jetzt zählen, sonst lockt der erste "visible"
    // nach langer Hidden-Phase nicht.
    if (document.hidden) backgroundSinceRef.current = Date.now();
    const onVisibilityChange = () => {
      if (document.hidden) {
        backgroundSinceRef.current = Date.now();
      } else {
        const since = backgroundSinceRef.current;
        backgroundSinceRef.current = null;
        if (since && Date.now() - since >= BACKGROUND_LOCK_MS) {
          setCu(null);
          setHistory([]);
          setVRaw("login");
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      backgroundSinceRef.current = null;
    };
  }, [cu]);
  // Seed: Testbaustelle (NUR Dev-Env, um leere Prod-DB nicht zu überraschen)
  const seededRef = useRef(false);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (loading || seededRef.current || data.baustellen.length > 0) return;
    seededRef.current = true;
    const chefUser = data.users.find((u) => u.role === "chef");
    actions.baustellen
      .create({
        kunde: "Testprojekt Muster GmbH",
        adresse: "Musterstraße 12, 1010 Wien",
        status: "aktiv",
        fortschritt: 35,
        ansprechpartner: "Max Mustermann",
        telefon: "0664 123456",
        zugang: "Schlüssel beim Hausmeister",
        startdatum: "2025-01-15",
        enddatum: "2025-06-30",
        budget: 0,
        details: {
          raeume: "12 Zimmer",
          flaeche: "320m²",
          arbeiten: "Vollrenovierung Innenausbau",
          rechnungFirma: "Muster GmbH",
          rechnungAdresse: "Hauptstraße 1, 1010 Wien",
          rechnungEmail: "office@muster.at",
          rechnungUid: "ATU12345678",
        },
        mitarbeiter: chefUser ? [chefUser.id] : [],
        subunternehmer: [],
      })
      .then(() => console.log("Testbaustelle angelegt (DEV)"))
      .catch((e) => console.error("Seed fehlgeschlagen:", e));
  }, [loading, data.baustellen.length]);

  const show = (m, t = "success") => {
    const id = Date.now() + Math.random();
    // Max 3 parallele Toasts — älteste werden verdrängt.
    setToasts((prev) => [...prev, { id, message: m, type: t }].slice(-3));
  };
  const dismissToast = (id) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));
  const chef = cu?.role === "chef";
  const unread = data.benachrichtigungen.filter((n) => !n.gelesen).length;
  const addN = async (typ, text, bid) => {
    try {
      await actions.benachrichtigungen.create({
        typ,
        text,
        baustelleId: bid,
        datum: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Benachrichtigung fehlgeschlagen:", e);
    }
  };
  const trigPhoto = (cb) => {
    setPhotoCb(() => cb);
    fileRef.current?.click();
  };
  // Foto-Pipeline: File → Canvas-Compress (1600px, q=0.7) → {blob, previewDataUrl}.
  // PhotoGrid rendert previewDataUrl sofort. Konsumenten (MngView/SteView)
  // uploaden den blob erst beim Save und ersetzen ihn durch den Storage-Pfad.
  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const blob = await compressImage(f);
      const previewDataUrl = await blobToDataURL(blob);
      if (photoCb) photoCb({ blob, previewDataUrl });
    } catch (err) {
      console.error("[AppContext.onFile]", err);
      show(err?.message || "Foto konnte nicht verarbeitet werden", "error");
    }
  };
  const eName = (e) => {
    if (e.personTyp === "sub") {
      const s = data.subunternehmer.find((x) => x.id === e.subId);
      return s ? s.name : "Sub";
    }
    if (e.personTyp === "sonstige") return e.personName || "Sonstige";
    const u = data.users.find((x) => x.id === e.mitarbeiterId);
    return u?.name || "?";
  };

  // App-Level Error: useAppData fehlgeschlagen → kein endloses Spinning,
  // sondern Hinweis + Retry. window.location.reload() resettet auch
  // Auth-Check und useAppData-State.
  if (dataError && !loading) {
    return (
      <div className="device-wrapper font-sans">
        <div className="device-frame">
          <div className="device-screen">
            <div
              role="alert"
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "#f2f2f7",
                padding: 24,
                textAlign: "center",
              }}
            >
              <AlertCircle size={48} style={{ color: RED, marginBottom: 16 }} />
              <h2
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: "#000",
                  marginBottom: 8,
                }}
              >
                Daten konnten nicht geladen werden
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "#8e8e93",
                  marginBottom: 24,
                  maxWidth: 280,
                }}
              >
                {dataError?.message ||
                  dataError ||
                  "Verbindungsfehler. Bitte prüfe deine Internet-Verbindung."}
              </p>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: "14px 32px",
                  borderRadius: 14,
                  background: BTN,
                  color: "white",
                  fontWeight: 600,
                  fontSize: 15,
                  border: "none",
                  minHeight: 44,
                  cursor: "pointer",
                }}
              >
                Erneut versuchen
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading screen
  if (loading || authChecking)
    return (
      <div className="device-wrapper font-sans">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            height: "100%",
            justifyContent: "center",
          }}
        >
          <div className="device-frame">
            <div className="device-screen">
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#f2f2f7",
                }}
              >
                <div className="text-center">
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: G,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 20,
                    }}
                  >
                    <span
                      style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}
                    >
                      MA
                    </span>
                  </div>
                  <div style={{ marginBottom: 12, color: P }}>
                    <Spinner size={24} color={P} />
                  </div>
                  <p style={{ fontSize: 14, color: "#8e8e93" }}>Laden...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );

  const ctx = {
    data,
    actions,
    cu,
    setCu,
    sessionUser: effectiveSessionUser,
    v,
    nav,
    goBack,
    prevV,
    history,
    setHistory,
    setVRaw,
    sb,
    setSb,
    em,
    setEm,
    sq,
    setSq,
    chef,
    show,
    trigPhoto,
    addN,
    eName,
    unread,
    editUser,
    setEditUser,
    mitSummary,
    setMitSummary,
    fileRef,
    clockTime,
  };

  return (
    <AppContext.Provider value={ctx}>
      <div className="device-wrapper font-sans">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            height: "100%",
            justifyContent: "center",
          }}
        >
          <div className="device-frame">
            <div className="device-statusbar">
              <span className="device-time">
                {clockTime.toLocaleTimeString("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <div className="device-notch" />
              <div className="device-indicators">
                <svg width="17" height="11" viewBox="0 0 17 11" fill="#1a1a1a">
                  <rect y="7.5" width="3" height="3.5" rx=".7" />
                  <rect x="4.5" y="5" width="3" height="6" rx=".7" />
                  <rect x="9" y="2.5" width="3" height="8.5" rx=".7" />
                  <rect x="13.5" width="3" height="11" rx=".7" />
                </svg>
                <svg
                  width="15"
                  height="11"
                  viewBox="0 0 15 11"
                  fill="none"
                  stroke="#1a1a1a"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                >
                  <path d="M.5 3.5a10.5 10.5 0 0114 0" />
                  <path d="M3 6.2a7 7 0 019 0" />
                  <path d="M5.5 8.8a3.5 3.5 0 014 0" />
                  <circle cx="7.5" cy="10.5" r=".01" strokeWidth="2" />
                </svg>
                <svg width="27" height="12" viewBox="0 0 27 12">
                  <rect
                    x=".5"
                    y=".5"
                    width="22"
                    height="11"
                    rx="2.5"
                    stroke="#1a1a1a"
                    strokeWidth="1"
                    fill="none"
                    opacity=".35"
                  />
                  <path
                    d="M24 4v4a1 1 0 001-1V5a1 1 0 00-1-1z"
                    fill="#1a1a1a"
                    opacity=".35"
                  />
                  <rect
                    x="2"
                    y="2"
                    width="19"
                    height="8"
                    rx="1.5"
                    fill="#34c759"
                  />
                </svg>
              </div>
            </div>

            <div className="device-screen">
              <input
                type="file"
                ref={fileRef}
                onChange={onFile}
                accept="image/*"
                capture="environment"
                style={{
                  display: "none",
                  position: "absolute",
                  width: 0,
                  height: 0,
                  overflow: "hidden",
                }}
              />
              {toasts.length > 0 && (
                <div
                  style={{
                    position: "fixed",
                    top: "calc(env(safe-area-inset-top, 0px) + 16px)",
                    left: 0,
                    right: 0,
                    zIndex: 50,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    pointerEvents: "none",
                  }}
                >
                  {toasts.map((t) => (
                    <div
                      key={t.id}
                      style={{ pointerEvents: "auto" }}
                    >
                      <Toast
                        message={t.message}
                        type={t.type}
                        onDone={() => dismissToast(t.id)}
                      />
                    </div>
                  ))}
                </div>
              )}
              {children}
            </div>

            <div className="device-home-bar">
              <div className="device-home-pill" />
            </div>
          </div>
          <span className="device-label">MA Construction</span>
        </div>
      </div>
    </AppContext.Provider>
  );
}
