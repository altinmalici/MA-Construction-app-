import { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { useAppData } from "../lib/useAppData.js";
import { useRealtime } from "../lib/useRealtime.js";
import { useOfflineSync } from "../lib/useOfflineSync.js";
import { useAutoLock } from "../hooks/useAutoLock.js";
import { BACKGROUND_LOCK_MS, INACTIVITY_LOCK_MS } from "../config.js";
import { G, P, BTN, RED } from "../utils/helpers";
import { Toast, Spinner, Clock, ConfirmModal } from "../components/ui";
import OfflineBanner from "../components/ui/OfflineBanner";
import PendingSyncBadge from "../components/ui/PendingSyncBadge";
import UpdatePrompt from "../components/ui/UpdatePrompt";
import { compressImage, blobToDataURL } from "../utils/image";


// AppContext bewusst NICHT exportiert — Konsumenten gehen über useApp().
// Das hält das Public-API klein und macht React-Refresh happy (Datei
// exportiert nur Komponenten/Hooks).
const AppContext = createContext(null);

// React-Refresh-Plugin meckert über non-Component-Exports neben einer
// Komponente — useApp ist als Hook fest mit dem Provider gepaart, ein
// Auslagern in eine eigene Datei wäre Pseudo-Modularität.
// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function AppProvider({ children }) {
  const { data, loading, error: dataError, actions, mergeIncomingRow } = useAppData();
  const [cu, setCu] = useState(null);

  // 6-02: Realtime-Subscriptions für 3 zeitkritische Tabellen.
  // Nur aktiv wenn cu existiert (kein Subscribe vor Login). Cleanup
  // bei Logout läuft automatisch via useRealtime-useEffect-Return.
  // RLS gilt: Mitarbeiter sehen nur Events für eigene Baustellen.
  const realtimeEnabled = !!cu;
  const onStundenInsert = useCallback(
    (row) => mergeIncomingRow("stundeneintraege", row, "INSERT"),
    [mergeIncomingRow],
  );
  const onStundenUpdate = useCallback(
    (row) => mergeIncomingRow("stundeneintraege", row, "UPDATE"),
    [mergeIncomingRow],
  );
  const onStundenDelete = useCallback(
    (row) => mergeIncomingRow("stundeneintraege", row, "DELETE"),
    [mergeIncomingRow],
  );
  const onMaengelInsert = useCallback(
    (row) => mergeIncomingRow("maengel", row, "INSERT"),
    [mergeIncomingRow],
  );
  const onMaengelUpdate = useCallback(
    (row) => mergeIncomingRow("maengel", row, "UPDATE"),
    [mergeIncomingRow],
  );
  const onMaengelDelete = useCallback(
    (row) => mergeIncomingRow("maengel", row, "DELETE"),
    [mergeIncomingRow],
  );
  const onNotifInsert = useCallback(
    (row) => mergeIncomingRow("benachrichtigungen", row, "INSERT"),
    [mergeIncomingRow],
  );
  const onNotifUpdate = useCallback(
    (row) => mergeIncomingRow("benachrichtigungen", row, "UPDATE"),
    [mergeIncomingRow],
  );
  const onNotifDelete = useCallback(
    (row) => mergeIncomingRow("benachrichtigungen", row, "DELETE"),
    [mergeIncomingRow],
  );
  useRealtime("stundeneintraege", {
    onInsert: onStundenInsert,
    onUpdate: onStundenUpdate,
    onDelete: onStundenDelete,
  }, { enabled: realtimeEnabled });
  useRealtime("maengel", {
    onInsert: onMaengelInsert,
    onUpdate: onMaengelUpdate,
    onDelete: onMaengelDelete,
  }, { enabled: realtimeEnabled });
  useRealtime("benachrichtigungen", {
    onInsert: onNotifInsert,
    onUpdate: onNotifUpdate,
    onDelete: onNotifDelete,
  }, { enabled: realtimeEnabled });

  const [sessionUser, setSessionUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  // true = App ist gesperrt, PIN-Screen liegt über dem aktuellen Screen.
  const [locked, setLocked] = useState(false);
  // Aktueller View + Verlauf in EINEM State: so lassen sich nav/goBack als
  // stabile Funktionen schreiben (kein Zugriff auf v/history aus dem
  // Render nötig) — Voraussetzung dafür, dass der Context-Wert unten
  // memoisiert werden kann.
  const [navState, setNavState] = useState({ v: "login", history: [] });
  const v = navState.v;
  const history = navState.history;
  const prevV = history.length > 0 ? history[history.length - 1] : null;
  const setVRaw = useCallback(
    (nv) => setNavState((s) => ({ ...s, v: typeof nv === "function" ? nv(s.v) : nv })),
    [],
  );
  const setHistory = useCallback(
    (h) =>
      setNavState((s) => ({
        ...s,
        history: typeof h === "function" ? h(s.history) : h,
      })),
    [],
  );
  const nav = useCallback(
    (newView) => setNavState((s) => ({ v: newView, history: [...s.history, s.v] })),
    [],
  );
  const goBack = useCallback(
    () =>
      setNavState((s) =>
        s.history.length > 0
          ? { v: s.history[s.history.length - 1], history: s.history.slice(0, -1) }
          : s,
      ),
    [],
  );
  // Schutz vor versehentlichem Verlassen eines Formulars mit ungespeicherten
  // Eingaben. Ein Formular meldet per setLeaveGuard eine Funktion an, die
  // true liefert, solange es ungespeicherte Eingaben hat. Navigation über
  // die TabBar (und andere Sprünge aus dem Formular heraus) läuft über
  // tryLeave und fragt dann nach.
  const leaveGuardRef = useRef(null);
  const [pendingLeave, setPendingLeave] = useState(null);
  const setLeaveGuard = useCallback((fn) => {
    leaveGuardRef.current = fn;
  }, []);
  const tryLeave = useCallback((action) => {
    let dirty = false;
    try {
      dirty = !!leaveGuardRef.current?.();
    } catch {
      dirty = false;
    }
    if (dirty) setPendingLeave(() => action);
    else action();
  }, []);
  const [sb, setSb] = useState(null);
  const [em, setEm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [mitSummary, setMitSummary] = useState(null);
  const [sq, setSq] = useState("");
  const [toasts, setToasts] = useState([]);
  const fileRef = useRef(null);
  const [photoCb, setPhotoCb] = useState(null);
  const show = useCallback((m, t = "success") => {
    const id = Date.now() + Math.random();
    // Max 3 parallele Toasts — älteste werden verdrängt.
    setToasts((prev) => [...prev, { id, message: m, type: t }].slice(-3));
  }, []);
  // clockTime wurde lokalisiert in <Clock />-Komponente (Audit P-MEDIUM):
  // vorher löste die Minutentick-State-Update einen App-weiten Re-Render
  // aus, weil clockTime im AppContext-Value steckte.

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
          // Nur lokal: ein globales signOut würde bei jedem App-Start auch
          // die Sitzungen desselben Nutzers auf anderen Geräten beenden.
          await actions.auth.signOut({ localOnly: true });
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
        setLocked(false);
        actions.resetData();
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

  // Offline-Warteschlange abarbeiten: nach dem Login, bei "online", bei
  // Rückkehr in den Vordergrund und per Intervall, solange etwas wartet.
  // Früher lief das nur beim App-Start (ohne Sitzung → RLS lehnt ab) und bei
  // "online" — nach einem Neustart blieben Stunden hängen (Audit D-01).
  useOfflineSync({
    userId: cu?.id,
    isChef: cu?.role === "chef",
    sync: actions.stundeneintraege.syncOffline,
    onSynced: (res) => {
      if (res.synced > 0) {
        show(
          `${res.synced} offline erfasste${res.synced === 1 ? "r" : ""} Eintrag${res.synced === 1 ? "" : "e"} synchronisiert`,
        );
      }
      if (res.failed > 0) {
        show(
          res.failed === 1
            ? "1 offline erfasster Eintrag wurde abgelehnt – oben antippen"
            : `${res.failed} offline erfasste Einträge wurden abgelehnt – oben antippen`,
          "error",
        );
      }
    },
  });

  const cuName = cu?.name;
  const cuUsername = cu?.username;
  const effectiveSessionUser = useMemo(
    () => (cuName ? { name: cuName, username: cuUsername } : sessionUser),
    [cuName, cuUsername, sessionUser],
  );
  // Safety: if not logged in, show login
  useEffect(() => {
    if (!authChecking && !cu && v !== "login") {
      // Sicherheitsnetz, kein Render-Kaskaden-Risiko: läuft nur im
      // Ausnahmefall "nicht eingeloggt, aber anderer Screen".
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHistory([]);
      setVRaw("login");
    }
  }, [cu, v, authChecking, setHistory, setVRaw]);

  // Auto-Lock: Hintergrund >= BACKGROUND_LOCK_MS oder Inaktivität. Die Sperre
  // setzt nur `locked` — der aktuelle Screen bleibt gemountet (Formular-
  // Eingaben überleben), darüber liegt der PIN-Screen (siehe App.jsx).
  // Die Supabase-Sitzung bleibt bestehen; entsperrt wird mit dem PIN genau
  // dieses Nutzers.
  useAutoLock({
    enabled: !!cu && !locked,
    onLock: () => setLocked(true),
    backgroundMs: BACKGROUND_LOCK_MS,
    inactivityMs: INACTIVITY_LOCK_MS,
  });

  // Einziger Weg in die App nach erfolgreicher PIN-Prüfung.
  //  - Entsperren durch DENSELBEN Nutzer: Screen und Eingaben bleiben, die
  //    Daten werden still im Hintergrund aufgefrischt.
  //  - Neuer Login / anderer Nutzer: alter Stand wird verworfen, Start auf
  //    dem Dashboard, Daten werden frisch geladen.
  const cuId = cu?.id;
  const completeLogin = useCallback((u) => {
    const unlockSameUser = locked && cuId === u.id;
    setLocked(false);
    setCu(u);
    if (unlockSameUser) {
      actions.loadAll({ silent: true });
      return;
    }
    actions.resetData();
    setHistory([]);
    setSb(null);
    setSq("");
    setEm(false);
    setEditUser(null);
    setMitSummary(null);
    setVRaw("dash");
    actions.loadAll();
  }, [locked, cuId, actions, setHistory, setVRaw]);

  // Seed: Testbaustelle (NUR Dev-Env, um leere Prod-DB nicht zu überraschen)
  // Smoke-Test 2026-04-30: Mitarbeiter triggerten den Seed-INSERT, RLS lehnte
  // ab (42501) und der Console-Error verwirrte den nachfolgenden Lade-Pfad
  // (data.baustellen blieb leer trotz erfolgreichem GET). Seed läuft jetzt
  // nur für Chef — Mitarbeiter haben in einer leeren Dev-DB sowieso nichts zu
  // tun und der Chef seedet selbst beim ersten Login.
  const seededRef = useRef(false);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (loading || seededRef.current || data.baustellen.length > 0) return;
    if (cu?.role !== "chef") return;
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
    // actions.baustellen + data.users absichtlich raus aus deps:
    // Re-Run würde Mehrfach-Seeds triggern; seededRef + DEV-Guard
    // sichern den One-Shot-Effekt auch ohne deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, data.baustellen.length, cu]);

  const dismissToast = (id) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));
  const chef = cu?.role === "chef";
  const unread = data.benachrichtigungen.filter((n) => !n.gelesen).length;
  const addN = useCallback(async (typ, text, bid) => {
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
  }, [actions]);
  const trigPhoto = useCallback((cb) => {
    setPhotoCb(() => cb);
    fileRef.current?.click();
  }, []);
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
  const eName = useCallback((e) => {
    if (e.personTyp === "sub") {
      const s = data.subunternehmer.find((x) => x.id === e.subId);
      return s ? s.name : "Sub";
    }
    if (e.personTyp === "sonstige") return e.personName || "Sonstige";
    const u = data.users.find((x) => x.id === e.mitarbeiterId);
    return u?.name || "?";
  }, [data.subunternehmer, data.users]);

  // Context-Wert memoisieren: Er ändert sich nur, wenn sich etwas ändert,
  // das Screens tatsächlich lesen. Toasts und der Foto-Callback gehören
  // nicht dazu — früher renderte jeder Toast und jede Foto-Auswahl den
  // gesamten aktuellen Screen samt TabBar neu.
  const ctx = useMemo(
    () => ({
      data,
      actions,
      cu,
      setCu,
      locked,
      completeLogin,
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
      setLeaveGuard,
      tryLeave,
    }),
    [
      data, actions, cu, locked, completeLogin, effectiveSessionUser, v, nav,
      goBack, prevV, history, setHistory, setVRaw, sb, em, sq, chef, show,
      trigPhoto, addN, eName, unread, editUser, mitSummary, setLeaveGuard,
      tryLeave,
    ],
  );

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
              <Clock />
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
              <OfflineBanner />
              <UpdatePrompt />
              <PendingSyncBadge
                userId={cu?.id}
                isChef={cu?.role === "chef"}
                baustellen={data.baustellen}
              />
              <input
                type="file"
                ref={fileRef}
                onChange={onFile}
                accept="image/*"
                // Kein capture-Attribut: iOS bietet dann "Foto aufnehmen"
                // UND "Fotomediathek" an (vorher nur die Kamera).
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
              <ConfirmModal
                open={!!pendingLeave}
                title="Änderungen verwerfen?"
                message="Die Eingaben im Formular gehen verloren."
                confirmLabel="Verwerfen"
                cancelLabel="Weiter bearbeiten"
                destructive
                onConfirm={() => {
                  const action = pendingLeave;
                  setPendingLeave(null);
                  leaveGuardRef.current = null;
                  action?.();
                }}
                onCancel={() => setPendingLeave(null)}
              />
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
