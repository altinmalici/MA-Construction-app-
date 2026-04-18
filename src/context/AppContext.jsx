import { createContext, useContext, useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAppData } from "../lib/useAppData.js";
import { G, P } from "../utils/helpers";
import { Toast } from "../components/ui";

const TIMEOUT_MS = 30 * 1000;
const ACTIVITY_EVENTS = ["mousemove", "touchstart", "keydown", "click", "scroll"];

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
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);
  const [photoCb, setPhotoCb] = useState(null);
  const [clockTime, setClockTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setClockTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  // Auth session init: Session bleibt erhalten (für schnelles PIN-Re-Entry),
  // aber UI startet immer im Login-Screen. sessionUser füttert das
  // "Willkommen zurück"-Greeting.
  useEffect(() => {
    let cancelled = false;
    actions.auth.getCurrentUser().then(user => {
      if (cancelled) return;
      if (user) {
        setSessionUser({ name: user.name, username: user.username });
      }
      setAuthChecking(false);
    }).catch(() => {
      if (!cancelled) setAuthChecking(false);
    });
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

  // Idle-Lock: nach TIMEOUT_MS ohne Aktivität zurück zum Login-Screen.
  // Supabase-Session bleibt aktiv (kein signOut) — sessionUser bleibt
  // gesetzt, damit der "Willkommen zurück"-Screen direkt erscheint und
  // PIN-Re-Entry den User auf das Dashboard zurückbringt.
  useEffect(() => {
    if (!cu) return;
    let timer;
    const lock = () => {
      setCu(null);
      setHistory([]);
      setVRaw("login");
    };
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(lock, TIMEOUT_MS);
    };
    ACTIVITY_EVENTS.forEach((ev) =>
      window.addEventListener(ev, reset, { passive: true }),
    );
    reset();
    return () => {
      clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, reset));
    };
  }, [cu]);
  // Seed: Testbaustelle
  const seededRef = useRef(false);
  useEffect(() => {
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
      .then(() => console.log("Testbaustelle angelegt"))
      .catch((e) => console.error("Seed fehlgeschlagen:", e));
  }, [loading, data.baustellen.length]);

  const show = (m, t = "success") => setToast({ message: m, type: t });
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
  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      if (photoCb) photoCb(ev.target.result);
    };
    r.readAsDataURL(f);
    e.target.value = "";
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
                  <Loader2
                    className="mx-auto mb-3 animate-spin"
                    size={24}
                    style={{ color: P }}
                  />
                  <p style={{ fontSize: 14, color: "#8e8e93" }}>Laden...</p>
                  {dataError && (
                    <p
                      style={{ color: "#FF3B30", fontSize: 13, marginTop: 12 }}
                    >
                      {dataError}
                    </p>
                  )}
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
    toast,
    setToast,
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
              {toast && (
                <Toast
                  message={toast.message}
                  type={toast.type}
                  onDone={() => setToast(null)}
                />
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
