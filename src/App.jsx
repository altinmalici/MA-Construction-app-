import React, {
  useState,
  useRef,
  useEffect,
  useContext,
  createContext,
} from "react";
import {
  Clock,
  Building2,
  FileText,
  Users,
  Plus,
  ArrowLeft,
  Camera,
  Check,
  ChevronRight,
  LogOut,
  MapPin,
  Phone,
  User,
  Save,
  Trash2,
  Edit3,
  Download,
  AlertTriangle,
  Search,
  Calendar,
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  Wind,
  Thermometer,
  PenTool,
  Eye,
  UserPlus,
  Briefcase,
  X,
  ChevronLeft,
  Bell,
  Paperclip,
  AlertCircle,
  CheckCircle,
  ClipboardList,
  FileUp,
  Package,
  Printer,
  TrendingUp,
  TrendingDown,
  Receipt,
  BarChart3,
  Filter,
  Home,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import { useAppData } from "./lib/useAppData.js";

// Helpers
const bStd = (b, e, p) => {
  if (!b || !e) return "0.0";
  const [bH, bM] = b.split(":").map(Number);
  const [eH, eM] = e.split(":").map(Number);
  const r = (eH * 60 + eM - bH * 60 - bM - (p || 0)) / 60;
  return r < 0 ? "0.0" : r.toFixed(1);
};
const fDat = (d) =>
  new Date(d).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
const fK = (d) =>
  new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
const fE = (v) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    v,
  );
const escHtml = (s) => {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};
// Design System — iOS Colors
const P = "#7C3AED";
const PL = "#8B5CF6";
const PD = "#6D28D9";
const G = `linear-gradient(135deg, ${PD}, ${P}, ${PL})`;
const BTN = G;
const RED = "#FF3B30";
const GREEN = "#34C759";
const CS = "0 1px 3px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.04)";
const IC = "ios-input";

// Username & PIN helpers
const genUsername = (fullName, existing) => {
  const cv = (s) =>
    s
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/Ä/g, "Ae")
      .replace(/Ö/g, "Oe")
      .replace(/Ü/g, "Ue");
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return cv(fullName.trim()).toLowerCase();
  const fn = cv(parts[0]).toLowerCase();
  const ln = cv(parts[parts.length - 1]).toLowerCase();
  let u = fn[0] + "." + ln;
  if (!existing.includes(u)) return u;
  for (let i = 2; i <= fn.length; i++) {
    u = fn.slice(0, i) + "." + ln;
    if (!existing.includes(u)) return u;
  }
  u = fn + "." + ln;
  let c = 1;
  while (existing.includes(u)) {
    u = fn + "." + ln + c;
    c++;
  }
  return u;
};
const genPin = () => String(Math.floor(1000 + Math.random() * 9000));

const WI = ({ w, style: s }) => {
  const p = { style: s };
  return w === "sonnig" ? (
    <Sun {...p} />
  ) : w === "bewölkt" ? (
    <Cloud {...p} />
  ) : w === "regen" ? (
    <CloudRain {...p} />
  ) : w === "schnee" ? (
    <CloudSnow {...p} />
  ) : w === "wind" ? (
    <Wind {...p} />
  ) : (
    <Sun {...p} />
  );
};

const COLORS = {
  baustellen: "#3c3c43",
  stunden: "#3c3c43",
  kalender: "#3c3c43",
  maengel: RED,
  kosten: "#3c3c43",
  bautagebuch: "#3c3c43",
  dokumente: "#3c3c43",
  handwerker: "#3c3c43",
  subunternehmer: "#3c3c43",
  tagesuebersicht: "#3c3c43",
  regieberichte: "#3c3c43",
  material: "#3c3c43",
  profil: "#3c3c43",
  benachrichtigungen: RED,
};

// Shared UI
const Toast = ({ message, type = "success", onDone }) => {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current(), 1800);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
        padding: "12px 20px",
        borderRadius: 14,
        color: "white",
        fontSize: 15,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: type === "success" ? GREEN : RED,
        backdropFilter: "blur(10px)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
      }}
    >
      {type === "success" ? <Check size={18} /> : <AlertTriangle size={18} />}
      {message}
    </div>
  );
};
const Hdr = ({ title, onBack, right, large }) => {
  if (large)
    return (
      <div
        style={{
          padding: "16px 20px 12px",
          paddingTop: "calc(var(--safe-top) + 16px)",
          background: "#f2f2f7",
        }}
      >
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1 -ml-1 mb-2"
            style={{ color: P }}
          >
            <ChevronLeft size={20} />
            <span style={{ fontSize: 15 }}>Zurück</span>
          </button>
        )}
        <div className="flex items-end justify-between">
          <h1
            style={{
              fontSize: 34,
              fontWeight: 700,
              color: "#000",
              letterSpacing: "-0.5px",
              lineHeight: 1.1,
              flex: 1,
            }}
          >
            {title}
          </h1>
          {right}
        </div>
      </div>
    );
  return (
    <div className="ios-compact-header">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1 -ml-2"
            style={{ color: P }}
          >
            <ChevronLeft size={22} />
            <span style={{ fontSize: 17 }}>Zurück</span>
          </button>
        )}
        <h1
          className="flex-1 truncate text-center"
          style={{ fontSize: 17, fontWeight: 600, color: "#000" }}
        >
          {title}
        </h1>
        {onBack && <div style={{ width: 70 }} />}
        {right}
      </div>
    </div>
  );
};
const Empty = ({ icon: I, text }) => (
  <div style={{ textAlign: "center", padding: "60px 20px" }}>
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: 20,
        background: "rgba(0,0,0,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 16px",
      }}
    >
      <I size={28} style={{ color: "#3c3c43" }} />
    </div>
    <p
      style={{ fontSize: 17, fontWeight: 600, color: "#000", marginBottom: 8 }}
    >
      Keine Einträge
    </p>
    <p style={{ fontSize: 15, color: "#8e8e93" }}>{text}</p>
  </div>
);
const Bdg = ({ text, color = "#3c3c43" }) => (
  <span
    style={{
      background: `${color}15`,
      color,
      padding: "4px 10px",
      borderRadius: 100,
      fontSize: 12,
      fontWeight: 600,
    }}
  >
    {text}
  </span>
);
const PBar = ({ value, small, color }) => (
  <div
    style={{
      width: "100%",
      background: "rgba(0,0,0,0.08)",
      borderRadius: 100,
      overflow: "hidden",
      height: small ? 4 : 6,
    }}
  >
    <div
      style={{
        height: "100%",
        borderRadius: 100,
        background: color || "#8e8e93",
        width: `${value}%`,
        transition: "width 0.3s ease",
      }}
    />
  </div>
);

const ScreenLayout = ({ title, onBack, right, children, large }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: "#f2f2f7",
    }}
  >
    {title && <Hdr title={title} onBack={onBack} right={right} large={large} />}
    <div
      className="app-scroll"
      style={{
        padding: title
          ? "16px 20px 32px"
          : "calc(var(--safe-top) + 16px) 20px 32px",
      }}
    >
      {children}
    </div>
  </div>
);

const PhotoGrid = ({ fotos, onAdd, onRemove }) => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    {fotos.map((f, i) => (
      <div
        key={i}
        style={{
          position: "relative",
          width: 64,
          height: 64,
          borderRadius: 10,
          overflow: "hidden",
          border: "0.5px solid rgba(0,0,0,0.1)",
        }}
      >
        <img
          src={f}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {onRemove && (
          <button
            onClick={() => onRemove(i)}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              background: RED,
              color: "white",
              borderRadius: "0 0 0 8px",
              padding: 2,
              border: "none",
            }}
          >
            <X size={10} />
          </button>
        )}
      </div>
    ))}
    {onAdd && (
      <button
        onClick={onAdd}
        style={{
          width: 64,
          height: 64,
          borderRadius: 10,
          border: "2px dashed rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          color: "#8e8e93",
          background: "none",
        }}
      >
        <Camera size={16} />
        <span style={{ fontSize: 12 }}>Foto</span>
      </button>
    )}
  </div>
);

const SigPad = ({ onSave, onClear, sig }) => {
  const ref = useRef(null);
  const [dr, setDr] = useState(false);
  const [hd, setHd] = useState(!!sig);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const x = c.getContext("2d");
    c.width = c.offsetWidth * 2;
    c.height = c.offsetHeight * 2;
    x.scale(2, 2);
    x.strokeStyle = "#374151";
    x.lineWidth = 2;
    x.lineCap = "round";
    if (sig) {
      const img = new window.Image();
      img.onload = () => x.drawImage(img, 0, 0, c.offsetWidth, c.offsetHeight);
      img.src = sig;
    }
  }, []);
  const gp = (e) => {
    const r = ref.current.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  };
  const sd = (e) => {
    e.preventDefault();
    const x = ref.current.getContext("2d");
    const p = gp(e);
    x.beginPath();
    x.moveTo(p.x, p.y);
    setDr(true);
    setHd(true);
  };
  const mv = (e) => {
    if (!dr) return;
    e.preventDefault();
    const x = ref.current.getContext("2d");
    const p = gp(e);
    x.lineTo(p.x, p.y);
    x.stroke();
  };
  const ed = () => {
    setDr(false);
    if (hd && onSave) onSave(ref.current.toDataURL());
  };
  const cl = () => {
    const c = ref.current;
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
    setHd(false);
    if (onClear) onClear();
  };
  return (
    <div>
      <div
        style={{
          position: "relative",
          border: `2px dashed ${hd ? P : "#d1d5db"}`,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <canvas
          ref={ref}
          style={{
            width: "100%",
            height: 80,
            touchAction: "none",
            background: "white",
            cursor: "crosshair",
            display: "block",
          }}
          onMouseDown={sd}
          onMouseMove={mv}
          onMouseUp={ed}
          onMouseLeave={ed}
          onTouchStart={sd}
          onTouchMove={mv}
          onTouchEnd={ed}
        />
        {!hd && !sig && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              color: "#8e8e93",
            }}
          >
            <PenTool size={16} />
            <span style={{ fontSize: 13, marginLeft: 8 }}>Unterschreiben</span>
          </div>
        )}
      </div>
      {(hd || sig) && (
        <button
          onClick={cl}
          style={{
            marginTop: 4,
            fontSize: 13,
            color: "#8e8e93",
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "none",
            border: "none",
          }}
        >
          <Trash2 size={10} />
          Löschen
        </button>
      )}
    </div>
  );
};

const AppContext = createContext(null);

// ==================== LOGIN ====================
const Login = () => {
  const { actions, setCu, nav } = useContext(AppContext);
  const [mode, setMode] = useState("C"); // A=first time, B=set PIN, C=returning
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [checking, setChecking] = useState(false);
  const [un, setUn] = useState("");
  const [obPin, setObPin] = useState("");
  const [obUser, setObUser] = useState(null);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinStep, setPinStep] = useState(1);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [permLocked, setPermLocked] = useState(false);
  const [lockSec, setLockSec] = useState(0);
  const [lastUser, setLastUser] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("ma_construction_last_user") || "null",
      );
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!lockedUntil) {
      setLockSec(0);
      return;
    }
    const tick = () => {
      const r = Math.ceil((new Date(lockedUntil) - new Date()) / 1000);
      if (r <= 0) {
        setLockedUntil(null);
        setLockSec(0);
        setErr("");
      } else setLockSec(r);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [lockedUntil]);
  const isLocked =
    permLocked || (lockedUntil && new Date() < new Date(lockedUntil));
  const wrongAttempt = () => {
    const na = attempts + 1;
    setAttempts(na);
    if (na >= 10) {
      setPermLocked(true);
      setErr("Gesperrt. Kontaktiere den Bauleiter.");
    } else if (na >= 3 && na % 3 === 0) {
      setLockedUntil(new Date(Date.now() + 30000).toISOString());
      setErr(`Gesperrt (30s)`);
    } else setErr("Falscher PIN");
  };

  const goPin = async (p) => {
    const code = p || pin;
    if (code.length !== 4 || checking || isLocked) return;
    setChecking(true);
    try {
      const u = await actions.auth.login(code);
      if (u) {
        if (u.isOnboarded === false) {
          setObUser(u);
          setMode("B");
          setErr("");
          setAttempts(0);
        } else {
          setCu(u);
          nav("dash");
        }
      } else {
        wrongAttempt();
        setPin("");
      }
    } catch (e) {
      setErr("Verbindungsfehler");
      setPin("");
    } finally {
      setChecking(false);
    }
  };
  const goOnboard = async () => {
    if (!un.trim() || obPin.length !== 4 || checking || isLocked) return;
    setChecking(true);
    try {
      const u = await actions.auth.loginWithUsername(
        un.trim().toLowerCase(),
        obPin,
      );
      if (u) {
        setObUser(u);
        setMode("B");
        setErr("");
        setAttempts(0);
      } else {
        wrongAttempt();
        setObPin("");
      }
    } catch (e) {
      setErr("Verbindungsfehler");
    } finally {
      setChecking(false);
    }
  };
  const goSetPin = async (cp) => {
    const confirm = cp || confirmPin;
    if (newPin !== confirm) {
      setErr("PINs stimmen nicht überein");
      setConfirmPin("");
      setNewPin("");
      setPinStep(1);
      return;
    }
    setChecking(true);
    try {
      const taken = await actions.users.checkPinExists(newPin);
      if (taken) {
        setErr("PIN bereits vergeben");
        setConfirmPin("");
        setNewPin("");
        setPinStep(1);
        setChecking(false);
        return;
      }
      await actions.auth.completeOnboarding(obUser.id, newPin);
      const u = await actions.auth.login(newPin);
      if (u) {
        setCu(u);
        nav("dash");
      }
    } catch (e) {
      setErr("Fehler");
      setConfirmPin("");
      setNewPin("");
      setPinStep(1);
    } finally {
      setChecking(false);
    }
  };

  const tap = (n) => {
    if (isLocked || n === "") return;
    if (mode === "C") {
      if (n === "del") {
        setPin((p) => p.slice(0, -1));
        setErr("");
      } else if (pin.length < 4) {
        const np = pin + n;
        setPin(np);
        setErr("");
        if (np.length === 4) setTimeout(() => goPin(np), 150);
      }
    } else if (mode === "B") {
      if (pinStep === 1) {
        if (n === "del") {
          setNewPin((p) => p.slice(0, -1));
          setErr("");
        } else if (newPin.length < 4) {
          const np = newPin + n;
          setNewPin(np);
          setErr("");
          if (np.length === 4) setTimeout(() => setPinStep(2), 300);
        }
      } else {
        if (n === "del") {
          setConfirmPin((p) => p.slice(0, -1));
          setErr("");
        } else if (confirmPin.length < 4) {
          const np = confirmPin + n;
          setConfirmPin(np);
          setErr("");
          if (np.length === 4) setTimeout(() => goSetPin(np), 150);
        }
      }
    }
  };

  const Numpad = ({ disabled: d }) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 10,
      }}
    >
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "del"].map((n, i) => (
        <button
          key={i}
          onClick={() => tap(n)}
          disabled={n === "" || checking || d}
          style={{
            height: 80,
            fontSize: n === "del" ? 24 : 32,
            borderRadius: 16,
            fontWeight: 600,
            border: "none",
            cursor: n === "" ? "default" : "pointer",
            background:
              n === "" ? "transparent" : n === "del" ? "transparent" : "white",
            color: n === "del" ? "#8e8e93" : "#000",
            boxShadow:
              n !== "" && n !== "del"
                ? "0 1px 2px rgba(0,0,0,0.06)"
                : undefined,
          }}
        >
          {n === "del" ? "←" : n}
        </button>
      ))}
    </div>
  );
  const Dots = ({ value }) => (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: 18,
        marginBottom: 12,
      }}
    >
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            width: 15,
            height: 15,
            borderRadius: "50%",
            transition: "all 0.2s",
            backgroundColor: value.length > i ? P : "#d1d5db",
          }}
        />
      ))}
    </div>
  );
  const ErrLine = () => (
    <div style={{ height: 24, textAlign: "center" }}>
      {isLocked && !permLocked ? (
        <p style={{ fontSize: 14, color: RED, fontWeight: 600 }}>
          Gesperrt ({lockSec}s)
        </p>
      ) : permLocked ? (
        <p style={{ fontSize: 14, color: RED, fontWeight: 600 }}>{err}</p>
      ) : err ? (
        <p style={{ fontSize: 14, color: RED, fontWeight: 600 }}>{err}</p>
      ) : checking ? (
        <p style={{ color: P, fontSize: 14, fontWeight: 600 }}>Prüfe...</p>
      ) : null}
    </div>
  );

  // ── STATE A: First time ──
  if (mode === "A")
    return (
      <ScreenLayout>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100%",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 24,
                width: 76,
                height: 76,
                background: G,
                marginBottom: 14,
              }}
            >
              <span style={{ color: "white", fontSize: 30, fontWeight: 700 }}>
                MA
              </span>
            </div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: "#000",
                marginBottom: 4,
              }}
            >
              Erster Zugang
            </h1>
            <p style={{ fontSize: 15, color: "#8e8e93" }}>
              Gib deine Zugangsdaten ein
            </p>
          </div>
          <div style={{ width: "100%", maxWidth: 300 }}>
            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#8e8e93",
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Benutzername
              </label>
              <input
                value={un}
                onChange={(e) => setUn(e.target.value)}
                placeholder="z.B. m.mueller"
                className={IC}
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#8e8e93",
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Einladungs-PIN
              </label>
              <input
                maxLength={4}
                value={obPin}
                onChange={(e) => setObPin(e.target.value.replace(/\D/g, ""))}
                placeholder="4-stelliger PIN"
                className={IC}
                inputMode="numeric"
              />
            </div>
            <ErrLine />
            <button
              onClick={goOnboard}
              disabled={
                !un.trim() || obPin.length !== 4 || checking || isLocked
              }
              style={{
                width: "100%",
                padding: "16px 24px",
                borderRadius: 14,
                color: "white",
                fontWeight: 600,
                fontSize: 17,
                background: BTN,
                border: "none",
                boxShadow: "0 2px 8px rgba(124,58,237,0.35)",
                opacity:
                  !un.trim() || obPin.length !== 4 || checking || isLocked
                    ? 0.5
                    : 1,
              }}
            >
              {checking ? "Prüfe..." : "Weiter"}
            </button>
          </div>
          <button
            onClick={() => {
              setMode("C");
              setErr("");
              setAttempts(0);
              setPermLocked(false);
              setLockedUntil(null);
            }}
            style={{
              marginTop: 24,
              fontSize: 15,
              color: P,
              background: "none",
              border: "none",
            }}
          >
            Bereits registriert?
          </button>
        </div>
      </ScreenLayout>
    );

  // ── STATE B: Set PIN ──
  if (mode === "B") {
    const cp = pinStep === 1 ? newPin : confirmPin;
    return (
      <ScreenLayout>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100%",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 32 }}>
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
            <h1
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: "#000",
                marginBottom: 4,
              }}
            >
              {pinStep === 1 ? "PIN erstellen" : "PIN bestätigen"}
            </h1>
            <p style={{ fontSize: 15, color: "#8e8e93" }}>
              {pinStep === 1
                ? `Hallo ${obUser?.name?.split(" ")[0]}! Wähle deinen persönlichen PIN.`
                : "Gib den PIN zur Bestätigung erneut ein."}
            </p>
          </div>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <Dots value={cp} />
            <ErrLine />
          </div>
          <div style={{ width: "100%" }}>
            <Numpad />
          </div>
        </div>
      </ScreenLayout>
    );
  }

  // ── STATE C: Returning user / PIN pad ──
  return (
    <ScreenLayout>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100%",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          {lastUser ? (
            <>
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 38,
                  background: G,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 14px",
                }}
              >
                <span style={{ color: "white", fontSize: 24, fontWeight: 700 }}>
                  {lastUser.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()}
                </span>
              </div>
              <p style={{ fontSize: 15, color: "#8e8e93", marginBottom: 4 }}>
                Willkommen zurück
              </p>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: "#000" }}>
                {lastUser.name}
              </h1>
            </>
          ) : (
            <>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 24,
                  width: 76,
                  height: 76,
                  background: G,
                  marginBottom: 14,
                }}
              >
                <span style={{ color: "white", fontSize: 30, fontWeight: 700 }}>
                  MA
                </span>
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: "#000" }}>
                MA Construction
              </h1>
            </>
          )}
        </div>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Dots value={pin} />
          <ErrLine />
        </div>
        <div style={{ width: "100%" }}>
          <Numpad disabled={isLocked} />
        </div>
        <div
          style={{
            marginTop: 24,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <button
            onClick={() => {
              setMode("A");
              setErr("");
              setAttempts(0);
              setPermLocked(false);
              setLockedUntil(null);
            }}
            style={{
              fontSize: 15,
              color: P,
              background: "none",
              border: "none",
            }}
          >
            Erster Zugang?
          </button>
          {lastUser && (
            <button
              onClick={() => {
                localStorage.removeItem("ma_construction_last_user");
                setLastUser(null);
                setPin("");
                setErr("");
              }}
              style={{
                fontSize: 13,
                color: "#8e8e93",
                background: "none",
                border: "none",
              }}
            >
              Nicht {lastUser.name.split(" ")[0]}?
            </button>
          )}
        </div>
      </div>
    </ScreenLayout>
  );
};

// ==================== DASHBOARD ====================
const Dash = () => {
  const { data, cu, chef, nav, unread, setSb, setEm } = useContext(AppContext);
  const mb = chef
    ? data.baustellen
    : data.baustellen.filter((b) => b.mitarbeiter.includes(cu.id));
  const todayStr = new Date().toISOString().split("T")[0];
  const todayEntries = data.stundeneintraege.filter(
    (e) => e.datum === todayStr,
  );
  const openMaengel = data.maengel.filter(
    (m) => m.status !== "erledigt",
  ).length;
  const todayTermine = data.kalender.filter((t) => t.datum === todayStr).length;
  const vorname = cu.name.split(" ")[0];
  const initials = cu.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const aktiveBst = mb.filter((b) => b.status === "aktiv").length;
  const heuteErfasst = chef
    ? todayEntries.length
    : todayEntries.filter((e) => e.mitarbeiterId === cu.id).length;

  const widgetItems = chef
    ? [
        {
          k: "bst",
          i: Building2,
          c: COLORS.baustellen,
          l: "Baustellen",
          s: `${aktiveBst} aktiv`,
          n: mb.length,
        },
        {
          k: "ste",
          i: Clock,
          c: COLORS.stunden,
          l: "Stunden",
          s: "Zeiten erfassen",
          n: todayEntries.length,
        },
        {
          k: "kal",
          i: Calendar,
          c: COLORS.kalender,
          l: "Kalender",
          s: "Termine & Planung",
          n: todayTermine,
        },
        {
          k: "mng",
          i: AlertCircle,
          c: COLORS.maengel,
          l: "Mängel",
          s: `${openMaengel} offen`,
          n: openMaengel,
        },
        {
          k: "kos",
          i: Receipt,
          c: COLORS.kosten,
          l: "Kosten",
          s: "Budget & Abrechnung",
          n: null,
        },
        {
          k: "btb",
          i: ClipboardList,
          c: COLORS.bautagebuch,
          l: "Bautagebuch",
          s: "Tagesberichte",
          n: data.bautagebuch.length,
        },
      ]
    : [
        {
          k: "bst",
          i: Building2,
          c: COLORS.baustellen,
          l: "Baustellen",
          s: `${mb.length} zugewiesen`,
          n: mb.length,
        },
        {
          k: "ste",
          i: Clock,
          c: COLORS.stunden,
          l: "Stunden",
          s: "Zeiten erfassen",
          n: todayEntries.filter((e) => e.mitarbeiterId === cu.id).length,
        },
        {
          k: "mst",
          i: FileText,
          c: "#3c3c43",
          l: "Meine Stunden",
          s: `${data.stundeneintraege.filter((e) => e.mitarbeiterId === cu.id).length} Einträge`,
          n: null,
        },
        {
          k: "mng",
          i: AlertCircle,
          c: COLORS.maengel,
          l: "Mängel melden",
          s: "Problem melden",
          n: null,
        },
        {
          k: "kal",
          i: Calendar,
          c: COLORS.kalender,
          l: "Kalender",
          s: "Termine",
          n: todayTermine,
        },
      ];

  return (
    <ScreenLayout>
      {/* ── Greeting header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontSize: 34,
              fontWeight: 700,
              color: "#000",
              letterSpacing: "-0.5px",
              lineHeight: 1.1,
            }}
          >
            Hallo, {vorname}
          </p>
          <p style={{ fontSize: 15, color: "#8e8e93", marginTop: 4 }}>
            {new Date().toLocaleDateString("de-DE", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            })}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {chef && (
            <button
              onClick={() => nav("notif")}
              style={{
                position: "relative",
                width: 40,
                height: 40,
                borderRadius: 20,
                background: "rgba(0,0,0,0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                cursor: "pointer",
              }}
            >
              <Bell size={20} style={{ color: "#3c3c43" }} />
              {unread > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -2,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    background: RED,
                    color: "white",
                    fontSize: 11,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 4px",
                  }}
                >
                  {unread}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => nav("profil")}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              background: G,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              cursor: "pointer",
            }}
          >
            <span style={{ color: "white", fontSize: 14, fontWeight: 700 }}>
              {initials}
            </span>
          </button>
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 20,
          overflowX: "auto",
          paddingBottom: 2,
        }}
      >
        <button
          onClick={() => nav("ste")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            borderRadius: 100,
            background: "white",
            boxShadow:
              "0 1px 3px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.04)",
            color: "#000",
            fontSize: 14,
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <Clock size={16} />
          Stunden
        </button>
        {chef && (
          <button
            onClick={() => {
              setSb(null);
              setEm(false);
              nav("bsf");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: 100,
              background: "white",
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.04)",
              color: "#000",
              fontSize: 14,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <Plus size={16} />
            Baustelle
          </button>
        )}
        {!chef && (
          <button
            onClick={() => nav("mng")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: 100,
              background: "white",
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.04)",
              color: "#000",
              fontSize: 14,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <AlertCircle size={16} />
            Mangel melden
          </button>
        )}
      </div>

      {/* ── Section: Übersicht ── */}
      <p
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#8e8e93",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          paddingBottom: 8,
        }}
      >
        Übersicht
      </p>

      {/* KPI stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 14,
            boxShadow: CS,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#000",
              lineHeight: 1,
            }}
          >
            {aktiveBst}
          </p>
          <p style={{ fontSize: 12, color: "#8e8e93", marginTop: 4 }}>Aktiv</p>
        </div>
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 14,
            boxShadow: CS,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#000",
              lineHeight: 1,
            }}
          >
            {heuteErfasst}
          </p>
          <p style={{ fontSize: 12, color: "#8e8e93", marginTop: 4 }}>
            Erfasst
          </p>
        </div>
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 14,
            boxShadow: CS,
            textAlign: "center",
            ...(chef && openMaengel > 0
              ? { border: "0.5px solid rgba(255,59,48,0.25)" }
              : {}),
          }}
        >
          <p
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: chef && openMaengel > 0 ? RED : "#000",
              lineHeight: 1,
            }}
          >
            {chef ? openMaengel : todayTermine}
          </p>
          <p
            style={{
              fontSize: 12,
              color: chef && openMaengel > 0 ? RED : "#8e8e93",
              marginTop: 4,
            }}
          >
            {chef ? "Mängel" : "Termine"}
          </p>
        </div>
      </div>

      {/* ── Section: Module ── */}
      <p
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#8e8e93",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          paddingBottom: 8,
          marginTop: 24,
        }}
      >
        Module
      </p>

      {/* Widget grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 8,
        }}
      >
        {widgetItems.map(({ k, i: I, c, l, s, n }) => (
          <button
            key={k}
            onClick={() => nav(k)}
            style={{
              background: "white",
              borderRadius: 12,
              padding: 14,
              boxShadow: CS,
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              transition: "transform 0.15s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "rgba(0,0,0,0.09)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <I size={20} style={{ color: c }} />
              </div>
              {n !== null && n !== undefined && (
                <span
                  style={{
                    fontSize: n === 0 ? 16 : 20,
                    fontWeight: n === 0 ? 600 : 700,
                    color: n === 0 ? "#c7c7cc" : k === "mng" ? RED : "#000",
                    lineHeight: 1,
                  }}
                >
                  {n}
                </span>
              )}
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#000" }}>{l}</p>
            <p
              style={{
                fontSize: 13,
                color: k === "mng" && n > 0 ? RED : "#8e8e93",
                marginTop: 2,
              }}
            >
              {s}
            </p>
          </button>
        ))}
      </div>
    </ScreenLayout>
  );
};

// ==================== BAUSTELLEN LISTE ====================
const BstList = () => {
  const { data, cu, chef, sq, setSq, nav, setSb, setEm, prevV, goBack } =
    useContext(AppContext);
  const [fl, setFl] = useState("alle");
  let ls = chef
    ? data.baustellen
    : data.baustellen.filter((b) => b.mitarbeiter.includes(cu.id));
  if (sq)
    ls = ls.filter((b) =>
      (b.kunde + b.adresse).toLowerCase().includes(sq.toLowerCase()),
    );
  if (fl !== "alle") ls = ls.filter((b) => b.status === fl);
  const sc = {
    geplant: P,
    aktiv: GREEN,
    fertig: "#8e8e93",
    abgerechnet: "#8e8e93",
  };
  return (
    <ScreenLayout
      large
      title="Baustellen"
      onBack={prevV ? goBack : undefined}
      right={
        chef && (
          <button
            onClick={() => {
              setSb(null);
              setEm(false);
              nav("bsf");
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: BTN,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
            }}
          >
            <Plus size={18} style={{ color: "white" }} />
          </button>
        )
      }
    >
      <div style={{ marginBottom: 8 }}>
        <div style={{ position: "relative" }}>
          <Search
            style={{
              position: "absolute",
              top: "50%",
              transform: "translateY(-50%)",
              left: 12,
              color: "#8e8e93",
            }}
            size={16}
          />
          <input
            value={sq}
            onChange={(e) => setSq(e.target.value)}
            placeholder="Suchen..."
            style={{
              width: "100%",
              padding: "10px 16px 10px 38px",
              borderRadius: 12,
              fontSize: 15,
              background: "rgba(118,118,128,0.12)",
              border: "none",
              color: "#000",
              outline: "none",
            }}
          />
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          marginBottom: 12,
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {["alle", "geplant", "aktiv", "fertig", "abgerechnet"].map((s) => (
          <button
            key={s}
            onClick={() => setFl(s)}
            style={{
              padding: "8px 16px",
              borderRadius: 100,
              fontSize: 13,
              fontWeight: 500,
              whiteSpace: "nowrap",
              border: "none",
              cursor: "pointer",
              ...(fl === s
                ? { background: P, color: "white", boxShadow: "none" }
                : {
                    background: "white",
                    color: "#3c3c43",
                    boxShadow:
                      "0 1px 3px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.04)",
                  }),
            }}
          >
            {s === "alle" ? "Alle" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {ls.length === 0 ? (
          <Empty
            icon={Building2}
            text="Tippe auf + um eine Baustelle anzulegen"
          />
        ) : (
          ls.map((b) => (
            <button
              key={b.id}
              onClick={() => {
                setSb(b);
                nav("bsd");
              }}
              className="w-full text-left"
              style={{
                padding: "16px",
                borderRadius: 12,
                background: "white",
                boxShadow: CS,
                border: "none",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <div
                className="flex items-start justify-between"
                style={{ marginBottom: 6 }}
              >
                <p style={{ fontSize: 15, fontWeight: 600, color: "#000" }}>
                  {b.kunde}
                </p>
                <Bdg text={b.status} color={sc[b.status]} />
              </div>
              <div
                className="flex items-center gap-1"
                style={{ color: "#8e8e93", fontSize: 13, marginBottom: 8 }}
              >
                <MapPin size={11} />
                {b.adresse}
              </div>
              <div className="flex items-center gap-2">
                <PBar value={b.fortschritt || 0} small />
                <span style={{ fontSize: 13, color: "#8e8e93", width: 32 }}>
                  {b.fortschritt || 0}%
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </ScreenLayout>
  );
};

// ==================== BAUSTELLE DETAIL ====================
const BstDet = () => {
  const { sb, data, chef, goBack, actions, show, nav, setEm, eName } =
    useContext(AppContext);
  const b = sb;
  if (!b) return null;
  const fr = data.baustellen.find((x) => x.id === b.id) || b;
  const ei = data.stundeneintraege.filter((e) => e.baustelleId === b.id);
  const mg = data.maengel.filter((m) => m.baustelleId === b.id);
  const del = async () => {
    if (confirm("Löschen?")) {
      try {
        await actions.baustellen.remove(b.id);
        show("Gelöscht");
        nav("bst");
      } catch (e) {
        show("Fehler beim Löschen", "error");
      }
    }
  };
  return (
    <ScreenLayout>
      {/* Nav-Bar */}
      <div
        style={{
          paddingBottom: 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          onClick={goBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            color: P,
            background: "none",
            border: "none",
          }}
        >
          <ChevronLeft size={20} />
          <span style={{ fontSize: 17 }}>Zurück</span>
        </button>
        {chef && (
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => {
                setEm(true);
                nav("bsf");
              }}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "rgba(0,0,0,0.05)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Edit3 size={18} style={{ color: "#3c3c43" }} />
            </button>
            <button
              onClick={del}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "rgba(0,0,0,0.05)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Trash2 size={18} style={{ color: "#3c3c43" }} />
            </button>
          </div>
        )}
      </div>
      {/* Titel + restlicher Inhalt */}
      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: "#000",
          letterSpacing: "-0.5px",
          marginBottom: 16,
        }}
      >
        {fr.kunde}
      </h1>
      {/* Fortschritt */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          boxShadow: CS,
        }}
      >
        <div
          className="flex justify-between items-center"
          style={{ marginBottom: 8 }}
        >
          <span style={{ fontSize: 13, color: "#8e8e93" }}>Baufortschritt</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#000" }}>
            {fr.fortschritt || 0}%
          </span>
        </div>
        <PBar value={fr.fortschritt || 0} />
        {chef && (
          <input
            type="range"
            min="0"
            max="100"
            value={fr.fortschritt || 0}
            onChange={async (e) => {
              const val = Number(e.target.value);
              try {
                await actions.baustellen.update(b.id, { fortschritt: val });
              } catch (err) {
                show("Fehler", "error");
              }
            }}
            style={{
              width: "100%",
              marginTop: 8,
              accentColor: "#7C3AED",
            }}
          />
        )}
      </div>
      {/* Info */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 16,
            boxShadow: CS,
          }}
        >
          <p style={{ fontSize: 13, color: "#8e8e93", marginBottom: 6 }}>
            Kontakt
          </p>
          <p style={{ fontSize: 13, color: "#3c3c43" }}>
            {fr.ansprechpartner || "-"}
          </p>
          <p style={{ fontSize: 13, color: "#3c3c43", marginTop: 2 }}>
            {fr.telefon || "-"}
          </p>
        </div>
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 16,
            boxShadow: CS,
          }}
        >
          <p style={{ fontSize: 13, color: "#8e8e93", marginBottom: 6 }}>
            Zugang
          </p>
          <p style={{ fontSize: 13, color: "#3c3c43" }}>{fr.zugang || "-"}</p>
        </div>
      </div>
      {/* Quick Actions */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 8,
          boxShadow: CS,
          marginBottom: 16,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
        }}
      >
        {[
          { i: Clock, l: "Stunden", a: () => nav("ste"), cl: "#3c3c43" },
          {
            i: AlertCircle,
            l: "Mängel",
            a: () => nav("mng"),
            c: mg.filter((m) => m.status !== "erledigt").length,
            cl: "#3c3c43",
          },
          { i: Paperclip, l: "Doku", a: () => nav("dok"), cl: "#3c3c43" },
          {
            i: ClipboardList,
            l: "Tagebuch",
            a: () => nav("btb"),
            cl: "#3c3c43",
          },
        ].map(({ i: I, l, a, c, cl }) => (
          <button
            key={l}
            onClick={a}
            style={{
              padding: 12,
              borderRadius: 12,
              background: "transparent",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              border: "none",
              position: "relative",
            }}
          >
            <I size={16} style={{ color: cl }} />
            <span style={{ fontSize: 12, color: "#8e8e93" }}>{l}</span>
            {c > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  background: RED,
                  color: "white",
                  fontSize: 11,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 600,
                }}
              >
                {c}
              </span>
            )}
          </button>
        ))}
      </div>
      {/* Details */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          boxShadow: CS,
        }}
      >
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#8e8e93",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 8,
          }}
        >
          Details
        </p>
        <div className="space-y-1" style={{ fontSize: 13 }}>
          {[
            ["Räume", fr.details?.raeume],
            ["Fläche", fr.details?.flaeche],
            [
              "Zeitraum",
              `${fr.startdatum ? fK(fr.startdatum) : "?"} – ${fr.enddatum ? fK(fr.enddatum) : "?"}`,
            ],
          ].map(([l, vl]) => (
            <div key={l} className="flex justify-between">
              <span style={{ color: "#8e8e93" }}>{l}</span>
              <span style={{ color: "#000" }}>{vl || "-"}</span>
            </div>
          ))}
          <div
            style={{
              paddingTop: 6,
              marginTop: 6,
              borderTop: "0.5px solid rgba(0,0,0,0.08)",
              color: "#8e8e93",
            }}
          >
            Arbeiten:{" "}
            <span style={{ color: "#000" }}>{fr.details?.arbeiten || "-"}</span>
          </div>
        </div>
      </div>
      {/* Team */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          boxShadow: CS,
        }}
      >
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#8e8e93",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 8,
          }}
        >
          Team
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {(fr.mitarbeiter || []).map((id) => {
            const u = data.users.find((x) => x.id === id);
            return u ? <Bdg key={id} text={u.name} /> : null;
          })}
          {(fr.subunternehmer || []).map((id) => {
            const s = data.subunternehmer.find((x) => x.id === id);
            return s ? <Bdg key={id} text={s.name} /> : null;
          })}
        </div>
      </div>
      {/* Rechnungsdaten (nur Chef) */}
      {chef && (
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            boxShadow: CS,
          }}
        >
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#8e8e93",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 8,
            }}
          >
            Rechnungsdaten
          </p>
          <div className="space-y-2">
            {[
              ["Firma", fr.details?.rechnungFirma],
              ["Adresse", fr.details?.rechnungAdresse],
              ["E-Mail", fr.details?.rechnungEmail],
              ["UID / Steuernr.", fr.details?.rechnungUid],
            ].map(([l, vl]) => (
              <div key={l}>
                <p
                  style={{
                    fontSize: 13,
                    color: "#8e8e93",
                    marginBottom: 2,
                  }}
                >
                  {l}
                </p>
                <p style={{ fontSize: 13, color: "#000" }}>{vl || "–"}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Einträge */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          boxShadow: CS,
        }}
      >
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#8e8e93",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 8,
          }}
        >
          Einträge ({ei.length})
        </p>
        {ei.length === 0 ? (
          <p style={{ fontSize: 13, color: "#8e8e93" }}>Keine</p>
        ) : (
          ei
            .slice(-3)
            .reverse()
            .map((e) => (
              <div
                key={e.id}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "white",
                  boxShadow: CS,
                  marginBottom: 6,
                  fontSize: 13,
                }}
              >
                <div className="flex justify-between">
                  <span style={{ color: "#000" }}>
                    {eName(e)}
                    {e.personTyp === "sub" && (
                      <span style={{ color: "#8e8e93", marginLeft: 4 }}>
                        (Sub)
                      </span>
                    )}
                    {e.personTyp === "sonstige" && (
                      <span style={{ color: "#8e8e93", marginLeft: 4 }}>
                        (Sonstige)
                      </span>
                    )}
                  </span>
                  <span style={{ color: "#8e8e93" }}>{fK(e.datum)}</span>
                </div>
                <p style={{ color: "#8e8e93", marginTop: 2 }}>{e.arbeit}</p>
                <p style={{ color: "#000", fontWeight: 600, marginTop: 2 }}>
                  {bStd(e.beginn, e.ende, e.pause)}h
                </p>
              </div>
            ))
        )}
      </div>
      <button
        onClick={() => nav("ste")}
        style={{
          width: "100%",
          padding: "16px 24px",
          borderRadius: 14,
          color: "white",
          fontWeight: 600,
          fontSize: 17,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          background: BTN,
          boxShadow: "0 2px 8px rgba(124,58,237,0.35)",
          border: "none",
        }}
      >
        <Clock size={20} />
        Stunden eintragen
      </button>
    </ScreenLayout>
  );
};

// ==================== BAUSTELLE FORM ====================
const BstForm = () => {
  const { em, sb, data, actions, show, chef, nav, setSb, setEm, goBack } =
    useContext(AppContext);
  const ex = em && sb ? data.baustellen.find((b) => b.id === sb.id) : null;
  const [f, sF] = useState({
    kunde: ex?.kunde || "",
    adresse: ex?.adresse || "",
    status: ex?.status || "geplant",
    fortschritt: ex?.fortschritt || 0,
    ansprechpartner: ex?.ansprechpartner || "",
    telefon: ex?.telefon || "",
    zugang: ex?.zugang || "",
    startdatum: ex?.startdatum || "",
    enddatum: ex?.enddatum || "",
    raeume: ex?.details?.raeume || "",
    flaeche: ex?.details?.flaeche || "",
    arbeiten: ex?.details?.arbeiten || "",
    bauleiter: ex?.details?.bauleiter || "",
    budget: ex?.budget || "",
    mitarbeiter: ex?.mitarbeiter || [],
    subunternehmer: ex?.subunternehmer || [],
    rechnungFirma: ex?.details?.rechnungFirma || "",
    rechnungAdresse: ex?.details?.rechnungAdresse || "",
    rechnungEmail: ex?.details?.rechnungEmail || "",
    rechnungUid: ex?.details?.rechnungUid || "",
  });
  const tg = (k, id) =>
    sF((p) => ({
      ...p,
      [k]: p[k].includes(id) ? p[k].filter((x) => x !== id) : [...p[k], id],
    }));
  const save = async () => {
    if (!f.kunde.trim()) {
      show("Name nötig", "error");
      return;
    }
    const bd = {
      ...f,
      budget: f.budget ? Number(f.budget) : 0,
      details: {
        raeume: f.raeume,
        flaeche: f.flaeche,
        arbeiten: f.arbeiten,
        bauleiter: f.bauleiter,
        rechnungFirma: f.rechnungFirma,
        rechnungAdresse: f.rechnungAdresse,
        rechnungEmail: f.rechnungEmail,
        rechnungUid: f.rechnungUid,
      },
    };
    try {
      if (ex) {
        await actions.baustellen.update(ex.id, bd);
        setSb({ ...bd, id: ex.id });
        show("Aktualisiert");
      } else {
        const newId = await actions.baustellen.create(bd);
        setSb({ ...bd, id: newId });
        show("Angelegt");
      }
      setEm(false);
      nav("bsd");
    } catch (e) {
      show("Fehler beim Speichern", "error");
    }
  };
  return (
    <ScreenLayout
      title={ex ? "Bearbeiten" : "Neue Baustelle"}
      onBack={() => {
        setEm(false);
        goBack();
      }}
    >
      {/* Card: Grunddaten */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          marginBottom: 16,
          overflow: "hidden",
          boxShadow: CS,
        }}
      >
        <div style={{ padding: "12px 16px" }}>
          <label
            style={{
              fontSize: 13,
              color: "#8e8e93",
              display: "block",
              marginBottom: 6,
            }}
          >
            Kunde *
          </label>
          <input
            value={f.kunde}
            onChange={(e) => sF({ ...f, kunde: e.target.value })}
            className={IC}
          />
        </div>
        <div
          style={{
            borderTop: "0.5px solid rgba(0,0,0,0.08)",
            padding: "12px 16px",
          }}
        >
          <label
            style={{
              fontSize: 13,
              color: "#8e8e93",
              display: "block",
              marginBottom: 6,
            }}
          >
            Adresse
          </label>
          <input
            value={f.adresse}
            onChange={(e) => sF({ ...f, adresse: e.target.value })}
            className={IC}
          />
        </div>
        <div
          style={{
            borderTop: "0.5px solid rgba(0,0,0,0.08)",
            padding: "12px 16px",
          }}
        >
          <label
            style={{
              fontSize: 13,
              color: "#8e8e93",
              display: "block",
              marginBottom: 6,
            }}
          >
            Status
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            {["geplant", "aktiv", "fertig", "abgerechnet"].map((s) => (
              <button
                key={s}
                onClick={() => sF({ ...f, status: s })}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                  ...(f.status === s
                    ? { background: BTN, color: "white" }
                    : { background: "#f2f2f7", color: "#8e8e93" }),
                }}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Card: Kontakt */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          marginBottom: 16,
          overflow: "hidden",
          boxShadow: CS,
        }}
      >
        <div style={{ padding: "12px 16px" }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            <div>
              <label
                style={{
                  fontSize: 13,
                  color: "#8e8e93",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Kontakt
              </label>
              <input
                value={f.ansprechpartner}
                onChange={(e) => sF({ ...f, ansprechpartner: e.target.value })}
                className={IC}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: 13,
                  color: "#8e8e93",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Telefon
              </label>
              <input
                value={f.telefon}
                onChange={(e) => sF({ ...f, telefon: e.target.value })}
                className={IC}
              />
            </div>
          </div>
        </div>
        <div
          style={{
            borderTop: "0.5px solid rgba(0,0,0,0.08)",
            padding: "12px 16px",
          }}
        >
          <label
            style={{
              fontSize: 13,
              color: "#8e8e93",
              display: "block",
              marginBottom: 6,
            }}
          >
            Zugang
          </label>
          <input
            value={f.zugang}
            onChange={(e) => sF({ ...f, zugang: e.target.value })}
            className={IC}
          />
        </div>
      </div>

      {/* Card: Zeitraum & Budget */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          marginBottom: 16,
          overflow: "hidden",
          boxShadow: CS,
        }}
      >
        <div style={{ padding: "12px 16px" }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            <div>
              <label
                style={{
                  fontSize: 13,
                  color: "#8e8e93",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Start
              </label>
              <input
                type="date"
                value={f.startdatum}
                onChange={(e) => sF({ ...f, startdatum: e.target.value })}
                className={IC}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: 13,
                  color: "#8e8e93",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Ende
              </label>
              <input
                type="date"
                value={f.enddatum}
                onChange={(e) => sF({ ...f, enddatum: e.target.value })}
                className={IC}
              />
            </div>
          </div>
        </div>
        <div
          style={{
            borderTop: "0.5px solid rgba(0,0,0,0.08)",
            padding: "12px 16px",
          }}
        >
          <label
            style={{
              fontSize: 13,
              color: "#8e8e93",
              display: "block",
              marginBottom: 6,
            }}
          >
            Budget (€)
          </label>
          <input
            type="number"
            value={f.budget}
            onChange={(e) => sF({ ...f, budget: e.target.value })}
            placeholder="z.B. 50000"
            className={IC}
          />
        </div>
      </div>

      {/* Card: Details */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          marginBottom: 16,
          overflow: "hidden",
          boxShadow: CS,
        }}
      >
        <div style={{ padding: "12px 16px" }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            <div>
              <label
                style={{
                  fontSize: 13,
                  color: "#8e8e93",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Räume
              </label>
              <input
                value={f.raeume}
                onChange={(e) => sF({ ...f, raeume: e.target.value })}
                className={IC}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: 13,
                  color: "#8e8e93",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Fläche
              </label>
              <input
                value={f.flaeche}
                onChange={(e) => sF({ ...f, flaeche: e.target.value })}
                className={IC}
              />
            </div>
          </div>
        </div>
        <div
          style={{
            borderTop: "0.5px solid rgba(0,0,0,0.08)",
            padding: "12px 16px",
          }}
        >
          <label
            style={{
              fontSize: 13,
              color: "#8e8e93",
              display: "block",
              marginBottom: 6,
            }}
          >
            Arbeiten
          </label>
          <textarea
            value={f.arbeiten}
            onChange={(e) => sF({ ...f, arbeiten: e.target.value })}
            rows={2}
            className={IC + " resize-none"}
          />
        </div>
      </div>

      {/* Card: Team */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          marginBottom: 16,
          overflow: "hidden",
          boxShadow: CS,
        }}
      >
        <div style={{ padding: "12px 16px" }}>
          <p
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#000",
              marginBottom: 8,
            }}
          >
            Handwerker
          </p>
          {data.users.filter((u) => u.role === "mitarbeiter").length === 0 ? (
            <p style={{ fontSize: 13, color: "#8e8e93" }}>
              Noch keine Handwerker angelegt.{" "}
              <button
                onClick={() => nav("mitf")}
                style={{
                  color: "#3c3c43",
                  textDecoration: "underline",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Jetzt anlegen →
              </button>
            </p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {data.users
                .filter((u) => u.role === "mitarbeiter")
                .map((u) => (
                  <button
                    key={u.id}
                    onClick={() => tg("mitarbeiter", u.id)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 500,
                      border: "none",
                      cursor: "pointer",
                      ...(f.mitarbeiter.includes(u.id)
                        ? { background: BTN, color: "white" }
                        : { background: "#f2f2f7", color: "#8e8e93" }),
                    }}
                  >
                    {f.mitarbeiter.includes(u.id) && (
                      <Check
                        size={12}
                        style={{ display: "inline", marginRight: 4 }}
                      />
                    )}
                    {u.name}
                  </button>
                ))}
            </div>
          )}
        </div>
        <div
          style={{
            borderTop: "0.5px solid rgba(0,0,0,0.08)",
            padding: "12px 16px",
          }}
        >
          <p
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#000",
              marginBottom: 8,
            }}
          >
            Subunternehmer
          </p>
          {data.subunternehmer.length === 0 ? (
            <p style={{ fontSize: 13, color: "#8e8e93" }}>
              Noch keine Subunternehmer angelegt.{" "}
              <button
                onClick={() => nav("sub")}
                style={{
                  color: "#3c3c43",
                  textDecoration: "underline",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Jetzt anlegen →
              </button>
            </p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {data.subunternehmer.map((s) => (
                <button
                  key={s.id}
                  onClick={() => tg("subunternehmer", s.id)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer",
                    ...(f.subunternehmer.includes(s.id)
                      ? { background: BTN, color: "white" }
                      : { background: "#f2f2f7", color: "#8e8e93" }),
                  }}
                >
                  {f.subunternehmer.includes(s.id) && (
                    <Check
                      size={12}
                      style={{ display: "inline", marginRight: 4 }}
                    />
                  )}
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Card: Rechnungsdaten (nur Chef) */}
      {chef && (
        <div
          style={{
            background: "white",
            borderRadius: 12,
            marginBottom: 16,
            overflow: "hidden",
            boxShadow: CS,
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "0.5px solid rgba(0,0,0,0.08)",
            }}
          >
            <p style={{ fontSize: 15, fontWeight: 600, color: "#000" }}>
              Rechnungsdaten
            </p>
          </div>
          <div style={{ padding: "12px 16px" }}>
            <label
              style={{
                fontSize: 13,
                color: "#8e8e93",
                display: "block",
                marginBottom: 6,
              }}
            >
              Firma / Auftraggeber
            </label>
            <input
              value={f.rechnungFirma}
              onChange={(e) => sF({ ...f, rechnungFirma: e.target.value })}
              className={IC}
            />
          </div>
          <div
            style={{
              borderTop: "0.5px solid rgba(0,0,0,0.08)",
              padding: "12px 16px",
            }}
          >
            <label
              style={{
                fontSize: 13,
                color: "#8e8e93",
                display: "block",
                marginBottom: 6,
              }}
            >
              Rechnungsadresse
            </label>
            <input
              value={f.rechnungAdresse}
              onChange={(e) => sF({ ...f, rechnungAdresse: e.target.value })}
              className={IC}
            />
          </div>
          <div
            style={{
              borderTop: "0.5px solid rgba(0,0,0,0.08)",
              padding: "12px 16px",
            }}
          >
            <label
              style={{
                fontSize: 13,
                color: "#8e8e93",
                display: "block",
                marginBottom: 6,
              }}
            >
              E-Mail
            </label>
            <input
              type="email"
              value={f.rechnungEmail}
              onChange={(e) => sF({ ...f, rechnungEmail: e.target.value })}
              className={IC}
            />
          </div>
          <div
            style={{
              borderTop: "0.5px solid rgba(0,0,0,0.08)",
              padding: "12px 16px",
            }}
          >
            <label
              style={{
                fontSize: 13,
                color: "#8e8e93",
                display: "block",
                marginBottom: 6,
              }}
            >
              UID / Steuernummer (optional)
            </label>
            <input
              value={f.rechnungUid}
              onChange={(e) => sF({ ...f, rechnungUid: e.target.value })}
              className={IC}
            />
          </div>
        </div>
      )}

      <button
        onClick={save}
        style={{
          width: "100%",
          padding: "16px 24px",
          borderRadius: 14,
          color: "white",
          fontWeight: 600,
          fontSize: 17,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          background: BTN,
          boxShadow: "0 2px 8px rgba(124,58,237,0.35)",
          border: "none",
        }}
      >
        <Save size={20} />
        {ex ? "Speichern" : "Anlegen"}
      </button>
    </ScreenLayout>
  );
};

// ==================== STUNDEN EINTRAGEN ====================
const SteView = () => {
  const {
    sb,
    chef,
    cu,
    data,
    actions,
    show,
    nav,
    goBack,
    prevV,
    eName,
    trigPhoto,
    addN,
  } = useContext(AppContext);
  const [editId, setEditId] = useState(null);
  const initFd = {
    baustelleId: sb?.id || "",
    datum: new Date().toISOString().split("T")[0],
    beginn: "07:00",
    ende: "16:00",
    pause: 30,
    fahrtzeit: 30,
    arbeit: "",
    material: "",
    fotos: [],
    personTyp: "mitarbeiter",
    mitarbeiterId: chef ? "" : cu.id,
    subId: "",
    personName: "",
  };
  const [fd, sFd] = useState(initFd);
  const [saved, setSaved] = useState(false);
  const [showList, setShowList] = useState(false);
  const mb = chef
    ? data.baustellen
    : data.baustellen.filter((b) => b.mitarbeiter.includes(cu.id));

  const startEdit = (e) => {
    setEditId(e.id);
    sFd({
      baustelleId: String(e.baustelleId),
      datum: e.datum,
      beginn: e.beginn,
      ende: e.ende,
      pause: e.pause,
      fahrtzeit: e.fahrtzeit || 0,
      arbeit: e.arbeit,
      material: e.material || "",
      fotos: e.fotos || [],
      personTyp: e.personTyp || "mitarbeiter",
      mitarbeiterId: e.mitarbeiterId || "",
      subId: e.subId || "",
      personName: e.personName || "",
    });
    setShowList(false);
  };

  const save = async () => {
    if (!fd.baustelleId) {
      show("Baustelle wählen", "error");
      return;
    }
    if (fd.personTyp === "mitarbeiter" && !fd.mitarbeiterId) {
      show("Mitarbeiter wählen", "error");
      return;
    }
    if (fd.personTyp === "sub" && !fd.subId) {
      show("Subunternehmer wählen", "error");
      return;
    }
    if (fd.personTyp === "sonstige" && !fd.personName.trim()) {
      show("Name eingeben", "error");
      return;
    }
    const entry = {
      ...fd,
      baustelleId: fd.baustelleId,
      mitarbeiterId: fd.personTyp === "mitarbeiter" ? fd.mitarbeiterId : null,
      subId: fd.personTyp === "sub" ? fd.subId : null,
      personName: fd.personTyp === "sonstige" ? fd.personName.trim() : "",
    };
    const wasEdit = !!editId;
    try {
      if (editId) {
        await actions.stundeneintraege.update(editId, entry);
        show("Aktualisiert");
        setEditId(null);
      } else {
        await actions.stundeneintraege.create(entry);
        const pn =
          fd.personTyp === "mitarbeiter"
            ? data.users.find((u) => u.id === fd.mitarbeiterId)?.name
            : fd.personTyp === "sub"
              ? data.subunternehmer.find((s) => s.id === fd.subId)?.name
              : fd.personName;
        addN(
          "stunden",
          `${pn || cu.name}: Stunden eingetragen`,
          fd.baustelleId,
        );
      }
      setSaved(wasEdit ? "update" : "create");
      setTimeout(() => {
        sFd(initFd);
        setSaved(false);
        if (!chef) nav(sb ? "bsd" : "dash");
      }, 1200);
    } catch (e) {
      show("Fehler beim Speichern", "error");
    }
  };

  const delEntry = async (id) => {
    if (confirm("Eintrag löschen?")) {
      try {
        await actions.stundeneintraege.remove(id);
        show("Gelöscht");
      } catch (e) {
        show("Fehler", "error");
      }
    }
  };

  // Einträge für gewählte Baustelle
  const bsEintraege = fd.baustelleId
    ? data.stundeneintraege.filter((e) => e.baustelleId === fd.baustelleId)
    : [];

  if (saved)
    return (
      <ScreenLayout>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100%",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: "rgba(52,199,89,0.15)" }}
            >
              <Check size={28} style={{ color: "#34C759" }} />
            </div>
            <p style={{ fontSize: 17, fontWeight: 600, color: "#000" }}>
              {saved === "update" ? "Aktualisiert!" : "Gespeichert!"}
            </p>
          </div>
        </div>
      </ScreenLayout>
    );
  return (
    <ScreenLayout
      title={
        sb ? (editId ? "Stunden bearbeiten" : "Stunden eintragen") : "Stunden"
      }
      large={!sb}
      onBack={
        sb
          ? () => {
              setEditId(null);
              goBack();
            }
          : prevV
            ? goBack
            : undefined
      }
      right={
        chef &&
        bsEintraege.length > 0 && (
          <button
            onClick={() => setShowList(!showList)}
            style={{
              padding: "4px 8px",
              borderRadius: 8,
              fontSize: 12,
              color: "#8e8e93",
              background: "rgba(0,0,0,0.05)",
              border: "none",
            }}
          >
            {showList ? "Formular" : "Einträge (" + bsEintraege.length + ")"}
          </button>
        )
      }
    >
      {/* Einträge-Liste (Chef) */}
      {showList && chef ? (
        <div className="space-y-2">
          {[...bsEintraege].reverse().map((e) => {
            const bs = data.baustellen.find((b) => b.id === e.baustelleId);
            return (
              <div
                key={e.id}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: "white",
                  boxShadow: CS,
                }}
              >
                <div
                  className="flex justify-between items-start"
                  style={{ marginBottom: 4 }}
                >
                  <div>
                    <p style={{ fontSize: 15, color: "#000" }}>
                      {eName(e)}
                      {e.personTyp === "sub" && (
                        <span
                          style={{
                            color: "#8e8e93",
                            fontSize: 13,
                            marginLeft: 4,
                          }}
                        >
                          (Sub)
                        </span>
                      )}
                      {e.personTyp === "sonstige" && (
                        <span
                          style={{
                            color: "#8e8e93",
                            fontSize: 13,
                            marginLeft: 4,
                          }}
                        >
                          (Sonstige)
                        </span>
                      )}
                    </p>
                    <p style={{ fontSize: 13, color: "#8e8e93" }}>
                      {fDat(e.datum)} · {e.beginn}–{e.ende}
                    </p>
                  </div>
                  <span
                    style={{ fontWeight: 600, fontSize: 15, color: "#000" }}
                  >
                    {bStd(e.beginn, e.ende, e.pause)}h
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "#8e8e93" }}>{e.arbeit}</p>
                {e.material && (
                  <p style={{ fontSize: 13, color: "#8e8e93" }}>
                    Material: {e.material}
                  </p>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    onClick={() => startEdit(e)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      fontSize: 13,
                      background: "rgba(0,0,0,0.06)",
                      color: "#3c3c43",
                      border: "none",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Edit3 size={12} />
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => delEntry(e.id)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      fontSize: 13,
                      background: `${RED}12`,
                      color: RED,
                      border: "none",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Trash2 size={12} />
                    Löschen
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Formular */
        <div>
          {/* Card: Baustelle & Person */}
          <div
            style={{
              background: "white",
              borderRadius: 12,
              marginBottom: 16,
              overflow: "hidden",
              boxShadow: CS,
            }}
          >
            <div style={{ padding: "12px 16px" }}>
              <label
                style={{
                  fontSize: 13,
                  color: "#8e8e93",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Baustelle
              </label>
              <select
                value={fd.baustelleId}
                onChange={(e) => sFd({ ...fd, baustelleId: e.target.value })}
                className={IC}
              >
                <option value="">Baustelle wählen...</option>
                {mb.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.kunde}
                  </option>
                ))}
              </select>
            </div>
            {chef && (
              <div
                style={{
                  borderTop: "0.5px solid rgba(0,0,0,0.08)",
                  padding: "12px 16px",
                }}
              >
                <label
                  style={{
                    fontSize: 13,
                    color: "#8e8e93",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Stunden für
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { id: "mitarbeiter", l: "Handwerker" },
                    { id: "sub", l: "Subunternehmer" },
                    { id: "sonstige", l: "Sonstige" },
                  ].map(({ id, l }) => (
                    <button
                      key={id}
                      onClick={() =>
                        sFd({
                          ...fd,
                          personTyp: id,
                          mitarbeiterId:
                            id !== "mitarbeiter" ? "" : fd.mitarbeiterId,
                          subId: id !== "sub" ? "" : fd.subId,
                        })
                      }
                      style={{
                        flex: 1,
                        padding: "10px 0",
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 500,
                        border: "none",
                        cursor: "pointer",
                        ...(fd.personTyp === id
                          ? { background: BTN, color: "white" }
                          : {
                              background: "white",
                              color: "#8e8e93",
                              boxShadow: CS,
                            }),
                      }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                {fd.personTyp === "mitarbeiter" && (
                  <select
                    value={fd.mitarbeiterId}
                    onChange={(e) =>
                      sFd({ ...fd, mitarbeiterId: e.target.value })
                    }
                    className={IC}
                    style={{ marginTop: 8 }}
                  >
                    <option value="">Handwerker wählen...</option>
                    {data.users
                      .filter((u) => u.role === "mitarbeiter")
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    <option value={cu.id}>{cu.name} (ich)</option>
                  </select>
                )}
                {fd.personTyp === "sub" && (
                  <select
                    value={fd.subId}
                    onChange={(e) => sFd({ ...fd, subId: e.target.value })}
                    className={IC}
                    style={{ marginTop: 8 }}
                  >
                    <option value="">Subunternehmer wählen...</option>
                    {data.subunternehmer.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.gewerk ? ` (${s.gewerk})` : ""}
                      </option>
                    ))}
                  </select>
                )}
                {fd.personTyp === "sonstige" && (
                  <input
                    value={fd.personName}
                    onChange={(e) => sFd({ ...fd, personName: e.target.value })}
                    placeholder="Name (z.B. Probearbeiter, Aushilfe...)"
                    className={IC}
                    style={{ marginTop: 8 }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Card: Datum & Zeiten */}
          <div
            style={{
              background: "white",
              borderRadius: 12,
              marginBottom: 16,
              overflow: "hidden",
              boxShadow: CS,
            }}
          >
            <div style={{ padding: "12px 16px" }}>
              <label
                style={{
                  fontSize: 13,
                  color: "#8e8e93",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Datum
              </label>
              <input
                type="date"
                value={fd.datum}
                onChange={(e) => sFd({ ...fd, datum: e.target.value })}
                className={IC}
              />
            </div>
            <div
              style={{
                borderTop: "0.5px solid rgba(0,0,0,0.08)",
                padding: "12px 16px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      color: "#8e8e93",
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    Beginn
                  </label>
                  <input
                    type="time"
                    value={fd.beginn}
                    onChange={(e) => sFd({ ...fd, beginn: e.target.value })}
                    className={IC}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      color: "#8e8e93",
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    Ende
                  </label>
                  <input
                    type="time"
                    value={fd.ende}
                    onChange={(e) => sFd({ ...fd, ende: e.target.value })}
                    className={IC}
                  />
                </div>
              </div>
            </div>
            <div
              style={{
                borderTop: "0.5px solid rgba(0,0,0,0.08)",
                padding: "12px 16px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      color: "#8e8e93",
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    Pause (Min)
                  </label>
                  <input
                    type="number"
                    value={fd.pause}
                    onChange={(e) =>
                      sFd({ ...fd, pause: Number(e.target.value) })
                    }
                    className={IC}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      color: "#8e8e93",
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    Fahrtzeit (Min)
                  </label>
                  <input
                    type="number"
                    value={fd.fahrtzeit}
                    onChange={(e) =>
                      sFd({ ...fd, fahrtzeit: Number(e.target.value) })
                    }
                    className={IC}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stunden-Anzeige */}
          {fd.beginn && fd.ende && (
            <div
              style={{
                background: "white",
                borderRadius: 12,
                marginBottom: 16,
                padding: "14px 16px",
                boxShadow: CS,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 14, color: "#8e8e93" }}>
                Berechnete Arbeitszeit
              </span>
              <span style={{ fontSize: 17, fontWeight: 700, color: "#000" }}>
                {bStd(fd.beginn, fd.ende, fd.pause)}h{" "}
                <span
                  style={{ fontSize: 13, fontWeight: 500, color: "#8e8e93" }}
                >
                  + {fd.fahrtzeit}min Fahrt
                </span>
              </span>
            </div>
          )}

          {/* Card: Arbeit & Material */}
          <div
            style={{
              background: "white",
              borderRadius: 12,
              marginBottom: 16,
              overflow: "hidden",
              boxShadow: CS,
            }}
          >
            <div style={{ padding: "12px 16px" }}>
              <label
                style={{
                  fontSize: 13,
                  color: "#8e8e93",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Tätigkeit
              </label>
              <textarea
                value={fd.arbeit}
                onChange={(e) => sFd({ ...fd, arbeit: e.target.value })}
                placeholder="Was wurde gemacht? (optional)"
                rows={2}
                className={IC + " resize-none"}
              />
            </div>
            <div
              style={{
                borderTop: "0.5px solid rgba(0,0,0,0.08)",
                padding: "12px 16px",
              }}
            >
              <label
                style={{
                  fontSize: 13,
                  color: "#8e8e93",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Material
              </label>
              <input
                value={fd.material}
                onChange={(e) => sFd({ ...fd, material: e.target.value })}
                placeholder="Material verbraucht..."
                className={IC}
              />
            </div>
            <div
              style={{
                borderTop: "0.5px solid rgba(0,0,0,0.08)",
                padding: "12px 16px",
              }}
            >
              <label
                style={{
                  fontSize: 13,
                  color: "#8e8e93",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Fotos
              </label>
              <PhotoGrid
                fotos={fd.fotos}
                onAdd={() =>
                  trigPhoto((img) =>
                    sFd((p) => ({ ...p, fotos: [...p.fotos, img] })),
                  )
                }
                onRemove={(i) =>
                  sFd((p) => ({
                    ...p,
                    fotos: p.fotos.filter((_, idx) => idx !== i),
                  }))
                }
              />
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={save}
            disabled={!fd.baustelleId}
            style={{
              width: "100%",
              padding: "16px 24px",
              borderRadius: 14,
              color: "white",
              fontWeight: 600,
              fontSize: 17,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: BTN,
              boxShadow: "0 2px 8px rgba(124,58,237,0.35)",
              border: "none",
              opacity: !fd.baustelleId ? 0.5 : 1,
            }}
          >
            <Save size={20} />
            {editId ? "Aktualisieren" : "Speichern"}
          </button>
          {editId && (
            <button
              onClick={() => {
                setEditId(null);
                sFd(initFd);
              }}
              className="w-full py-3 text-center"
              style={{ color: "#8e8e93", fontSize: 14, marginTop: 8 }}
            >
              Abbrechen – neuen Eintrag erstellen
            </button>
          )}
        </div>
      )}
    </ScreenLayout>
  );
};

// ==================== MEINE STUNDEN (Handwerker) ====================
const MeineStd = () => {
  const { data, cu, goBack } = useContext(AppContext);
  const h = new Date();
  const [mo, setMo] = useState(h.getMonth());
  const [jr, setJr] = useState(h.getFullYear());
  const pv = () => {
    setMo((m) => {
      if (m === 0) {
        setJr((j) => j - 1);
        return 11;
      }
      return m - 1;
    });
  };
  const nx = () => {
    setMo((m) => {
      if (m === 11) {
        setJr((j) => j + 1);
        return 0;
      }
      return m + 1;
    });
  };
  const all = data.stundeneintraege.filter((e) => e.mitarbeiterId === cu.id);
  const me = all.filter((e) => {
    const d = new Date(e.datum);
    return d.getMonth() === mo && d.getFullYear() === jr;
  });
  const moH = me.reduce(
    (s, e) => s + parseFloat(bStd(e.beginn, e.ende, e.pause)),
    0,
  );
  const totalH = all.reduce(
    (s, e) => s + parseFloat(bStd(e.beginn, e.ende, e.pause)),
    0,
  );
  // Gruppiert nach Woche
  const byWeek = {};
  me.forEach((e) => {
    const d = new Date(e.datum);
    const day = d.getDay() || 7;
    const thu = new Date(d);
    thu.setDate(d.getDate() + 4 - day);
    const kw = Math.ceil(
      ((thu - new Date(thu.getFullYear(), 0, 1)) / 86400000 + 1) / 7,
    );
    const w = `KW ${String(kw).padStart(2, "0")}`;
    if (!byWeek[w]) byWeek[w] = [];
    byWeek[w].push(e);
  });
  return (
    <ScreenLayout title="Meine Stunden" onBack={goBack}>
      {/* Monat Navigation */}
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: 12 }}
      >
        <button
          onClick={pv}
          style={{
            padding: 8,
            color: "#8e8e93",
            background: "none",
            border: "none",
          }}
        >
          <ChevronLeft size={18} />
        </button>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: "#000" }}>
          {new Date(jr, mo).toLocaleDateString("de-DE", {
            month: "long",
            year: "numeric",
          })}
        </h2>
        <button
          onClick={nx}
          style={{
            padding: 8,
            color: "#8e8e93",
            background: "none",
            border: "none",
          }}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            borderRadius: 12,
            padding: 14,
            background: "white",
            boxShadow: CS,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>
            {moH.toFixed(1)}h
          </p>
          <p style={{ fontSize: 12, color: "#8e8e93" }}>Monat</p>
        </div>
        <div
          style={{
            borderRadius: 12,
            padding: 14,
            background: "white",
            boxShadow: CS,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>
            {me.length}
          </p>
          <p style={{ fontSize: 12, color: "#8e8e93" }}>Einträge</p>
        </div>
        <div
          style={{
            borderRadius: 12,
            padding: 14,
            background: "white",
            boxShadow: CS,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>
            {totalH.toFixed(1)}h
          </p>
          <p style={{ fontSize: 12, color: "#8e8e93" }}>Gesamt</p>
        </div>
      </div>
      {me.length === 0 ? (
        <Empty icon={Clock} text="Keine Stunden in diesem Monat" />
      ) : (
        <div className="space-y-2">
          {Object.entries(byWeek)
            .reverse()
            .map(([w, entries]) => {
              const wH = entries.reduce(
                (s, e) => s + parseFloat(bStd(e.beginn, e.ende, e.pause)),
                0,
              );
              return (
                <div
                  key={w}
                  style={{
                    borderRadius: 12,
                    background: "white",
                    boxShadow: CS,
                    overflow: "hidden",
                  }}
                >
                  <div
                    className="flex justify-between items-center"
                    style={{
                      padding: "10px 16px",
                      borderBottom: "0.5px solid rgba(0,0,0,0.08)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#8e8e93",
                      }}
                    >
                      {w}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#3c3c43",
                      }}
                    >
                      {wH.toFixed(1)}h
                    </span>
                  </div>
                  <div style={{ padding: 10 }} className="space-y-1">
                    {[...entries].reverse().map((e) => {
                      const bs = data.baustellen.find(
                        (b) => b.id === e.baustelleId,
                      );
                      return (
                        <div
                          key={e.id}
                          style={{
                            padding: 10,
                            borderRadius: 10,
                            background: "#f2f2f7",
                            fontSize: 13,
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p style={{ color: "#000" }}>
                                {bs?.kunde || "?"}
                              </p>
                              <p style={{ color: "#8e8e93" }}>
                                {fDat(e.datum)} · {e.beginn}–{e.ende}
                              </p>
                            </div>
                            <span style={{ fontWeight: 600, color: "#000" }}>
                              {bStd(e.beginn, e.ende, e.pause)}h
                            </span>
                          </div>
                          <p style={{ color: "#8e8e93", marginTop: 2 }}>
                            {e.arbeit}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </ScreenLayout>
  );
};

// ==================== MÄNGELMANAGEMENT ====================
const MngView = () => {
  const { sb, chef, cu, data, actions, show, goBack, trigPhoto, addN } =
    useContext(AppContext);
  const [sf, setSf] = useState(false);
  const [fl, setFl] = useState("alle");
  const [mf, sMf] = useState({
    baustelleId:
      sb?.id ||
      (chef
        ? data.baustellen[0]?.id
        : data.baustellen.find((b) => b.mitarbeiter.includes(cu.id))?.id) ||
      "",
    titel: "",
    beschreibung: "",
    prioritaet: "mittel",
    zustaendig: "",
    frist: "",
    fotos: [],
  });
  const myBs = chef
    ? data.baustellen
    : data.baustellen.filter((b) => b.mitarbeiter.includes(cu.id));
  let ls = sb
    ? data.maengel.filter((m) => m.baustelleId === sb.id)
    : chef
      ? data.maengel
      : data.maengel.filter((m) => myBs.some((b) => b.id === m.baustelleId));
  if (fl !== "alle") ls = ls.filter((m) => m.status === fl);
  const save = async () => {
    if (!mf.baustelleId) {
      show("Baustelle wählen", "error");
      return;
    }
    if (!mf.titel.trim()) {
      show("Titel nötig", "error");
      return;
    }
    try {
      await actions.maengel.create({
        baustelleId: mf.baustelleId,
        titel: mf.titel,
        beschreibung: mf.beschreibung,
        prioritaet: mf.prioritaet,
        status: "offen",
        zustaendig: mf.zustaendig || null,
        erstelltAm: new Date().toISOString().split("T")[0],
        frist: mf.frist,
        fotos: mf.fotos,
      });
      addN("mangel", `Mangel: ${mf.titel}`, mf.baustelleId);
      show("Erfasst");
      setSf(false);
      sMf({ ...mf, titel: "", beschreibung: "", fotos: [] });
    } catch (e) {
      show("Fehler", "error");
    }
  };
  const upSt = async (id, st) => {
    try {
      await actions.maengel.updateStatus(id, st);
      show(st === "erledigt" ? "Erledigt" : "In Arbeit");
    } catch (e) {
      show("Fehler", "error");
    }
  };
  const delMng = async (id) => {
    if (confirm("Mangel löschen?")) {
      try {
        await actions.maengel.remove(id);
        show("Gelöscht");
      } catch (e) {
        show("Fehler", "error");
      }
    }
  };
  const pc = { hoch: RED, mittel: P, niedrig: "#8e8e93" };
  const sl = { offen: "Offen", in_arbeit: "In Arbeit", erledigt: "Erledigt" };
  const stc = { offen: RED, in_arbeit: P, erledigt: GREEN };
  return (
    <ScreenLayout
      title="Mängelmanagement"
      onBack={goBack}
      right={
        <button
          onClick={() => setSf(!sf)}
          style={{
            padding: 8,
            borderRadius: 10,
            background: sf ? "rgba(0,0,0,0.05)" : BTN,
            border: "none",
            cursor: "pointer",
          }}
        >
          {sf ? (
            <X size={18} style={{ color: "#3c3c43" }} />
          ) : (
            <Plus size={18} style={{ color: "white" }} />
          )}
        </button>
      }
    >
      {sf && (
        <div
          className="space-y-2"
          style={{
            paddingBottom: 16,
            borderBottom: "0.5px solid rgba(0,0,0,0.08)",
          }}
        >
          {!sb && (
            <select
              value={mf.baustelleId}
              onChange={(e) => sMf({ ...mf, baustelleId: e.target.value })}
              className={IC}
              style={{ background: "rgba(118,118,128,0.12)", border: "none" }}
            >
              <option value="">Baustelle...</option>
              {myBs.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.kunde}
                </option>
              ))}
            </select>
          )}
          <input
            value={mf.titel}
            onChange={(e) => sMf({ ...mf, titel: e.target.value })}
            placeholder="Mangel-Titel *"
            className={IC}
            style={{ background: "rgba(118,118,128,0.12)", border: "none" }}
          />
          <textarea
            value={mf.beschreibung}
            onChange={(e) => sMf({ ...mf, beschreibung: e.target.value })}
            placeholder="Beschreibung..."
            rows={2}
            className={IC + " resize-none"}
            style={{ background: "rgba(118,118,128,0.12)", border: "none" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            {["niedrig", "mittel", "hoch"].map((p) => (
              <button
                key={p}
                onClick={() => sMf({ ...mf, prioritaet: p })}
                className="flex-1"
                style={{
                  padding: "12px 0",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  minHeight: 44,
                  border: "none",
                  color: mf.prioritaet === p ? "white" : "#3c3c43",
                  background: mf.prioritaet === p ? pc[p] : "white",
                  boxShadow: mf.prioritaet === p ? "none" : CS,
                }}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          {chef && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 8,
              }}
            >
              <select
                value={mf.zustaendig}
                onChange={(e) => sMf({ ...mf, zustaendig: e.target.value })}
                className={IC}
              >
                <option value="">Zuständig...</option>
                {data.subunternehmer.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
                {data.users
                  .filter((u) => u.role === "mitarbeiter")
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
              <input
                type="date"
                value={mf.frist}
                onChange={(e) => sMf({ ...mf, frist: e.target.value })}
                className={IC}
              />
            </div>
          )}
          <PhotoGrid
            fotos={mf.fotos}
            onAdd={() =>
              trigPhoto((img) =>
                sMf((p) => ({ ...p, fotos: [...p.fotos, img] })),
              )
            }
            onRemove={(i) =>
              sMf((p) => ({
                ...p,
                fotos: p.fotos.filter((_, idx) => idx !== i),
              }))
            }
          />
          <button
            onClick={save}
            style={{
              width: "100%",
              padding: "16px 24px",
              borderRadius: 14,
              color: "white",
              fontWeight: 600,
              fontSize: 17,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: BTN,
              boxShadow: "0 2px 8px rgba(124,58,237,0.35)",
              border: "none",
            }}
          >
            <AlertCircle size={18} />
            Erfassen
          </button>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {["alle", "offen", "in_arbeit", "erledigt"].map((s) => (
          <button
            key={s}
            onClick={() => setFl(s)}
            style={{
              padding: "8px 16px",
              borderRadius: 100,
              fontSize: 13,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              ...(fl === s
                ? {
                    background: s === "alle" ? BTN : stc[s] || BTN,
                    color: "white",
                  }
                : { background: "white", boxShadow: CS, color: "#3c3c43" }),
            }}
          >
            {s === "alle" ? "Alle" : sl[s]}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {ls.length === 0 ? (
          <Empty icon={CheckCircle} text="Keine Mängel vorhanden" />
        ) : (
          ls.map((m) => {
            const bs = data.baustellen.find((b) => b.id === m.baustelleId);
            const z =
              data.subunternehmer.find((s) => s.id === m.zustaendig) ||
              data.users.find((u) => u.id === m.zustaendig);
            return (
              <div
                key={m.id}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: "white",
                  boxShadow: CS,
                }}
              >
                <div
                  className="flex items-start justify-between"
                  style={{ marginBottom: 6 }}
                >
                  <div className="flex-1">
                    <p style={{ fontSize: 15, fontWeight: 600, color: "#000" }}>
                      {m.titel}
                    </p>
                    <p style={{ fontSize: 13, color: "#8e8e93" }}>
                      {bs?.kunde}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <Bdg text={m.prioritaet} color={pc[m.prioritaet]} />
                    <Bdg text={sl[m.status]} color={stc[m.status]} />
                  </div>
                </div>
                {m.beschreibung && (
                  <p
                    style={{ fontSize: 13, color: "#8e8e93", marginBottom: 6 }}
                  >
                    {m.beschreibung}
                  </p>
                )}
                <div
                  className="flex items-center justify-between"
                  style={{ fontSize: 13 }}
                >
                  <div style={{ color: "#8e8e93" }}>
                    {z && <span>→ {z.name}</span>}
                    {m.frist && (
                      <span style={{ marginLeft: 8 }}>
                        Frist: {fK(m.frist)}
                      </span>
                    )}
                  </div>
                  {chef && m.status !== "erledigt" && (
                    <div style={{ display: "flex", gap: 8 }}>
                      {m.status === "offen" && (
                        <button
                          onClick={() => upSt(m.id, "in_arbeit")}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 10,
                            fontSize: 13,
                            background: "rgba(0,0,0,0.07)",
                            color: "#3c3c43",
                            border: "none",
                            fontWeight: 600,
                          }}
                        >
                          In Arbeit
                        </button>
                      )}
                      <button
                        onClick={() => upSt(m.id, "erledigt")}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 10,
                          fontSize: 13,
                          background: `${GREEN}15`,
                          color: GREEN,
                          border: "none",
                          fontWeight: 600,
                        }}
                      >
                        Erledigt
                      </button>
                    </div>
                  )}
                  {chef && (
                    <button
                      onClick={() => delMng(m.id)}
                      style={{
                        padding: 8,
                        color: "#c7c7cc",
                        background: "none",
                        border: "none",
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                {m.fotos?.length > 0 && (
                  <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                    {m.fotos.map((f, i) => (
                      <img
                        key={i}
                        src={f}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          objectFit: "cover",
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </ScreenLayout>
  );
};

// ==================== BAUTAGEBUCH ====================
const BtbView = () => {
  const { sb, chef, cu, data, actions, show, goBack } = useContext(AppContext);
  const [sf, setSf] = useState(false);
  const ls = sb
    ? data.bautagebuch.filter((b) => b.baustelleId === sb.id)
    : data.bautagebuch;
  const [bf, sBf] = useState({
    baustelleId:
      sb?.id ||
      (chef
        ? data.baustellen[0]?.id
        : data.baustellen.find((b) => b.mitarbeiter.includes(cu.id))?.id) ||
      "",
    datum: new Date().toISOString().split("T")[0],
    anwesende: [],
    arbeiten: "",
    besonderheiten: "",
    behinderungen: "",
  });
  const tgA = (id) =>
    sBf((p) => ({
      ...p,
      anwesende: p.anwesende.includes(id)
        ? p.anwesende.filter((x) => x !== id)
        : [...p.anwesende, id],
    }));
  const save = async () => {
    if (!bf.baustelleId) {
      show("Baustelle wählen", "error");
      return;
    }
    if (!bf.arbeiten.trim()) {
      show("Arbeiten beschreiben", "error");
      return;
    }
    try {
      await actions.bautagebuch.create({
        baustelleId: bf.baustelleId,
        datum: bf.datum,
        anwesende: bf.anwesende,
        arbeiten: bf.arbeiten,
        besonderheiten: bf.besonderheiten,
        behinderungen: bf.behinderungen,
      });
      show("Gespeichert");
      setSf(false);
      sBf({
        ...bf,
        arbeiten: "",
        besonderheiten: "",
        behinderungen: "",
        anwesende: [],
      });
    } catch (e) {
      show("Fehler", "error");
    }
  };
  const delBtb = async (id) => {
    if (confirm("Eintrag löschen?")) {
      try {
        await actions.bautagebuch.remove(id);
        show("Gelöscht");
      } catch (e) {
        show("Fehler", "error");
      }
    }
  };
  return (
    <ScreenLayout
      title="Bautagebuch"
      onBack={goBack}
      right={
        chef && (
          <button
            onClick={() => setSf(!sf)}
            style={{
              padding: 8,
              borderRadius: 10,
              background: sf ? "rgba(0,0,0,0.05)" : BTN,
              border: "none",
              cursor: "pointer",
            }}
          >
            {sf ? (
              <X size={18} style={{ color: "#3c3c43" }} />
            ) : (
              <Plus size={18} style={{ color: "white" }} />
            )}
          </button>
        )
      }
    >
      {sf && (
        <div
          className="space-y-2"
          style={{
            paddingBottom: 16,
            borderBottom: "0.5px solid rgba(0,0,0,0.08)",
          }}
        >
          {!sb &&
            (() => {
              const myBs = chef
                ? data.baustellen
                : data.baustellen.filter((b) => b.mitarbeiter.includes(cu.id));
              return (
                <select
                  value={bf.baustelleId}
                  onChange={(e) => sBf({ ...bf, baustelleId: e.target.value })}
                  className={IC}
                  style={{
                    background: "rgba(118,118,128,0.12)",
                    border: "none",
                  }}
                >
                  <option value="">Baustelle...</option>
                  {myBs.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.kunde}
                    </option>
                  ))}
                </select>
              );
            })()}
          <input
            type="date"
            value={bf.datum}
            onChange={(e) => sBf({ ...bf, datum: e.target.value })}
            className={IC}
            style={{ background: "rgba(118,118,128,0.12)", border: "none" }}
          />
          <div>
            <p style={{ fontSize: 13, color: "#8e8e93", marginBottom: 4 }}>
              Anwesende
            </p>
            <div className="flex flex-wrap gap-2">
              {data.users
                .filter((u) => u.role === "mitarbeiter")
                .map((u) => (
                  <button
                    key={u.id}
                    onClick={() => tgA(u.id)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      border: "none",
                      color: bf.anwesende.includes(u.id) ? "white" : "#8e8e93",
                      background: bf.anwesende.includes(u.id) ? BTN : "#f2f2f7",
                    }}
                  >
                    {u.name}
                  </button>
                ))}
            </div>
          </div>
          <textarea
            value={bf.arbeiten}
            onChange={(e) => sBf({ ...bf, arbeiten: e.target.value })}
            placeholder="Arbeiten *"
            rows={2}
            className={IC + " resize-none"}
          />
          <input
            value={bf.besonderheiten}
            onChange={(e) => sBf({ ...bf, besonderheiten: e.target.value })}
            placeholder="Besonderheiten"
            className={IC}
          />
          <input
            value={bf.behinderungen}
            onChange={(e) => sBf({ ...bf, behinderungen: e.target.value })}
            placeholder="Behinderungen"
            className={IC}
          />
          <button
            onClick={save}
            style={{
              width: "100%",
              padding: "16px 24px",
              borderRadius: 14,
              color: "white",
              fontWeight: 600,
              fontSize: 17,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: BTN,
              boxShadow: "0 2px 8px rgba(124,58,237,0.35)",
              border: "none",
            }}
          >
            <Save size={18} />
            Speichern
          </button>
        </div>
      )}
      <div className="space-y-2">
        {ls.length === 0 ? (
          <Empty
            icon={ClipboardList}
            text="Tippe auf + um einen Eintrag zu erstellen"
          />
        ) : (
          [...ls].reverse().map((e) => {
            const bs = data.baustellen.find((b) => b.id === e.baustelleId);
            return (
              <div
                key={e.id}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: "white",
                  boxShadow: CS,
                }}
              >
                <div
                  className="flex justify-between items-start"
                  style={{ marginBottom: 6 }}
                >
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: "#000" }}>
                      {bs?.kunde}
                    </p>
                    <p style={{ fontSize: 13, color: "#8e8e93" }}>
                      {fDat(e.datum)}
                    </p>
                  </div>
                  {chef && (
                    <button
                      onClick={() => delBtb(e.id)}
                      style={{
                        padding: 8,
                        color: "#c7c7cc",
                        background: "none",
                        border: "none",
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <p style={{ fontSize: 13, color: "#3c3c43", marginBottom: 4 }}>
                  {e.arbeiten}
                </p>
                {e.besonderheiten && (
                  <p style={{ fontSize: 13, color: "#3c3c43" }}>
                    ⚡ {e.besonderheiten}
                  </p>
                )}
                {e.behinderungen && (
                  <p style={{ fontSize: 13, color: RED }}>
                    ⛔ {e.behinderungen}
                  </p>
                )}
                {e.anwesende?.length > 0 && (
                  <p style={{ fontSize: 13, color: "#8e8e93", marginTop: 4 }}>
                    {e.anwesende
                      .map((id) => data.users.find((x) => x.id === id)?.name)
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </ScreenLayout>
  );
};

// ==================== DOKUMENTE ====================
const DokView = () => {
  const { sb, chef, data, actions, show, goBack } = useContext(AppContext);
  const ds = sb
    ? data.dokumente.filter((d) => d.baustelleId === sb.id)
    : data.dokumente;
  const add = async () => {
    const n = prompt("Dokumentenname:");
    if (!n) return;
    try {
      await actions.dokumente.create({
        baustelleId: sb?.id || data.baustellen[0]?.id,
        name: n,
        typ: "dokument",
        groesse: "–",
        datum: new Date().toISOString().split("T")[0],
      });
      show("Hinzugefügt");
    } catch (e) {
      show("Fehler", "error");
    }
  };
  const del = async (id) => {
    try {
      await actions.dokumente.remove(id);
      show("Gelöscht");
    } catch (e) {
      show("Fehler", "error");
    }
  };
  const tc = { plan: P, gutachten: P, konzept: P, dokument: P };
  return (
    <ScreenLayout
      title="Dokumente"
      onBack={goBack}
      right={
        chef && (
          <button
            onClick={add}
            style={{
              padding: 8,
              borderRadius: 10,
              color: "white",
              background: BTN,
              border: "none",
              cursor: "pointer",
            }}
          >
            <Plus size={18} />
          </button>
        )
      }
    >
      <div className="space-y-2">
        {ds.length === 0 ? (
          <Empty
            icon={FileUp}
            text="Tippe auf + um ein Dokument hinzuzufügen"
          />
        ) : (
          ds.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3"
              style={{
                padding: 16,
                borderRadius: 12,
                background: "white",
                boxShadow: CS,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(0,0,0,0.06)",
                  flexShrink: 0,
                }}
              >
                <FileText size={16} style={{ color: "#8e8e93" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  style={{ fontSize: 15, fontWeight: 600, color: "#000" }}
                  className="truncate"
                >
                  {d.name}
                </p>
                <p style={{ fontSize: 13, color: "#8e8e93" }}>
                  {d.groesse} · {fK(d.datum)}
                </p>
              </div>
              {chef && (
                <button
                  onClick={() => del(d.id)}
                  style={{
                    padding: 8,
                    color: "#c7c7cc",
                    background: "none",
                    border: "none",
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </ScreenLayout>
  );
};

// ==================== MATERIALÜBERSICHT ====================
const MatView = () => {
  const { data, goBack } = useContext(AppContext);
  const mp = {};
  data.stundeneintraege.forEach((e) => {
    if (!e.material) return;
    const bs = data.baustellen.find((b) => b.id === e.baustelleId);
    const k = bs?.kunde || "?";
    if (!mp[k]) mp[k] = [];
    mp[k].push({
      m: e.material,
      d: e.datum,
      v: data.users.find((u) => u.id === e.mitarbeiterId)?.name,
    });
  });
  return (
    <ScreenLayout title="Materialübersicht" onBack={goBack}>
      <div className="space-y-2">
        {Object.keys(mp).length === 0 ? (
          <Empty icon={Package} text="Noch kein Material erfasst" />
        ) : (
          Object.entries(mp).map(([bs, items]) => (
            <div
              key={bs}
              style={{
                borderRadius: 12,
                background: "white",
                boxShadow: CS,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "0.5px solid rgba(0,0,0,0.08)",
                }}
              >
                <p style={{ fontSize: 15, fontWeight: 600, color: "#000" }}>
                  {bs}
                </p>
              </div>
              <div style={{ padding: 16 }} className="space-y-2">
                {items.map((i, idx) => (
                  <div key={idx} style={{ fontSize: 13 }}>
                    <p style={{ color: "#3c3c43" }}>{i.m}</p>
                    <p style={{ color: "#8e8e93" }}>
                      {i.v} · {fK(i.d)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </ScreenLayout>
  );
};

// ==================== BENACHRICHTIGUNGEN ====================
const NotifView = () => {
  const { data, actions, show, goBack } = useContext(AppContext);
  const markAll = async () => {
    try {
      await actions.benachrichtigungen.markAllRead();
    } catch (e) {
      show("Fehler", "error");
    }
  };
  const clearAll = async () => {
    if (confirm("Alle Benachrichtigungen löschen?")) {
      try {
        await actions.benachrichtigungen.removeAll();
        show("Alle gelöscht");
      } catch (e) {
        show("Fehler", "error");
      }
    }
  };
  const delN = async (id) => {
    try {
      await actions.benachrichtigungen.remove(id);
    } catch (e) {
      show("Fehler", "error");
    }
  };
  const ti = { mangel: AlertCircle, stunden: Clock, info: Bell };
  const tc = { mangel: RED, stunden: P, info: P };
  return (
    <ScreenLayout
      title="Mitteilungen"
      onBack={goBack}
      right={
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={markAll}
            style={{
              fontSize: 12,
              color: "#3c3c43",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            Alle gelesen
          </button>
          {data.benachrichtigungen.length > 0 && (
            <button
              onClick={clearAll}
              style={{
                fontSize: 12,
                color: RED,
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Alle löschen
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-2">
        {data.benachrichtigungen.length === 0 ? (
          <Empty icon={Bell} text="Keine Benachrichtigungen" />
        ) : (
          data.benachrichtigungen.map((n) => {
            const I = ti[n.typ] || Bell;
            const bs = data.baustellen.find((b) => b.id === n.baustelleId);
            return (
              <div
                key={n.id}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: n.gelesen ? "#f2f2f7" : "white",
                  boxShadow: n.gelesen ? "none" : CS,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "rgba(0,0,0,0.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <I size={16} style={{ color: "#8e8e93" }} />
                  </div>
                  <div className="flex-1">
                    <p
                      style={{
                        fontSize: 15,
                        color: n.gelesen ? "#8e8e93" : "#000",
                      }}
                    >
                      {n.text}
                    </p>
                    <p style={{ fontSize: 13, color: "#8e8e93" }}>
                      {bs?.kunde} ·{" "}
                      {new Date(n.datum).toLocaleString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => delN(n.id)}
                    style={{
                      padding: 8,
                      color: "#c7c7cc",
                      background: "none",
                      border: "none",
                      flexShrink: 0,
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </ScreenLayout>
  );
};

// ==================== KALENDER ====================
const KalView = () => {
  const { data, chef, actions, show, goBack, prevV } = useContext(AppContext);
  const h = new Date();
  const [mo, setMo] = useState(h.getMonth());
  const [jr, setJr] = useState(h.getFullYear());
  const [selDay, setSelDay] = useState(null);
  const [sf, setSf] = useState(false);
  const [kf, sKf] = useState({ titel: "", baustelleId: "", mitarbeiter: [] });
  const pv = () => {
    setMo((m) => {
      if (m === 0) {
        setJr((j) => j - 1);
        return 11;
      }
      return m - 1;
    });
  };
  const nx = () => {
    setMo((m) => {
      if (m === 11) {
        setJr((j) => j + 1);
        return 0;
      }
      return m + 1;
    });
  };
  const off = (new Date(jr, mo, 1).getDay() + 6) % 7;
  const days = new Date(jr, mo + 1, 0).getDate();
  const tm = data.kalender.filter((t) => {
    const d = new Date(t.datum);
    return d.getMonth() === mo && d.getFullYear() === jr;
  });
  const dayTermine = selDay
    ? data.kalender.filter((t) => t.datum === selDay)
    : [];
  const tgM = (id) =>
    sKf((p) => ({
      ...p,
      mitarbeiter: p.mitarbeiter.includes(id)
        ? p.mitarbeiter.filter((x) => x !== id)
        : [...p.mitarbeiter, id],
    }));
  const saveTermin = async () => {
    if (!kf.titel.trim()) {
      show("Titel nötig", "error");
      return;
    }
    try {
      await actions.kalender.create({
        datum: selDay,
        baustelleId: kf.baustelleId || null,
        titel: kf.titel,
        mitarbeiter: kf.mitarbeiter,
      });
      show("Termin gespeichert");
      setSf(false);
      sKf({ titel: "", baustelleId: "", mitarbeiter: [] });
    } catch (e) {
      show("Fehler", "error");
    }
  };
  const delTermin = async (id) => {
    if (confirm("Termin löschen?")) {
      try {
        await actions.kalender.remove(id);
        show("Gelöscht");
      } catch (e) {
        show("Fehler", "error");
      }
    }
  };
  return (
    <ScreenLayout large title="Kalender" onBack={prevV ? goBack : undefined}>
      {/* Kalender Card */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
          boxShadow: CS,
        }}
      >
        {/* Monat Navigation */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <button
            onClick={pv}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.04)",
              border: "none",
              cursor: "pointer",
            }}
          >
            <ChevronLeft size={18} style={{ color: "#8e8e93" }} />
          </button>
          <span style={{ fontSize: 17, fontWeight: 600, color: "#000" }}>
            {new Date(jr, mo).toLocaleDateString("de-DE", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <button
            onClick={nx}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.04)",
              border: "none",
              cursor: "pointer",
            }}
          >
            <ChevronRight size={18} style={{ color: "#8e8e93" }} />
          </button>
        </div>
        {/* Wochentage */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((t) => (
            <div
              key={t}
              style={{
                textAlign: "center",
                fontSize: 12,
                fontWeight: 600,
                color: "#8e8e93",
                padding: "8px 0",
              }}
            >
              {t}
            </div>
          ))}
        </div>
        {/* Tage */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            rowGap: 4,
          }}
        >
          {Array.from({ length: Math.ceil((off + days) / 7) * 7 }, (_, i) => {
            const tg = i - off + 1;
            const ok = tg >= 1 && tg <= days;
            const ist =
              ok &&
              tg === h.getDate() &&
              mo === h.getMonth() &&
              jr === h.getFullYear();
            const dat = `${jr}-${String(mo + 1).padStart(2, "0")}-${String(tg).padStart(2, "0")}`;
            const hat = ok && data.kalender.some((t) => t.datum === dat);
            const sel = ok && dat === selDay;
            return (
              <button
                key={i}
                disabled={!ok}
                onClick={() => {
                  if (ok) {
                    setSelDay(dat);
                    setSf(false);
                  }
                }}
                style={{
                  width: "100%",
                  height: 44,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: ist || sel ? 600 : 400,
                  position: "relative",
                  cursor: ok ? "pointer" : "default",
                  border: "none",
                  color: !ok
                    ? "transparent"
                    : sel
                      ? "#fff"
                      : ist
                        ? "#fff"
                        : "#000",
                  background: sel ? P : ist ? PD : "transparent",
                }}
              >
                {ok && tg}
                {hat && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 5,
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      background: sel || ist ? "#fff" : P,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ausgewählter Tag */}
      {selDay && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 style={{ fontSize: 17, fontWeight: 600, color: "#000" }}>
              {fDat(selDay)}
            </h3>
          </div>

          {/* + Termin Button eigene Zeile */}
          {chef && (
            <button
              onClick={() => setSf(!sf)}
              className="w-full flex items-center justify-center gap-2"
              style={{
                padding: "12px 16px",
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 600,
                color: sf ? "#8e8e93" : "#fff",
                background: sf ? "rgba(0,0,0,0.04)" : BTN,
              }}
            >
              {sf ? (
                <>
                  <X size={16} />
                  Abbrechen
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Termin hinzufügen
                </>
              )}
            </button>
          )}

          {sf && (
            <div
              style={{
                background: "white",
                borderRadius: 12,
                padding: 16,
                boxShadow: CS,
              }}
              className="space-y-2"
            >
              <div>
                <label
                  style={{
                    fontSize: 13,
                    color: "#8e8e93",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Titel *
                </label>
                <input
                  value={kf.titel}
                  onChange={(e) => sKf({ ...kf, titel: e.target.value })}
                  placeholder="Termin / Notiz"
                  className={IC}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 13,
                    color: "#8e8e93",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Baustelle
                </label>
                <select
                  value={kf.baustelleId}
                  onChange={(e) => sKf({ ...kf, baustelleId: e.target.value })}
                  className={IC}
                >
                  <option value="">Optional</option>
                  {data.baustellen.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.kunde}
                    </option>
                  ))}
                </select>
              </div>
              {data.users.filter((u) => u.role === "mitarbeiter").length >
                0 && (
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      color: "#8e8e93",
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    Mitarbeiter
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {data.users
                      .filter((u) => u.role === "mitarbeiter")
                      .map((u) => (
                        <button
                          key={u.id}
                          onClick={() => tgM(u.id)}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 10,
                            fontSize: 12,
                            fontWeight: 500,
                            border: "none",
                            cursor: "pointer",
                            ...(kf.mitarbeiter.includes(u.id)
                              ? { background: BTN, color: "white" }
                              : { background: "#f2f2f7", color: "#8e8e93" }),
                          }}
                        >
                          {u.name}
                        </button>
                      ))}
                  </div>
                </div>
              )}
              <button
                onClick={saveTermin}
                style={{
                  width: "100%",
                  padding: "16px 24px",
                  borderRadius: 14,
                  color: "white",
                  fontWeight: 600,
                  fontSize: 17,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background: BTN,
                  boxShadow: "0 2px 8px rgba(124,58,237,0.35)",
                  border: "none",
                }}
              >
                <Save size={18} />
                Speichern
              </button>
            </div>
          )}

          {dayTermine.length === 0 && !sf && (
            <p
              style={{
                fontSize: 14,
                color: "#8e8e93",
                textAlign: "center",
                padding: "12px 0",
              }}
            >
              Keine Termine an diesem Tag
            </p>
          )}
          {dayTermine.map((t) => {
            const bs = data.baustellen.find((b) => b.id === t.baustelleId);
            return (
              <div
                key={t.id}
                style={{
                  background: "white",
                  borderRadius: 12,
                  padding: "12px 16px",
                  boxShadow: CS,
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <span
                      style={{ fontSize: 15, fontWeight: 600, color: "#000" }}
                    >
                      {t.titel}
                    </span>
                    {bs && (
                      <p style={{ fontSize: 13, color: "#3c3c43" }}>
                        {bs.kunde}
                      </p>
                    )}
                    {t.mitarbeiter?.length > 0 && (
                      <p
                        style={{ fontSize: 13, color: "#8e8e93", marginTop: 2 }}
                      >
                        {t.mitarbeiter
                          .map(
                            (id) => data.users.find((u) => u.id === id)?.name,
                          )
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                  {chef && (
                    <button
                      onClick={() => delTermin(t.id)}
                      style={{ color: "#c7c7cc", padding: 4 }}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Alle Termine des Monats wenn kein Tag gewählt */}
      {!selDay && (
        <div className="space-y-2">
          {tm.length ? (
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#000" }}>
              Termine diesen Monat
            </h3>
          ) : (
            <p
              style={{
                fontSize: 13,
                fontWeight: 400,
                color: "#8e8e93",
                textAlign: "center",
              }}
            >
              Tag antippen zum Hinzufügen
            </p>
          )}
          {tm.map((t) => {
            const bs = data.baustellen.find((b) => b.id === t.baustelleId);
            return (
              <div
                key={t.id}
                style={{
                  background: "white",
                  borderRadius: 12,
                  padding: "12px 16px",
                  boxShadow: CS,
                }}
              >
                <div className="flex justify-between">
                  <span
                    style={{ fontSize: 15, fontWeight: 600, color: "#000" }}
                  >
                    {t.titel}
                  </span>
                  <span style={{ fontSize: 13, color: "#8e8e93" }}>
                    {fK(t.datum)}
                  </span>
                </div>
                {bs && (
                  <p style={{ fontSize: 13, color: "#3c3c43" }}>{bs.kunde}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </ScreenLayout>
  );
};

// ==================== TAGESÜBERSICHT ====================
const TagView = () => {
  const { data, goBack, eName } = useContext(AppContext);
  const [dt, setDt] = useState(new Date().toISOString().split("T")[0]);
  const te = data.stundeneintraege.filter((e) => e.datum === dt);
  return (
    <ScreenLayout title="Tagesübersicht" onBack={goBack}>
      <input
        type="date"
        value={dt}
        onChange={(e) => setDt(e.target.value)}
        className={IC}
        style={{
          marginBottom: 12,
          background: "rgba(118,118,128,0.12)",
          border: "none",
        }}
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            borderRadius: 12,
            padding: 14,
            background: "white",
            boxShadow: CS,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>
            {te.length}
          </p>
          <p style={{ fontSize: 12, color: "#8e8e93" }}>Einträge</p>
        </div>
        <div
          style={{
            borderRadius: 12,
            padding: 14,
            background: "white",
            boxShadow: CS,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>
            {(() => {
              const t = te.reduce(
                (s, e) => s + parseFloat(bStd(e.beginn, e.ende, e.pause)),
                0,
              );
              return t === 0 ? "0" : t.toFixed(1);
            })()}
            h
          </p>
          <p style={{ fontSize: 12, color: "#8e8e93" }}>Gesamt</p>
        </div>
      </div>
      {te.length === 0 ? (
        <Empty icon={Clock} text="Keine Einträge an diesem Tag" />
      ) : (
        <div className="space-y-2">
          {te.map((e) => {
            const bs = data.baustellen.find((b) => b.id === e.baustelleId);
            return (
              <div
                key={e.id}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: "white",
                  boxShadow: CS,
                }}
              >
                <div
                  className="flex justify-between items-start"
                  style={{ marginBottom: 4 }}
                >
                  <div>
                    <p style={{ fontSize: 15, color: "#000" }}>{bs?.kunde}</p>
                    <p style={{ fontSize: 13, color: "#8e8e93" }}>
                      {eName(e)}
                      {e.personTyp === "sub" && (
                        <span style={{ color: "#8e8e93", marginLeft: 4 }}>
                          (Sub)
                        </span>
                      )}
                      {e.personTyp === "sonstige" && (
                        <span style={{ color: "#8e8e93", marginLeft: 4 }}>
                          (Sonstige)
                        </span>
                      )}
                    </p>
                  </div>
                  <span
                    style={{ fontWeight: 600, fontSize: 15, color: "#000" }}
                  >
                    {bStd(e.beginn, e.ende, e.pause)}h
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "#8e8e93" }}>{e.arbeit}</p>
                {e.material && (
                  <p style={{ fontSize: 13, color: "#8e8e93", marginTop: 4 }}>
                    Material: {e.material}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </ScreenLayout>
  );
};

// ==================== REGIEBERICHTE ====================
const RegView = () => {
  const { data, goBack, show, eName } = useContext(AppContext);
  const [sd, setSd] = useState(new Date().toISOString().split("T")[0]);
  const [bi, sBi] = useState(data.baustellen[0]?.id);
  const [sig, sSig] = useState(null);
  const [edits, setEdits] = useState({});
  const [showPdf, setShowPdf] = useState(false);
  const touchY = useRef(0);
  const bs = data.baustellen.find((b) => b.id === bi);
  const te = data.stundeneintraege.filter(
    (e) => e.baustelleId === bi && e.datum === sd,
  );
  const getVal = (e) => {
    const ed = edits[e.id];
    return {
      beginn: ed?.beginn ?? e.beginn,
      ende: ed?.ende ?? e.ende,
      pause: ed?.pause ?? e.pause,
      bemerkung: ed?.bemerkung ?? "",
    };
  };
  const updEdit = (id, field, val) =>
    setEdits((p) => ({
      ...p,
      [id]: { ...getVal(te.find((e) => e.id === id)), ...p[id], [field]: val },
    }));
  const isEdited = (e) => {
    const ed = edits[e.id];
    if (!ed) return false;
    return (
      ed.beginn !== e.beginn ||
      ed.ende !== e.ende ||
      ed.pause !== e.pause ||
      (ed.bemerkung && ed.bemerkung !== "")
    );
  };
  const fH = (h) => (Number.isInteger(h) ? h + "h" : h.toFixed(1) + "h");
  const gh = te.reduce((s, e) => {
    const v = getVal(e);
    return s + parseFloat(bStd(v.beginn, v.ende, v.pause));
  }, 0);
  const gf = te.reduce((s, e) => s + e.fahrtzeit, 0);
  const pdfHtml = () => {
    let h =
      "<!DOCTYPE html><html><head><title>Regiebericht</title><style>body{font-family:Arial;padding:30px;color:#333;font-size:14px}h1{font-size:18px}table{width:100%;border-collapse:collapse;margin:15px 0}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:13px}th{background:#f5f5f5}.sum{background:#f9fafb}</style></head><body>";
    h +=
      '<div style="border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:15px"><span style="background:linear-gradient(135deg,#6D28D9,#7C3AED,#8B5CF6);color:white;font-weight:bold;padding:8px 12px;border-radius:6px;display:inline-block">MA</span> <b style="margin-left:10px">MA CONSTRUCTION</b> – Regiebericht</div>';
    h +=
      "<p><b>Datum:</b> " +
      fDat(sd) +
      "</p><p><b>Baustelle:</b> " +
      escHtml(bs?.kunde) +
      "</p><p><b>Adresse:</b> " +
      escHtml(bs?.adresse) +
      "</p>";
    h +=
      "<table><tr><th>Person</th><th>Zeit</th><th>Stunden</th><th>Tätigkeit</th><th>Material</th></tr>";
    te.forEach((e) => {
      const v = getVal(e);
      const bem = v.bemerkung ? " – " + escHtml(v.bemerkung) : "";
      const std = parseFloat(bStd(v.beginn, v.ende, v.pause));
      h +=
        "<tr><td>" +
        escHtml(eName(e)) +
        (e.personTyp === "sub"
          ? " (Sub)"
          : e.personTyp === "sonstige"
            ? " (Sonstige)"
            : "") +
        "</td><td>" +
        escHtml(v.beginn) +
        "–" +
        escHtml(v.ende) +
        "</td><td>" +
        fH(std) +
        "</td><td>" +
        escHtml(e.arbeit) +
        bem +
        "</td><td>" +
        escHtml(e.material || "–") +
        "</td></tr>";
    });
    h += "</table>";
    h +=
      '<table style="margin-top:10px"><tr class="sum"><td><b>Arbeitsstunden gesamt</b></td><td style="text-align:right"><b>' +
      fH(gh) +
      "</b></td></tr>";
    if (gf > 0)
      h +=
        '<tr><td>Fahrtzeit gesamt</td><td style="text-align:right">' +
        gf +
        " Min</td></tr>";
    h += "</table>";
    h +=
      '<p style="margin-top:30px;color:#888;font-size:12px">Unterschrift Auftraggeber:</p>';
    if (sig)
      h +=
        '<img src="' +
        sig +
        '" style="height:80px;border:1px solid #d1d5db;border-radius:8px;padding:5px"/>';
    else
      h +=
        '<div style="border:2px dashed #ccc;height:60px;border-radius:8px;margin-top:5px"></div>';
    h += "</body></html>";
    return h;
  };
  const print = () => {
    setShowPdf(true);
  };
  const doPrint = () => {
    const w = window.open("", "_blank");
    if (!w) {
      show("Popup-Blocker!", "error");
      return;
    }
    w.document.write(pdfHtml());
    w.document.close();
    setTimeout(() => w.print(), 300);
    show("Druckvorschau geöffnet");
  };

  if (showPdf)
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "white",
          zIndex: 100,
          overflowY: "auto",
        }}
        onTouchStart={(e) => (touchY.current = e.touches[0].clientY)}
        onTouchEnd={(e) => {
          if (e.changedTouches[0].clientY - touchY.current > 80)
            setShowPdf(false);
        }}
      >
        <div style={{ padding: "16px 20px 32px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 40,
                height: 5,
                borderRadius: 3,
                background: "#c7c7cc",
              }}
            />
          </div>
          <div
            dangerouslySetInnerHTML={{ __html: pdfHtml() }}
            style={{ fontSize: 14 }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button
              onClick={doPrint}
              style={{
                flex: 1,
                padding: "16px 24px",
                borderRadius: 14,
                color: "white",
                fontWeight: 600,
                fontSize: 17,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: BTN,
                border: "none",
                boxShadow: "0 2px 8px rgba(124,58,237,0.35)",
              }}
            >
              <Printer size={18} />
              Drucken
            </button>
            <button
              onClick={() => setShowPdf(false)}
              style={{
                padding: "16px 20px",
                borderRadius: 14,
                color: "#8e8e93",
                fontWeight: 600,
                fontSize: 17,
                background: "rgba(0,0,0,0.05)",
                border: "none",
              }}
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <ScreenLayout title="Regieberichte" onBack={goBack}>
      <div className="space-y-2" style={{ paddingBottom: 32 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <select
            value={bi}
            onChange={(e) => sBi(e.target.value)}
            className={IC}
            style={{
              background: "rgba(118,118,128,0.12)",
              border: "none",
              borderRadius: 12,
            }}
          >
            {data.baustellen.map((b) => (
              <option key={b.id} value={b.id}>
                {b.kunde}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={sd}
            onChange={(e) => setSd(e.target.value)}
            className={IC}
            style={{
              background: "rgba(118,118,128,0.12)",
              border: "none",
              borderRadius: 12,
            }}
          />
        </div>
        {/* Vorschau */}
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 16,
            fontSize: 13,
            boxShadow: CS,
            color: "#000",
          }}
        >
          <div
            className="flex items-center gap-2"
            style={{
              borderBottom: "0.5px solid rgba(0,0,0,0.08)",
              paddingBottom: 8,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: G,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: "white", fontWeight: 700, fontSize: 11 }}>
                MA
              </span>
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 13 }}>MA CONSTRUCTION</p>
              <p style={{ color: "#8e8e93", fontSize: 12 }}>Regiebericht</p>
            </div>
          </div>
          <div className="space-y-0.5">
            {[
              ["Datum", fDat(sd)],
              ["Baustelle", bs?.kunde],
              ["Adresse", bs?.adresse],
            ].map(([l, vl]) => (
              <div key={l} className="flex justify-between">
                <span style={{ color: "#8e8e93" }}>{l}:</span>
                <span style={{ fontWeight: 600 }}>{vl}</span>
              </div>
            ))}
          </div>
          <div
            style={{
              borderTop: "0.5px solid rgba(0,0,0,0.08)",
              marginTop: 8,
              paddingTop: 8,
            }}
          >
            <p style={{ fontWeight: 600, marginBottom: 4 }}>Arbeitszeiten:</p>
            {te.length === 0 ? (
              <p style={{ color: "#8e8e93" }}>Keine Einträge</p>
            ) : (
              te.map((e) => {
                const v = getVal(e);
                const edited = isEdited(e);
                const std = parseFloat(bStd(v.beginn, v.ende, v.pause));
                return (
                  <div
                    key={e.id}
                    style={{
                      borderRadius: 8,
                      padding: 8,
                      marginBottom: 4,
                      background: "#f2f2f7",
                    }}
                  >
                    <div
                      className="flex justify-between"
                      style={{ marginBottom: 4 }}
                    >
                      <span style={{ fontWeight: 600 }}>
                        {eName(e)}
                        {e.personTyp === "sub"
                          ? " (Sub)"
                          : e.personTyp === "sonstige"
                            ? " (Sonstige)"
                            : ""}
                      </span>
                      <span style={{ fontWeight: 700 }}>{fH(std)}</span>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: 4,
                        marginBottom: 4,
                      }}
                    >
                      <input
                        value={v.beginn}
                        onChange={(x) =>
                          updEdit(e.id, "beginn", x.target.value)
                        }
                        inputMode="numeric"
                        placeholder="HH:MM"
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "none",
                          fontSize: 12,
                          background: "rgba(118,118,128,0.12)",
                          width: "100%",
                          boxSizing: "border-box",
                        }}
                      />
                      <input
                        value={v.ende}
                        onChange={(x) => updEdit(e.id, "ende", x.target.value)}
                        inputMode="numeric"
                        placeholder="HH:MM"
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "none",
                          fontSize: 12,
                          background: "rgba(118,118,128,0.12)",
                          width: "100%",
                          boxSizing: "border-box",
                        }}
                      />
                      <input
                        value={v.pause}
                        onChange={(x) =>
                          updEdit(e.id, "pause", Number(x.target.value) || 0)
                        }
                        type="number"
                        placeholder="Pause"
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "none",
                          fontSize: 12,
                          background: "rgba(118,118,128,0.12)",
                          width: "100%",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <input
                      value={v.bemerkung}
                      onChange={(x) =>
                        updEdit(e.id, "bemerkung", x.target.value)
                      }
                      placeholder="Bemerkung (optional)"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "none",
                        fontSize: 12,
                        background: "rgba(118,118,128,0.12)",
                        boxSizing: "border-box",
                        marginBottom: 4,
                      }}
                    />
                    <p style={{ color: "#3c3c43" }}>{e.arbeit}</p>
                    {e.material && (
                      <p style={{ color: "#8e8e93" }}>Material: {e.material}</p>
                    )}
                    {edited && (
                      <p
                        style={{ fontSize: 11, color: "#8e8e93", marginTop: 2 }}
                      >
                        Angepasst
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
          {te.length > 0 && (
            <div
              className="space-y-1"
              style={{
                borderTop: "0.5px solid rgba(0,0,0,0.08)",
                marginTop: 8,
                paddingTop: 8,
              }}
            >
              <div className="flex justify-between">
                <span style={{ color: "#8e8e93" }}>Stunden gesamt</span>
                <span style={{ fontWeight: 700 }}>{fH(gh)}</span>
              </div>
              {gf > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: "#8e8e93" }}>Fahrtzeit</span>
                  <span style={{ fontWeight: 600 }}>{gf} Min</span>
                </div>
              )}
            </div>
          )}
          <div
            style={{
              borderTop: "0.5px solid rgba(0,0,0,0.08)",
              marginTop: 8,
              paddingTop: 8,
            }}
          >
            <p style={{ color: "#8e8e93", marginBottom: 4 }}>
              Unterschrift Auftraggeber:
            </p>
            <SigPad
              sig={sig}
              onSave={(s) => sSig(s)}
              onClear={() => sSig(null)}
            />
          </div>
        </div>
        <button
          onClick={print}
          style={{
            width: "100%",
            padding: "16px 24px",
            borderRadius: 14,
            color: "white",
            fontWeight: 600,
            fontSize: 17,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: BTN,
            border: "none",
            boxShadow: "0 2px 8px rgba(124,58,237,0.35)",
          }}
        >
          <Printer size={18} />
          Drucken / PDF
        </button>
      </div>
    </ScreenLayout>
  );
};

// ==================== MITARBEITER ====================
const MitView = () => {
  const { data, actions, show, goBack, setEditUser, nav } =
    useContext(AppContext);
  const ma = data.users.filter((u) => u.role === "mitarbeiter");
  const [resetInfo, setResetInfo] = useState(null);
  const getStatus = (u) => {
    if (!u.isActive) return { color: RED, text: "Deaktiviert" };
    if (!u.isOnboarded) {
      const exp =
        u.onboardingPinExpiry && new Date(u.onboardingPinExpiry) < new Date();
      return exp
        ? { color: RED, text: "PIN abgelaufen" }
        : { color: "#FF9500", text: "Eingeladen" };
    }
    return { color: GREEN, text: "Aktiv" };
  };
  const resetPin = async (m) => {
    const pin = genPin();
    let username = m.username;
    if (!username) {
      const existing = data.users.map((u) => u.username).filter(Boolean);
      username = genUsername(m.name, existing);
    }
    try {
      await actions.users.resetOnboardingPin(m.id, pin, username);
      setResetInfo({ name: m.name, username, pin });
      show("Neuer PIN erstellt");
    } catch (e) {
      show("Fehler", "error");
    }
  };
  const toggleActive = async (m) => {
    try {
      await actions.users.toggleActive(m.id, !m.isActive);
      show(m.isActive ? "Deaktiviert" : "Aktiviert");
    } catch (e) {
      show("Fehler", "error");
    }
  };
  const del = async (id) => {
    if (confirm("Endgültig löschen?")) {
      try {
        await actions.users.remove(id);
        show("Gelöscht");
      } catch (e) {
        show("Fehler", "error");
      }
    }
  };
  const shareWA = (info) => {
    const text = `Hallo ${info.name}!\n\nDein Zugang zur MA Construction App:\n\nBenutzername: ${info.username}\nEinladungs-PIN: ${info.pin}\n\nGültig für 7 Tage.\n\nApp: ${window.location.origin}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };
  return (
    <ScreenLayout
      title="Handwerker"
      onBack={goBack}
      right={
        <button
          onClick={() => {
            setEditUser(null);
            nav("mitf");
          }}
          style={{
            padding: 8,
            borderRadius: 10,
            color: "white",
            background: BTN,
            border: "none",
            cursor: "pointer",
          }}
        >
          <Plus size={18} />
        </button>
      }
    >
      {resetInfo && (
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 16,
            boxShadow: CS,
            marginBottom: 12,
          }}
        >
          <div
            className="flex items-center justify-between"
            style={{ marginBottom: 8 }}
          >
            <p style={{ fontSize: 15, fontWeight: 600, color: "#000" }}>
              Neuer Einladungs-PIN
            </p>
            <button
              onClick={() => setResetInfo(null)}
              style={{
                background: "none",
                border: "none",
                color: "#8e8e93",
                padding: 4,
              }}
            >
              <X size={16} />
            </button>
          </div>
          <div
            style={{
              background: "#f2f2f7",
              borderRadius: 10,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <p style={{ fontSize: 13, color: "#8e8e93" }}>Benutzername</p>
            <p
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: "#000",
                marginBottom: 8,
              }}
            >
              {resetInfo.username}
            </p>
            <p style={{ fontSize: 13, color: "#8e8e93" }}>PIN</p>
            <p
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#000",
                letterSpacing: 4,
              }}
            >
              {resetInfo.pin}
            </p>
          </div>
          <button
            onClick={() => shareWA(resetInfo)}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 12,
              color: "white",
              fontWeight: 600,
              fontSize: 15,
              background: "#25D366",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            Per WhatsApp senden
          </button>
        </div>
      )}
      <div className="space-y-2">
        {ma.length === 0 ? (
          <Empty icon={Users} text="Noch keine Handwerker angelegt" />
        ) : (
          ma.map((m) => {
            const bs = data.baustellen.filter((b) =>
              b.mitarbeiter.includes(m.id),
            );
            const st = getStatus(m);
            return (
              <div
                key={m.id}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: "white",
                  boxShadow: CS,
                  opacity: m.isActive ? 1 : 0.6,
                }}
              >
                <div
                  className="flex items-center gap-3"
                  style={{ marginBottom: 8 }}
                >
                  <div style={{ position: "relative" }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: "rgba(0,0,0,0.06)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <User size={16} style={{ color: "#3c3c43" }} />
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        bottom: -2,
                        right: -2,
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        background: st.color,
                        border: "2px solid white",
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <p style={{ fontSize: 15, color: "#000" }}>{m.name}</p>
                    <p style={{ fontSize: 13, color: "#8e8e93" }}>
                      {m.username ? `@${m.username}` : ""}
                      {m.username ? " · " : ""}
                      {fE(m.stundensatz || 45)}/h
                    </p>
                  </div>
                  <Bdg text={st.text} color={st.color} />
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 4,
                    marginBottom: 8,
                  }}
                >
                  {bs.length === 0 ? (
                    <span style={{ fontSize: 13, color: "#8e8e93" }}>
                      Keine Baustellen
                    </span>
                  ) : (
                    bs.map((b) => <Bdg key={b.id} text={b.kunde} />)
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    borderTop: "0.5px solid rgba(0,0,0,0.08)",
                    paddingTop: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    onClick={() => {
                      setEditUser(m);
                      nav("mitf");
                    }}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#3c3c43",
                      background: "rgba(0,0,0,0.06)",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                    }}
                  >
                    <Edit3 size={14} />
                    Bearbeiten
                  </button>
                  {m.isActive && (
                    <button
                      onClick={() => resetPin(m)}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#FF9500",
                        background: "#FF950012",
                        border: "none",
                      }}
                    >
                      PIN zurücksetzen
                    </button>
                  )}
                  <button
                    onClick={() => toggleActive(m)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      color: m.isActive ? RED : GREEN,
                      background: m.isActive ? `${RED}12` : `${GREEN}12`,
                      border: "none",
                    }}
                  >
                    {m.isActive ? "Deaktivieren" : "Aktivieren"}
                  </button>
                  <button
                    onClick={() => del(m.id)}
                    style={{
                      padding: "8px",
                      borderRadius: 10,
                      color: "#c7c7cc",
                      background: "none",
                      border: "none",
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </ScreenLayout>
  );
};

const MitForm = () => {
  const {
    editUser,
    setEditUser,
    data,
    actions,
    show,
    goBack,
    setMitSummary,
    mitSummary,
  } = useContext(AppContext);
  const ex = editUser ? data.users.find((u) => u.id === editUser.id) : null;
  const [n, setN] = useState(ex?.name || "");
  const [ss, setSs] = useState(String(ex?.stundensatz || 45));
  const [un, setUn] = useState(ex?.username || "");
  useEffect(() => {
    if (ex || !n.trim()) {
      if (!ex) setUn("");
      return;
    }
    const existing = data.users.map((u) => u.username).filter(Boolean);
    setUn(genUsername(n.trim(), existing));
  }, [n]);
  const save = async () => {
    if (!n.trim()) {
      show("Name nötig", "error");
      return;
    }
    if (!ex && !un.trim()) {
      show("Benutzername nötig", "error");
      return;
    }
    try {
      if (ex) {
        await actions.users.update(ex.id, {
          name: n.trim(),
          stundensatz: Number(ss) || 45,
        });
        show("Gespeichert");
        setEditUser(null);
        goBack();
      } else {
        const pin = genPin();
        await actions.users.createForOnboarding({
          name: n.trim(),
          username: un.trim().toLowerCase(),
          stundensatz: Number(ss) || 45,
          onboardingPin: pin,
        });
        setMitSummary({
          name: n.trim(),
          username: un.trim().toLowerCase(),
          pin,
        });
      }
    } catch (e) {
      show(
        e.message?.includes("duplicate") || e.code === "23505"
          ? "Benutzername bereits vergeben"
          : "Fehler beim Speichern",
        "error",
      );
    }
  };
  const closeSummary = () => {
    setMitSummary(null);
    setEditUser(null);
    goBack();
  };
  const shareWA = () => {
    const text = `Hallo ${mitSummary.name}!\n\nDein Zugang zur MA Construction App:\n\nBenutzername: ${mitSummary.username}\nEinmal-PIN: ${mitSummary.pin}\n\nGültig für 7 Tage.\n\nApp: ${window.location.origin}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  if (mitSummary)
    return (
      <ScreenLayout title="Mitarbeiter angelegt" onBack={closeSummary}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: `${GREEN}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            <CheckCircle size={28} style={{ color: GREEN }} />
          </div>
          <p style={{ fontSize: 20, fontWeight: 600, color: "#000" }}>
            {mitSummary.name}
          </p>
          <p style={{ fontSize: 15, color: "#8e8e93" }}>
            wurde erfolgreich angelegt
          </p>
        </div>
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 16,
            boxShadow: CS,
            marginBottom: 16,
          }}
        >
          <div style={{ background: "#f2f2f7", borderRadius: 10, padding: 16 }}>
            <p style={{ fontSize: 13, color: "#8e8e93", marginBottom: 4 }}>
              Benutzername
            </p>
            <p
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: "#000",
                marginBottom: 12,
              }}
            >
              {mitSummary.username}
            </p>
            <p style={{ fontSize: 13, color: "#8e8e93", marginBottom: 4 }}>
              Einmal-PIN
            </p>
            <p
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#000",
                letterSpacing: 4,
              }}
            >
              {mitSummary.pin}
            </p>
            <p style={{ fontSize: 12, color: "#8e8e93", marginTop: 8 }}>
              Gültig für 7 Tage
            </p>
          </div>
        </div>
        <button
          onClick={shareWA}
          style={{
            width: "100%",
            padding: "16px 24px",
            borderRadius: 14,
            color: "white",
            fontWeight: 600,
            fontSize: 17,
            background: "#25D366",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginBottom: 12,
            boxShadow: "0 2px 8px rgba(37,211,102,0.35)",
          }}
        >
          Per WhatsApp senden
        </button>
        <button
          onClick={closeSummary}
          style={{
            width: "100%",
            padding: 12,
            fontSize: 15,
            color: "#8e8e93",
            background: "none",
            border: "none",
          }}
        >
          Fertig
        </button>
      </ScreenLayout>
    );

  return (
    <ScreenLayout
      title={ex ? "Handwerker bearbeiten" : "Neuer Handwerker"}
      onBack={() => {
        setEditUser(null);
        goBack();
      }}
    >
      <div className="space-y-2">
        <div
          style={{
            background: "white",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: CS,
            marginBottom: 16,
          }}
        >
          <div style={{ padding: "12px 16px" }}>
            <label
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#8e8e93",
                textTransform: "uppercase",
                letterSpacing: 0.4,
                display: "block",
                marginBottom: 6,
              }}
            >
              Name *
            </label>
            <input
              value={n}
              onChange={(e) => setN(e.target.value)}
              placeholder="Vor- und Nachname"
              className={IC}
              style={{ background: "rgba(118,118,128,0.12)", border: "none" }}
            />
          </div>
          {!ex && (
            <div
              style={{
                borderTop: "0.5px solid rgba(0,0,0,0.08)",
                padding: "12px 16px",
              }}
            >
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#8e8e93",
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Benutzername *
              </label>
              <input
                value={un}
                onChange={(e) =>
                  setUn(e.target.value.toLowerCase().replace(/[^a-z0-9.]/g, ""))
                }
                placeholder="wird automatisch erstellt"
                className={IC}
                style={{ background: "rgba(118,118,128,0.12)", border: "none" }}
                autoCapitalize="none"
              />
              <p style={{ fontSize: 12, color: "#8e8e93", marginTop: 4 }}>
                Wird automatisch aus dem Namen erstellt
              </p>
            </div>
          )}
          <div
            style={{
              borderTop: "0.5px solid rgba(0,0,0,0.08)",
              padding: "12px 16px",
            }}
          >
            <label
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#8e8e93",
                textTransform: "uppercase",
                letterSpacing: 0.4,
                display: "block",
                marginBottom: 6,
              }}
            >
              Stundensatz (€/h)
            </label>
            <input
              type="number"
              value={ss}
              onChange={(e) => setSs(e.target.value)}
              placeholder="45"
              className={IC}
              style={{ background: "rgba(118,118,128,0.12)", border: "none" }}
            />
          </div>
        </div>
        {!ex && (
          <div
            style={{
              background: "rgba(0,0,0,0.04)",
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
            }}
          >
            <p style={{ fontSize: 13, color: "#3c3c43", fontWeight: 500 }}>
              Nach dem Anlegen erhältst du einen Einladungs-PIN zum Versenden
              per WhatsApp.
            </p>
          </div>
        )}
        <button
          onClick={save}
          style={{
            width: "100%",
            padding: "16px 24px",
            borderRadius: 14,
            color: "white",
            fontWeight: 600,
            fontSize: 17,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: BTN,
            boxShadow: "0 2px 8px rgba(124,58,237,0.35)",
            border: "none",
          }}
        >
          {ex ? (
            <>
              <Save size={18} />
              Speichern
            </>
          ) : (
            <>
              <UserPlus size={18} />
              Anlegen
            </>
          )}
        </button>
      </div>
    </ScreenLayout>
  );
};

// ==================== SUBUNTERNEHMER ====================
const SubView = () => {
  const { data, actions, show, goBack } = useContext(AppContext);
  const [sf, setSf] = useState(false);
  const [fn, setFn] = useState("");
  const [fg, setFg] = useState("");
  const [ft, setFt] = useState("");
  const add = async () => {
    if (!fn.trim()) {
      show("Name nötig", "error");
      return;
    }
    try {
      await actions.subunternehmer.create({
        name: fn.trim(),
        gewerk: fg,
        telefon: ft,
      });
      show("Angelegt");
      setSf(false);
      setFn("");
      setFg("");
      setFt("");
    } catch (e) {
      show("Fehler", "error");
    }
  };
  const del = async (id) => {
    if (confirm("Löschen?")) {
      try {
        await actions.subunternehmer.remove(id);
        show("Gelöscht");
      } catch (e) {
        show("Fehler", "error");
      }
    }
  };
  return (
    <ScreenLayout
      title="Subunternehmer"
      onBack={goBack}
      right={
        <button
          onClick={() => setSf(!sf)}
          style={{
            padding: 8,
            borderRadius: 10,
            background: sf ? "rgba(0,0,0,0.05)" : BTN,
            border: "none",
            cursor: "pointer",
          }}
        >
          {sf ? (
            <X size={18} style={{ color: "#3c3c43" }} />
          ) : (
            <Plus size={18} style={{ color: "white" }} />
          )}
        </button>
      }
    >
      {sf && (
        <div
          className="space-y-2"
          style={{
            paddingBottom: 16,
            borderBottom: "0.5px solid rgba(0,0,0,0.08)",
          }}
        >
          <input
            value={fn}
            onChange={(e) => setFn(e.target.value)}
            placeholder="Firma *"
            className={IC}
            style={{ background: "rgba(118,118,128,0.12)", border: "none" }}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 8,
            }}
          >
            <input
              value={fg}
              onChange={(e) => setFg(e.target.value)}
              placeholder="Gewerk"
              className={IC}
              style={{ background: "rgba(118,118,128,0.12)", border: "none" }}
            />
            <input
              value={ft}
              onChange={(e) => setFt(e.target.value)}
              placeholder="Telefon"
              className={IC}
              style={{ background: "rgba(118,118,128,0.12)", border: "none" }}
            />
          </div>
          <button
            onClick={add}
            style={{
              width: "100%",
              padding: "16px 24px",
              borderRadius: 14,
              color: "white",
              fontWeight: 600,
              fontSize: 17,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: BTN,
              boxShadow: "0 2px 8px rgba(124,58,237,0.35)",
              border: "none",
            }}
          >
            <Plus size={18} />
            Anlegen
          </button>
        </div>
      )}
      <div className="space-y-2">
        {data.subunternehmer.length === 0 ? (
          <Empty
            icon={Briefcase}
            text="Tippe auf + um einen Subunternehmer anzulegen"
          />
        ) : (
          data.subunternehmer.map((s) => {
            const bs = data.baustellen.filter((b) =>
              (b.subunternehmer || []).includes(s.id),
            );
            return (
              <div
                key={s.id}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: "white",
                  boxShadow: CS,
                }}
              >
                <div
                  className="flex items-center gap-3"
                  style={{ marginBottom: 8 }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "rgba(0,0,0,0.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Briefcase size={16} style={{ color: "#3c3c43" }} />
                  </div>
                  <div className="flex-1">
                    <p style={{ fontSize: 15, color: "#000" }}>{s.name}</p>
                    <p style={{ fontSize: 13, color: "#8e8e93" }}>{s.gewerk}</p>
                  </div>
                  <button
                    onClick={() => del(s.id)}
                    style={{
                      padding: 8,
                      color: "#c7c7cc",
                      background: "none",
                      border: "none",
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {s.telefon && (
                  <div
                    className="flex items-center gap-1"
                    style={{ fontSize: 13, color: "#8e8e93", marginBottom: 4 }}
                  >
                    <Phone size={11} />
                    {s.telefon}
                  </div>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {bs.length === 0 ? (
                    <span style={{ fontSize: 13, color: "#8e8e93" }}>
                      Keine Baustellen
                    </span>
                  ) : (
                    bs.map((b) => <Bdg key={b.id} text={b.kunde} />)
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </ScreenLayout>
  );
};

// ==================== KOSTENÜBERSICHT ====================
const KostenView = () => {
  const { data, actions, show, goBack, cu, addN } = useContext(AppContext);
  const [selBs, setSelBs] = useState(null);
  const [sf, setSf] = useState(false);
  const [fl, setFl] = useState("alle");
  const [kf, sKf] = useState({
    baustelleId: "",
    kategorie: "material",
    beschreibung: "",
    betrag: "",
    datum: new Date().toISOString().split("T")[0],
  });
  const katLabels = {
    lohn: "Lohnkosten",
    material: "Material",
    subunternehmer: "Subunternehmer",
    sonstiges: "Sonstiges",
  };
  const katColors = {
    lohn: "#007AFF",
    material: "#FF9500",
    subunternehmer: "#5856D6",
    sonstiges: "#8e8e93",
  };
  const fH = (h) => (Number.isInteger(h) ? h + "h" : h.toFixed(1) + "h");

  // Lohnkosten berechnen pro Baustelle
  const calcLohn = (bid) => {
    const ei = data.stundeneintraege.filter(
      (e) =>
        e.baustelleId === bid &&
        (!e.personTyp || e.personTyp === "mitarbeiter"),
    );
    return ei.reduce((s, e) => {
      const u = data.users.find((x) => x.id === e.mitarbeiterId);
      const std = parseFloat(bStd(e.beginn, e.ende, e.pause));
      return s + std * (u?.stundensatz || 45);
    }, 0);
  };

  // Gesamtkosten pro Baustelle
  const calcTotal = (bid) => {
    const lohn = calcLohn(bid);
    const extra = data.kosten
      .filter((k) => k.baustelleId === bid)
      .reduce((s, k) => s + k.betrag, 0);
    return lohn + extra;
  };

  // Kosten nach Kategorie pro Baustelle
  const calcKat = (bid, kat) => {
    if (kat === "lohn") return calcLohn(bid);
    return data.kosten
      .filter((k) => k.baustelleId === bid && k.kategorie === kat)
      .reduce((s, k) => s + k.betrag, 0);
  };

  // Gesamtkosten aller Baustellen
  const totalAll = data.baustellen.reduce((s, b) => s + calcTotal(b.id), 0);
  const budgetAll = data.baustellen.reduce((s, b) => s + (b.budget || 0), 0);

  const saveKost = async () => {
    if (!kf.baustelleId || !kf.beschreibung.trim() || !kf.betrag) {
      show("Alle Felder ausfüllen", "error");
      return;
    }
    try {
      await actions.kosten.create({
        baustelleId: kf.baustelleId,
        kategorie: kf.kategorie,
        beschreibung: kf.beschreibung,
        betrag: Number(kf.betrag),
        datum: kf.datum,
        ersteller: cu.id,
      });
      addN(
        "info",
        `Kosten: ${fE(Number(kf.betrag))} – ${kf.beschreibung}`,
        kf.baustelleId,
      );
      show("Kosten erfasst");
      setSf(false);
      sKf({ ...kf, beschreibung: "", betrag: "" });
    } catch (e) {
      show("Fehler", "error");
    }
  };

  const exportCSV = () => {
    const rows = [
      ["Baustelle", "Kategorie", "Beschreibung", "Betrag", "Datum"],
    ];
    data.baustellen.forEach((b) => {
      // Lohnkosten pro Mitarbeiter
      const ei = data.stundeneintraege.filter(
        (e) =>
          e.baustelleId === b.id &&
          (!e.personTyp || e.personTyp === "mitarbeiter"),
      );
      const byUser = {};
      ei.forEach((e) => {
        if (!byUser[e.mitarbeiterId]) byUser[e.mitarbeiterId] = 0;
        byUser[e.mitarbeiterId] += parseFloat(bStd(e.beginn, e.ende, e.pause));
      });
      Object.entries(byUser).forEach(([uid, std]) => {
        const u = data.users.find((x) => x.id === uid);
        rows.push([
          b.kunde,
          "Lohn",
          `${u?.name || "?"} (${std.toFixed(1)}h × ${fE(u?.stundensatz || 45)})`,
          ((u?.stundensatz || 45) * std).toFixed(2),
          "",
        ]);
      });
      // Extra Kosten
      data.kosten
        .filter((k) => k.baustelleId === b.id)
        .forEach((k) =>
          rows.push([
            b.kunde,
            katLabels[k.kategorie],
            k.beschreibung,
            k.betrag.toFixed(2),
            k.datum,
          ]),
        );
      // Budget Zeile
      rows.push([b.kunde, "BUDGET", "Gesamt", b.budget || 0, ""]);
      rows.push([b.kunde, "GESAMT", "", calcTotal(b.id).toFixed(2), ""]);
      rows.push(["", "", "", "", ""]);
    });
    const csv = "\uFEFF" + rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Kostenübersicht_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    show("CSV exportiert");
  };

  let bsList = data.baustellen;
  if (fl !== "alle") bsList = bsList.filter((b) => b.status === fl);

  // Detail-Ansicht einer Baustelle
  if (selBs) {
    const b = selBs;
    const total = calcTotal(b.id);
    const budget = b.budget || 0;
    const pct =
      budget > 0 ? Math.min(100, Math.round((total / budget) * 100)) : 0;
    const isOver = budget > 0 && total > budget;
    const ei = data.stundeneintraege.filter(
      (e) =>
        e.baustelleId === b.id &&
        (!e.personTyp || e.personTyp === "mitarbeiter"),
    );
    const bsKosten = data.kosten.filter((k) => k.baustelleId === b.id);

    // Lohnkosten nach Mitarbeiter
    const byUser = {};
    ei.forEach((e) => {
      const uid = e.mitarbeiterId;
      if (!byUser[uid]) byUser[uid] = { std: 0, kosten: 0 };
      const std = parseFloat(bStd(e.beginn, e.ende, e.pause));
      const u = data.users.find((x) => x.id === uid);
      byUser[uid].std += std;
      byUser[uid].kosten += std * (u?.stundensatz || 45);
    });

    const delKost = async (id) => {
      if (confirm("Kosten löschen?")) {
        try {
          await actions.kosten.remove(id);
          show("Gelöscht");
        } catch (e) {
          show("Fehler", "error");
        }
      }
    };

    return (
      <ScreenLayout title={`Kosten: ${b.kunde}`} onBack={() => setSelBs(null)}>
        <div className="space-y-2">
          {/* Budget Übersicht */}
          <div
            style={{
              borderRadius: 12,
              padding: 16,
              background: isOver ? `${RED}08` : "rgba(0,0,0,0.02)",
              boxShadow: CS,
            }}
          >
            <div
              className="flex justify-between items-start"
              style={{ marginBottom: 8 }}
            >
              <div>
                <p style={{ fontSize: 12, color: "#8e8e93" }}>Gesamtkosten</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>
                  {fE(total)}
                </p>
              </div>
              {budget > 0 && (
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 12, color: "#8e8e93" }}>Budget</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: "#000" }}>
                    {fE(budget)}
                  </p>
                </div>
              )}
            </div>
            {budget > 0 && (
              <div>
                <PBar value={pct} />
                <div className="flex justify-between" style={{ marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: isOver ? RED : P }}>
                    {pct}% verbraucht
                  </span>
                  <span style={{ fontSize: 12, color: isOver ? RED : GREEN }}>
                    {isOver
                      ? `${fE(total - budget)} über Budget`
                      : `${fE(budget - total)} übrig`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Stunden Zusammenfassung */}
          {ei.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
              }}
            >
              <div
                style={{
                  borderRadius: 12,
                  padding: 14,
                  background: "white",
                  boxShadow: CS,
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>
                  {(() => {
                    const h = ei.reduce(
                      (s, e) => s + parseFloat(bStd(e.beginn, e.ende, e.pause)),
                      0,
                    );
                    return Number.isInteger(h) ? h : h.toFixed(1);
                  })()}
                </p>
                <p style={{ fontSize: 12, color: "#8e8e93" }}>Stunden</p>
              </div>
              <div
                style={{
                  borderRadius: 12,
                  padding: 14,
                  background: "white",
                  boxShadow: CS,
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>
                  {Object.keys(byUser).length}
                </p>
                <p style={{ fontSize: 12, color: "#8e8e93" }}>Mitarbeiter</p>
              </div>
              <div
                style={{
                  borderRadius: 12,
                  padding: 14,
                  background: "white",
                  boxShadow: CS,
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>
                  {fE(calcLohn(b.id))}
                </p>
                <p style={{ fontSize: 12, color: "#8e8e93" }}>Lohnkosten</p>
              </div>
            </div>
          )}

          {/* Kategorie-Aufteilung */}
          <div
            style={{
              borderRadius: 12,
              background: "white",
              padding: 16,
              boxShadow: CS,
            }}
          >
            <p
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "#000",
                marginBottom: 8,
              }}
            >
              Kostenaufteilung
            </p>
            <div className="space-y-2">
              {["lohn", "material", "subunternehmer", "sonstiges"].map(
                (kat) => {
                  const val = calcKat(b.id, kat);
                  const katPct =
                    total > 0 ? Math.round((val / total) * 100) : 0;
                  return val > 0 || kat === "lohn" ? (
                    <div key={kat}>
                      <div
                        className="flex justify-between items-center"
                        style={{ marginBottom: 4 }}
                      >
                        <div className="flex items-center" style={{ gap: 8 }}>
                          <div
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 5,
                              background: katColors[kat],
                            }}
                          />
                          <span style={{ fontSize: 13, color: "#3c3c43" }}>
                            {katLabels[kat]}
                          </span>
                        </div>
                        <div className="flex items-center" style={{ gap: 8 }}>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "#000",
                            }}
                          >
                            {fE(val)}
                          </span>
                          <span style={{ fontSize: 12, color: "#8e8e93" }}>
                            {katPct}%
                          </span>
                        </div>
                      </div>
                      <PBar value={katPct} small color={katColors[kat]} />
                    </div>
                  ) : null;
                },
              )}
            </div>
          </div>

          {/* Lohnkosten Detail */}
          {Object.keys(byUser).length > 0 && (
            <div
              style={{
                borderRadius: 12,
                background: "white",
                padding: 16,
                boxShadow: CS,
              }}
            >
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#000",
                  marginBottom: 8,
                }}
              >
                Lohnkosten pro Mitarbeiter
              </p>
              <div className="space-y-1.5">
                {Object.entries(byUser).map(([uid, d]) => {
                  const u = data.users.find((x) => x.id === uid);
                  const ue = ei.filter((e) => e.mitarbeiterId === uid);
                  const tage = [...new Set(ue.map((e) => e.datum))].length;
                  return (
                    <div
                      key={uid}
                      style={{
                        padding: 10,
                        borderRadius: 10,
                        background: "#f2f2f7",
                        fontSize: 13,
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <p style={{ color: "#000", fontWeight: 600 }}>
                          {u?.name || "?"}
                        </p>
                        <span style={{ fontWeight: 700, color: "#000" }}>
                          {fE(d.kosten)}
                        </span>
                      </div>
                      <div
                        className="flex items-center"
                        style={{ gap: 12, marginTop: 2, color: "#8e8e93" }}
                      >
                        <span>
                          {fH(d.std)} an {tage} {tage === 1 ? "Tag" : "Tagen"}
                        </span>
                        <span>×</span>
                        <span>{fE(u?.stundensatz || 45)}/h</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div
                className="flex justify-between items-center"
                style={{
                  fontSize: 13,
                  marginTop: 8,
                  paddingTop: 8,
                  borderTop: "0.5px solid rgba(0,0,0,0.08)",
                }}
              >
                <span style={{ color: "#8e8e93", fontWeight: 600 }}>
                  Lohn gesamt
                </span>
                <span style={{ color: "#000", fontWeight: 700 }}>
                  {fE(Object.values(byUser).reduce((s, d) => s + d.kosten, 0))}
                </span>
              </div>
            </div>
          )}

          {/* Einzelposten */}
          <div
            style={{
              borderRadius: 12,
              background: "white",
              padding: 16,
              boxShadow: CS,
            }}
          >
            <div
              className="flex justify-between items-center"
              style={{ marginBottom: 8 }}
            >
              <p style={{ fontSize: 15, fontWeight: 600, color: "#000" }}>
                Kosteneinträge ({bsKosten.length})
              </p>
              <button
                onClick={() => {
                  sKf({ ...kf, baustelleId: String(b.id) });
                  setSf(true);
                }}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  fontSize: 13,
                  color: "white",
                  background: BTN,
                  border: "none",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Plus size={14} />
                Kosten
              </button>
            </div>
            {bsKosten.length === 0 ? (
              <p style={{ fontSize: 13, color: "#8e8e93" }}>
                Keine manuellen Kosten eingetragen
              </p>
            ) : (
              [...bsKosten].reverse().map((k) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between"
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    background: "#f2f2f7",
                    marginBottom: 4,
                    fontSize: 13,
                  }}
                >
                  <div className="flex items-center flex-1" style={{ gap: 8 }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        background: katColors[k.kategorie],
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <p style={{ color: "#000" }}>{k.beschreibung}</p>
                      <p style={{ color: "#8e8e93" }}>
                        {katLabels[k.kategorie]} · {fK(k.datum)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center" style={{ gap: 12 }}>
                    <span style={{ fontWeight: 600, color: "#000" }}>
                      {fE(k.betrag)}
                    </span>
                    <button
                      onClick={() => delKost(k.id)}
                      style={{
                        padding: 8,
                        color: "#c7c7cc",
                        background: "none",
                        border: "none",
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </ScreenLayout>
    );
  }

  // Hauptübersicht
  return (
    <ScreenLayout
      title="Kostenübersicht"
      onBack={goBack}
      right={
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setSf(!sf)}
            style={{
              padding: 8,
              borderRadius: 10,
              background: sf ? "rgba(0,0,0,0.05)" : BTN,
              border: "none",
            }}
          >
            {sf ? (
              <X size={18} style={{ color: "#3c3c43" }} />
            ) : (
              <Plus size={18} style={{ color: "white" }} />
            )}
          </button>
          <button
            onClick={exportCSV}
            style={{
              padding: 8,
              borderRadius: 10,
              color: "#8e8e93",
              background: "rgba(0,0,0,0.05)",
              border: "none",
            }}
          >
            <Download size={18} />
          </button>
        </div>
      }
    >
      {/* Neuer Kosteneintrag */}
      {sf && (
        <div
          className="space-y-2"
          style={{
            paddingBottom: 16,
            borderBottom: "0.5px solid rgba(0,0,0,0.08)",
          }}
        >
          <select
            value={kf.baustelleId}
            onChange={(e) => sKf({ ...kf, baustelleId: e.target.value })}
            className={IC}
            style={{ background: "rgba(118,118,128,0.12)", border: "none" }}
          >
            <option value="">Baustelle *</option>
            {data.baustellen.map((b) => (
              <option key={b.id} value={b.id}>
                {b.kunde}
              </option>
            ))}
          </select>
          <div style={{ display: "flex", gap: 8 }}>
            {["material", "subunternehmer", "sonstiges"].map((k) => (
              <button
                key={k}
                onClick={() => sKf({ ...kf, kategorie: k })}
                className="flex-1"
                style={{
                  padding: "12px 0",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  minHeight: 44,
                  border: "none",
                  color: kf.kategorie === k ? "white" : "#3c3c43",
                  background: kf.kategorie === k ? katColors[k] : "white",
                  boxShadow: kf.kategorie === k ? "none" : CS,
                }}
              >
                {katLabels[k]}
              </button>
            ))}
          </div>
          <input
            value={kf.beschreibung}
            onChange={(e) => sKf({ ...kf, beschreibung: e.target.value })}
            placeholder="Beschreibung *"
            className={IC}
            style={{ background: "rgba(118,118,128,0.12)", border: "none" }}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 8,
            }}
          >
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#8e8e93",
                  fontSize: 15,
                }}
              >
                €
              </span>
              <input
                type="number"
                value={kf.betrag}
                onChange={(e) => sKf({ ...kf, betrag: e.target.value })}
                placeholder="Betrag *"
                className={IC}
                style={{ background: "rgba(118,118,128,0.12)", border: "none" }}
              />
            </div>
            <input
              type="date"
              value={kf.datum}
              onChange={(e) => sKf({ ...kf, datum: e.target.value })}
              className={IC}
              style={{ background: "rgba(118,118,128,0.12)", border: "none" }}
            />
          </div>
          <button
            onClick={saveKost}
            style={{
              width: "100%",
              padding: "16px 24px",
              borderRadius: 14,
              color: "white",
              fontWeight: 600,
              fontSize: 17,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: BTN,
              boxShadow: "0 2px 8px rgba(124,58,237,0.35)",
              border: "none",
            }}
          >
            <Receipt size={18} />
            Kosten erfassen
          </button>
        </div>
      )}

      {/* Gesamtübersicht */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            borderRadius: 12,
            padding: 14,
            background: "white",
            boxShadow: CS,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>
            {fE(totalAll)}
          </p>
          <p style={{ fontSize: 12, color: "#8e8e93", marginTop: 4 }}>
            Gesamtkosten
          </p>
        </div>
        <div
          style={{
            borderRadius: 12,
            padding: 14,
            background: "white",
            boxShadow: CS,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>
            {budgetAll > 0 ? fE(budgetAll) : "–"}
          </p>
          <p style={{ fontSize: 12, color: "#8e8e93", marginTop: 4 }}>Budget</p>
        </div>
        <div
          style={{
            borderRadius: 12,
            padding: 14,
            background: "white",
            boxShadow: CS,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>
            {fH(
              data.stundeneintraege.reduce(
                (s, e) => s + parseFloat(bStd(e.beginn, e.ende, e.pause)),
                0,
              ),
            )}
          </p>
          <p style={{ fontSize: 12, color: "#8e8e93", marginTop: 4 }}>
            Stunden
          </p>
        </div>
      </div>

      {/* Filter */}
      <div
        style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 12 }}
      >
        {["alle", "aktiv", "geplant", "fertig", "abgerechnet"].map((s) => (
          <button
            key={s}
            onClick={() => setFl(s)}
            style={{
              padding: "8px 16px",
              borderRadius: 100,
              fontSize: 13,
              fontWeight: 500,
              whiteSpace: "nowrap",
              border: "none",
              cursor: "pointer",
              ...(fl === s
                ? { background: BTN, color: "white" }
                : { background: "white", boxShadow: CS, color: "#3c3c43" }),
            }}
          >
            {s === "alle" ? "Alle" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Baustellen-Liste */}
      <div className="space-y-2" style={{ paddingTop: 8 }}>
        {bsList.length === 0 ? (
          <Empty icon={Receipt} text="Keine Baustellen vorhanden" />
        ) : (
          bsList.map((b) => {
            const total = calcTotal(b.id);
            const budget = b.budget || 0;
            const pct =
              budget > 0
                ? Math.min(100, Math.round((total / budget) * 100))
                : 0;
            const isOver = budget > 0 && total > budget;
            const ei = data.stundeneintraege.filter(
              (e) =>
                e.baustelleId === b.id &&
                (!e.personTyp || e.personTyp === "mitarbeiter"),
            );
            const totalStd = ei.reduce(
              (s, e) => s + parseFloat(bStd(e.beginn, e.ende, e.pause)),
              0,
            );
            const lohn = calcLohn(b.id);
            const extraK = data.kosten
              .filter((k) => k.baustelleId === b.id)
              .reduce((s, k) => s + k.betrag, 0);
            const byU = {};
            ei.forEach((e) => {
              const uid = e.mitarbeiterId;
              if (!byU[uid]) byU[uid] = 0;
              byU[uid] += parseFloat(bStd(e.beginn, e.ende, e.pause));
            });
            return (
              <button
                key={b.id}
                onClick={() => setSelBs(b)}
                className="w-full text-left"
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: "white",
                  boxShadow: CS,
                  border: "none",
                }}
              >
                <div
                  className="flex justify-between items-start"
                  style={{ marginBottom: 4 }}
                >
                  <p style={{ fontSize: 15, fontWeight: 600, color: "#000" }}>
                    {b.kunde}
                  </p>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: isOver ? RED : "#000",
                    }}
                  >
                    {fE(total)}
                  </span>
                </div>
                {budget > 0 && (
                  <div>
                    <div
                      className="flex justify-between"
                      style={{ fontSize: 13, marginBottom: 4 }}
                    >
                      <span style={{ color: "#8e8e93" }}>
                        Budget: {fE(budget)}
                      </span>
                      <span style={{ color: isOver ? RED : GREEN }}>
                        {pct}%
                      </span>
                    </div>
                    <PBar
                      value={Math.min(pct, 100)}
                      small
                      color={isOver ? RED : undefined}
                    />
                  </div>
                )}
                {!budget && (
                  <p style={{ fontSize: 13, color: "#8e8e93" }}>
                    Kein Budget gesetzt
                  </p>
                )}
                {Object.keys(byU).length > 0 && (
                  <div style={{ marginTop: 8 }} className="space-y-1">
                    {Object.entries(byU).map(([uid, std]) => {
                      const u = data.users.find((x) => x.id === uid);
                      const kst = std * (u?.stundensatz || 45);
                      return (
                        <div
                          key={uid}
                          className="flex items-center justify-between"
                          style={{ fontSize: 13 }}
                        >
                          <div className="flex items-center" style={{ gap: 6 }}>
                            <User size={10} style={{ color: "#8e8e93" }} />
                            <span style={{ color: "#3c3c43" }}>
                              {u?.name || "?"}
                            </span>
                            <span style={{ color: "#8e8e93" }}>{fH(std)}</span>
                          </div>
                          <span style={{ color: "#3c3c43" }}>{fE(kst)}</span>
                        </div>
                      );
                    })}
                    <div
                      className="flex items-center justify-between"
                      style={{
                        fontSize: 13,
                        paddingTop: 4,
                        marginTop: 4,
                        borderTop: "0.5px solid rgba(0,0,0,0.08)",
                      }}
                    >
                      <span style={{ color: "#8e8e93", fontWeight: 600 }}>
                        Lohn gesamt ({fH(totalStd)})
                      </span>
                      <span style={{ color: "#000", fontWeight: 600 }}>
                        {fE(lohn)}
                      </span>
                    </div>
                  </div>
                )}
                {Object.keys(byU).length === 0 && (
                  <p style={{ fontSize: 13, color: "#8e8e93", marginTop: 4 }}>
                    Noch keine Stunden eingetragen
                  </p>
                )}
                {extraK > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 6,
                      paddingTop: 6,
                      borderTop: "0.5px solid rgba(0,0,0,0.08)",
                    }}
                  >
                    {["material", "subunternehmer", "sonstiges"].map((kat) => {
                      const val = calcKat(b.id, kat);
                      return val > 0 ? (
                        <div
                          key={kat}
                          className="flex items-center"
                          style={{ gap: 4 }}
                        >
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 3,
                              background: katColors[kat],
                            }}
                          />
                          <span style={{ fontSize: 13, color: "#8e8e93" }}>
                            {katLabels[kat]}: {fE(val)}
                          </span>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </ScreenLayout>
  );
};

// ==================== PROFIL (helles Design) ====================
const ProfilView = () => {
  const {
    cu,
    setCu,
    data,
    actions,
    show,
    chef,
    goBack,
    nav,
    prevV,
    setHistory,
    setVRaw,
  } = useContext(AppContext);
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(cu.name);
  const [pin, setPin] = useState("");
  const meineStd = data.stundeneintraege.filter(
    (e) => e.mitarbeiterId === cu.id,
  );
  const totalH = meineStd.reduce(
    (s, e) => s + parseFloat(bStd(e.beginn, e.ende, e.pause)),
    0,
  );
  const meineBs = chef
    ? data.baustellen
    : data.baustellen.filter((b) => b.mitarbeiter.includes(cu.id));

  const save = async () => {
    if (!name.trim()) {
      show("Name nötig", "error");
      return;
    }
    if (pin && !/^\d{4}$/.test(pin)) {
      show("PIN: 4 Ziffern", "error");
      return;
    }
    try {
      if (pin) {
        const pinTaken = await actions.users.checkPinExists(pin, cu.id);
        if (pinTaken) {
          show("PIN vergeben", "error");
          return;
        }
      }
      await actions.users.update(cu.id, {
        name: name.trim(),
        pin: pin || null,
        stundensatz: cu.stundensatz,
      });
      setCu((p) => ({ ...p, name: name.trim() }));
      setEditMode(false);
      setPin("");
      show("Gespeichert");
    } catch (e) {
      show("Fehler beim Speichern", "error");
    }
  };

  return (
    <ScreenLayout
      title={chef ? "Mein Profil" : "Profil"}
      large={!chef}
      onBack={chef ? goBack : prevV ? goBack : undefined}
      right={
        !editMode && (
          <button
            onClick={() => setEditMode(true)}
            style={{
              color: "#3c3c43",
              fontSize: 17,
              background: "none",
              border: "none",
            }}
          >
            Bearbeiten
          </button>
        )
      }
    >
      <div
        style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}
      >
        {/* Avatar & Name */}
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 20,
            boxShadow: CS,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              background: G,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            <span style={{ color: "white", fontSize: 22, fontWeight: 700 }}>
              {cu.name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .toUpperCase()}
            </span>
          </div>
          {editMode ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={IC}
              style={{
                textAlign: "center",
                fontSize: 17,
                fontWeight: 600,
                background: "rgba(118,118,128,0.12)",
                border: "none",
                borderRadius: 10,
              }}
            />
          ) : (
            <p style={{ fontSize: 20, fontWeight: 600, color: "#000" }}>
              {cu.name}
            </p>
          )}
          <p style={{ fontSize: 13, color: "#8e8e93", marginTop: 4 }}>
            {chef ? "Bauleiter" : "Handwerker"}
          </p>
        </div>

        {/* Statistiken */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 14,
              boxShadow: CS,
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>
              {totalH.toFixed(0)}h
            </p>
            <p style={{ fontSize: 12, color: "#8e8e93" }}>Stunden</p>
          </div>
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 14,
              boxShadow: CS,
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>
              {meineStd.length}
            </p>
            <p style={{ fontSize: 12, color: "#8e8e93" }}>Einträge</p>
          </div>
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 14,
              boxShadow: CS,
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>
              {meineBs.length}
            </p>
            <p style={{ fontSize: 12, color: "#8e8e93" }}>Baustellen</p>
          </div>
        </div>

        {/* Einstellungen */}
        <div
          style={{
            background: "white",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: CS,
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "0.5px solid rgba(0,0,0,0.08)",
            }}
          >
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#8e8e93",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 0,
              }}
            >
              Einstellungen
            </p>
          </div>
          <div>
            <div
              className="flex items-center justify-between"
              style={{
                padding: "12px 16px",
                borderBottom: "0.5px solid rgba(0,0,0,0.08)",
              }}
            >
              <div>
                <p style={{ fontSize: 15, color: "#000" }}>PIN</p>
                <p style={{ fontSize: 13, color: "#8e8e93" }}>Zugangs-Code</p>
              </div>
              {editMode ? (
                <input
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Neuer PIN"
                  style={{
                    width: 100,
                    textAlign: "right",
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: "rgba(118,118,128,0.12)",
                    border: "none",
                    fontSize: 15,
                    color: "#000",
                    outline: "none",
                  }}
                />
              ) : (
                <p
                  style={{
                    fontSize: 15,
                    color: "#8e8e93",
                    fontFamily: "monospace",
                  }}
                >
                  ****
                </p>
              )}
            </div>
            <div
              className="flex items-center justify-between"
              style={{ padding: "12px 16px" }}
            >
              <div>
                <p style={{ fontSize: 15, color: "#000" }}>Rolle</p>
                <p style={{ fontSize: 13, color: "#8e8e93" }}>Berechtigung</p>
              </div>
              <Bdg text={chef ? "Bauleiter" : "Handwerker"} />
            </div>
          </div>
        </div>

        {/* Baustellen */}
        <div
          style={{
            background: "white",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: CS,
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "0.5px solid rgba(0,0,0,0.08)",
            }}
          >
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#8e8e93",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 0,
              }}
            >
              {chef ? "Alle Baustellen" : "Meine Baustellen"}
            </p>
          </div>
          <div>
            {meineBs.length === 0 ? (
              <p
                style={{ padding: "12px 16px", fontSize: 13, color: "#8e8e93" }}
              >
                Keine Baustellen zugewiesen
              </p>
            ) : (
              meineBs.map((b, i) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between"
                  style={{
                    padding: "12px 16px",
                    borderTop: i > 0 ? "0.5px solid rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  <div>
                    <p style={{ fontSize: 15, color: "#000" }}>{b.kunde}</p>
                    <p style={{ fontSize: 13, color: "#8e8e93" }}>
                      {b.adresse}
                    </p>
                  </div>
                  <Bdg
                    text={b.status}
                    color={
                      b.status === "aktiv"
                        ? GREEN
                        : b.status === "geplant"
                          ? P
                          : "#8e8e93"
                    }
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Buttons */}
        {editMode ? (
          <div className="space-y-2">
            <button
              onClick={save}
              style={{
                width: "100%",
                padding: "16px 24px",
                borderRadius: 14,
                color: "white",
                fontWeight: 600,
                fontSize: 17,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: G,
                boxShadow: "0 2px 8px rgba(124,58,237,0.35)",
                border: "none",
              }}
            >
              <Save size={18} />
              Speichern
            </button>
            <button
              onClick={() => {
                setEditMode(false);
                setName(cu.name);
                setPin("");
              }}
              style={{
                width: "100%",
                padding: 12,
                fontSize: 15,
                color: "#8e8e93",
                background: "none",
                border: "none",
              }}
            >
              Abbrechen
            </button>
          </div>
        ) : (
          <>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => {
                setCu(null);
                setHistory([]);
                setVRaw("login");
              }}
              style={{
                width: "100%",
                padding: "16px 24px",
                borderRadius: 14,
                color: RED,
                fontWeight: 600,
                fontSize: 17,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: "none",
                border: "none",
              }}
            >
              <LogOut size={18} />
              Abmelden
            </button>
          </>
        )}
      </div>
    </ScreenLayout>
  );
};

// ==================== MEHR VIEW (Chef only) ====================
// ==================== STUNDENÜBERSICHT ====================
const StundenUebersicht = () => {
  const { data, cu, goBack } = useContext(AppContext);
  const now = new Date();
  const [mo, setMo] = useState(now.getMonth());
  const [jr, setJr] = useState(now.getFullYear());
  const [open, setOpen] = useState(null);
  const pv = () => {
    setMo((m) => {
      if (m === 0) {
        setJr((j) => j - 1);
        return 11;
      }
      return m - 1;
    });
  };
  const nx = () => {
    setMo((m) => {
      if (m === 11) {
        setJr((j) => j + 1);
        return 0;
      }
      return m + 1;
    });
  };
  const me = data.stundeneintraege.filter((e) => {
    const d = new Date(e.datum);
    return d.getMonth() === mo && d.getFullYear() === jr;
  });
  const fH = (h) => (Number.isInteger(h) ? h + "h" : h.toFixed(1) + "h");
  const allUsers = [
    ...data.users.filter((u) => u.role === "mitarbeiter"),
    cu,
  ].filter((u, i, a) => a.findIndex((x) => x.id === u.id) === i);
  const byUser = allUsers
    .map((u) => {
      const ue = me.filter((e) => e.mitarbeiterId === u.id);
      if (ue.length === 0) return null;
      const std = ue.reduce(
        (s, e) => s + parseFloat(bStd(e.beginn, e.ende, e.pause)),
        0,
      );
      const byBs = {};
      ue.forEach((e) => {
        const b = data.baustellen.find((x) => x.id === e.baustelleId);
        const k = b?.kunde || "Unbekannt";
        if (!byBs[k]) byBs[k] = 0;
        byBs[k] += parseFloat(bStd(e.beginn, e.ende, e.pause));
      });
      return { user: u, std, entries: ue, byBs };
    })
    .filter(Boolean)
    .sort((a, b) => b.std - a.std);
  const totalStd = byUser.reduce((s, u) => s + u.std, 0);
  const arbTage = [...new Set(me.map((e) => e.datum))].length;
  const mitCount = byUser.length;
  return (
    <ScreenLayout>
      <div style={{ paddingBottom: 4 }}>
        <button
          onClick={goBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            color: P,
            background: "none",
            border: "none",
          }}
        >
          <ChevronLeft size={20} />
          <span style={{ fontSize: 17 }}>Zurück</span>
        </button>
      </div>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: "#000",
          letterSpacing: "-0.5px",
          margin: 0,
        }}
      >
        Stundenübersicht
      </h1>
      {/* Monatsauswahl */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 14,
          boxShadow: CS,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          onClick={pv}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.04)",
            border: "none",
          }}
        >
          <ChevronLeft size={18} style={{ color: "#8e8e93" }} />
        </button>
        <span style={{ fontSize: 17, fontWeight: 600, color: "#000" }}>
          {new Date(jr, mo).toLocaleDateString("de-DE", {
            month: "long",
            year: "numeric",
          })}
        </span>
        <button
          onClick={nx}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.04)",
            border: "none",
          }}
        >
          <ChevronRight size={18} style={{ color: "#8e8e93" }} />
        </button>
      </div>
      {/* KPI */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 14,
            boxShadow: CS,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#000",
              lineHeight: 1,
            }}
          >
            {fH(totalStd)}
          </p>
          <p style={{ fontSize: 12, color: "#8e8e93", marginTop: 4 }}>Gesamt</p>
        </div>
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 14,
            boxShadow: CS,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#000",
              lineHeight: 1,
            }}
          >
            {arbTage}
          </p>
          <p style={{ fontSize: 12, color: "#8e8e93", marginTop: 4 }}>
            Arbeitstage
          </p>
        </div>
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 14,
            boxShadow: CS,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#000",
              lineHeight: 1,
            }}
          >
            {mitCount}
          </p>
          <p style={{ fontSize: 12, color: "#8e8e93", marginTop: 4 }}>
            Mitarbeiter
          </p>
        </div>
      </div>
      {/* Pro Mitarbeiter */}
      {byUser.length === 0 ? (
        <Empty icon={Clock} text="Keine Einträge in diesem Monat" />
      ) : (
        <div className="space-y-2">
          {byUser.map(({ user: u, std, entries, byBs }) => (
            <div
              key={u.id}
              style={{
                background: "white",
                borderRadius: 12,
                boxShadow: CS,
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => setOpen(open === u.id ? null : u.id)}
                style={{
                  width: "100%",
                  padding: 16,
                  background: "none",
                  border: "none",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      background: "rgba(0,0,0,0.09)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#3c3c43",
                      }}
                    >
                      {u.name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .toUpperCase()}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: "#000",
                      }}
                    >
                      {u.name}
                    </p>
                  </div>
                  <span
                    style={{ fontSize: 20, fontWeight: 700, color: "#000" }}
                  >
                    {fH(std)}
                  </span>
                  <ChevronRight
                    size={16}
                    style={{
                      color: "#c7c7cc",
                      transform: open === u.id ? "rotate(90deg)" : "none",
                      transition: "transform 0.15s ease",
                    }}
                  />
                </div>
                {/* Baustellen-Aufschlüsselung */}
                <div
                  style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: "0.5px solid rgba(0,0,0,0.08)",
                  }}
                >
                  {Object.entries(byBs).map(([name, h], i) => (
                    <div
                      key={name}
                      className="flex justify-between"
                      style={{
                        padding: "4px 0",
                        borderTop:
                          i > 0 ? "0.5px solid rgba(0,0,0,0.08)" : "none",
                      }}
                    >
                      <span style={{ fontSize: 13, color: "#8e8e93" }}>
                        {name}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#000",
                        }}
                      >
                        {fH(h)}
                      </span>
                    </div>
                  ))}
                </div>
              </button>
              {/* Einzeleinträge aufgeklappt */}
              {open === u.id && (
                <div style={{ padding: "0 16px 16px" }}>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#8e8e93",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      marginBottom: 8,
                    }}
                  >
                    Einzeleinträge
                  </p>
                  <div className="space-y-1.5">
                    {[...entries]
                      .sort((a, b) => b.datum.localeCompare(a.datum))
                      .map((e) => {
                        const bs = data.baustellen.find(
                          (x) => x.id === e.baustelleId,
                        );
                        const h = parseFloat(bStd(e.beginn, e.ende, e.pause));
                        return (
                          <div
                            key={e.id}
                            style={{
                              padding: "10px 12px",
                              borderRadius: 10,
                              background: "#f2f2f7",
                              fontSize: 13,
                            }}
                          >
                            <div className="flex justify-between">
                              <span style={{ color: "#000", fontWeight: 600 }}>
                                {fK(e.datum)}
                              </span>
                              <span style={{ fontWeight: 700, color: "#000" }}>
                                {fH(h)}
                              </span>
                            </div>
                            <p style={{ color: "#8e8e93", marginTop: 2 }}>
                              {e.beginn}–{e.ende}, Pause {e.pause} Min
                              {bs ? " · " + bs.kunde : ""}
                            </p>
                            {e.arbeit && (
                              <p style={{ color: "#8e8e93", marginTop: 2 }}>
                                {e.arbeit}
                              </p>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </ScreenLayout>
  );
};

const MehrView = () => {
  const { data, cu, nav, unread, prevV, goBack, setSb } =
    useContext(AppContext);
  const sections = [
    {
      title: "Berichte",
      items: [
        {
          k: "suo",
          i: BarChart3,
          l: "Stundenübersicht",
          s: "Monatsübersicht pro Mitarbeiter",
        },
        { k: "tag", i: Eye, l: "Tagesübersicht", s: "Alle Einträge des Tages" },
        {
          k: "reg",
          i: FileText,
          l: "Regieberichte",
          s: "Auto-generiert & druckbar",
        },
        {
          k: "btb",
          i: ClipboardList,
          l: "Bautagebuch",
          s: "Tagesberichte dokumentieren",
        },
      ],
    },
    {
      title: "Verwaltung",
      items: [
        {
          k: "kos",
          i: Receipt,
          l: "Kostenübersicht",
          s: "Budget & Abrechnung",
        },
        {
          k: "mng",
          i: AlertCircle,
          l: "Mängelmanagement",
          s: `${data.maengel.filter((m) => m.status !== "erledigt").length} offen`,
        },
        {
          k: "mat",
          i: Package,
          l: "Materialübersicht",
          s: "Verbrauch pro Baustelle",
        },
      ],
    },
    {
      title: "Team",
      items: [
        {
          k: "mit",
          i: Users,
          l: "Handwerker",
          s:
            data.users.filter((u) => u.role === "mitarbeiter").length === 1
              ? "1 Person"
              : `${data.users.filter((u) => u.role === "mitarbeiter").length} Personen`,
        },
        {
          k: "sub",
          i: Briefcase,
          l: "Subunternehmer",
          s:
            data.subunternehmer.length === 1
              ? "1 Firma"
              : `${data.subunternehmer.length} Firmen`,
        },
      ],
    },
    {
      title: "Konto",
      items: [
        { k: "profil", i: User, l: "Mein Profil", s: cu?.name },
        {
          k: "notif",
          i: Bell,
          l: "Mitteilungen",
          s: `${unread} ungelesen`,
          badge: unread,
        },
      ],
    },
  ];
  return (
    <ScreenLayout large title="Mehr" onBack={prevV ? goBack : undefined}>
      {sections.map((sec, si) => (
        <div key={sec.title} style={{ marginBottom: 24 }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#8e8e93",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              paddingBottom: 8,
            }}
          >
            {sec.title}
          </p>
          <div
            style={{
              background: "white",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: CS,
            }}
          >
            {sec.items.map(({ k, i: I, l, s, badge }, idx) => (
              <button
                key={k}
                onClick={() => {
                  if (k === "mng") setSb(null);
                  nav(k);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  textAlign: "left",
                  padding: "12px 16px",
                  borderTop: idx > 0 ? "0.5px solid rgba(0,0,0,0.08)" : "none",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "rgba(0,0,0,0.09)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <I size={18} style={{ color: "#3c3c43" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, color: "#000" }}>{l}</p>
                  <p
                    style={{
                      fontSize: 13,
                      color: "#8e8e93",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s}
                  </p>
                </div>
                {badge > 0 && (
                  <span
                    style={{
                      background: "#FF3B30",
                      color: "white",
                      fontSize: 13,
                      fontWeight: 600,
                      minWidth: 22,
                      height: 22,
                      borderRadius: 11,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 6px",
                    }}
                  >
                    {badge}
                  </span>
                )}
                <ChevronRight size={18} style={{ color: "#c7c7cc" }} />
              </button>
            ))}
          </div>
        </div>
      ))}
    </ScreenLayout>
  );
};

// ==================== TAB BAR ====================
const TabBar = () => {
  const { v, chef, setHistory, setVRaw } = useContext(AppContext);
  const tabForView = {
    dash: "dash",
    bst: "bst",
    bsd: "bst",
    bsf: "bst",
    ste: "ste",
    mst: "dash",
    kal: "kal",
    mehr: "mehr",
    suo: "mehr",
    tag: "mehr",
    reg: "mehr",
    btb: "mehr",
    kos: "mehr",
    mng: "mehr",
    mat: "mehr",
    mit: "mehr",
    mitf: "mehr",
    sub: "mehr",
    notif: "mehr",
    dok: "bst",
    profil: chef ? "mehr" : "profil",
  };
  const activeTab = tabForView[v] || "dash";
  const tabs = chef
    ? [
        { id: "dash", i: Home, l: "Start" },
        { id: "bst", i: Building2, l: "Baustellen" },
        { id: "ste", i: Clock, l: "Stunden" },
        { id: "kal", i: Calendar, l: "Kalender" },
        { id: "mehr", i: MoreHorizontal, l: "Mehr" },
      ]
    : [
        { id: "dash", i: Home, l: "Start" },
        { id: "bst", i: Building2, l: "Baustellen" },
        { id: "ste", i: Clock, l: "Stunden" },
        { id: "profil", i: User, l: "Profil" },
      ];
  return (
    <div className="tab-bar">
      {tabs.map(({ id, i: I, l }) => (
        <button
          key={id}
          onClick={() => {
            setHistory([]);
            setVRaw(id);
          }}
          className={`tab-bar-item ${activeTab === id ? "active" : ""}`}
        >
          <I
            size={22}
            strokeWidth={activeTab === id ? 2.2 : 1.5}
            className="tab-icon"
          />
          <span className="tab-label">{l}</span>
        </button>
      ))}
    </div>
  );
};

export default function MAConstructionApp() {
  const { data, loading, error: dataError, actions } = useAppData();
  const [cu, setCu] = useState(() => {
    try {
      const saved = localStorage.getItem("ma_construction_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [v, setVRaw] = useState(() => {
    try {
      const saved = localStorage.getItem("ma_construction_view");
      return saved || "login";
    } catch {
      return "login";
    }
  });
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
  const [sb, setSb] = useState(null); // selected baustelle
  const [em, setEm] = useState(false); // edit mode
  const [editUser, setEditUser] = useState(null); // user being edited in MitForm
  const [mitSummary, setMitSummary] = useState(null); // onboarding summary after creating employee
  const [sq, setSq] = useState(""); // search
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);
  const [photoCb, setPhotoCb] = useState(null);
  const [clockTime, setClockTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setClockTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  // Persist user and view in localStorage (for session persistence)
  useEffect(() => {
    try {
      localStorage.setItem(
        "ma_construction_user",
        cu ? JSON.stringify(cu) : "",
      );
      if (cu)
        localStorage.setItem(
          "ma_construction_last_user",
          JSON.stringify({ name: cu.name, username: cu.username }),
        );
    } catch {}
  }, [cu]);
  useEffect(() => {
    try {
      localStorage.setItem("ma_construction_view", v);
    } catch {}
  }, [v]);
  // Safety: if not logged in, show login
  useEffect(() => {
    if (!cu && v !== "login") {
      setHistory([]);
      setVRaw("login");
    }
  }, [cu, v]);
  // Seed: Testbaustelle einfügen wenn keine existieren
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
  if (loading)
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

  // ==================== RENDER ====================
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
            {/* iOS Status Bar (desktop only via CSS) */}
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

            {/* App Content */}
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
              <div style={{ flex: 1, minHeight: 0 }}>
                <div key={v} className="view-fade">
                  {v === "login" && <Login />}
                  {v === "dash" && <Dash />}
                  {v === "profil" && <ProfilView />}
                  {v === "bst" && <BstList />}
                  {v === "bsd" && <BstDet />}
                  {v === "bsf" && <BstForm />}
                  {v === "ste" && <SteView />}
                  {v === "mst" && <MeineStd />}
                  {v === "mng" && <MngView />}
                  {v === "btb" && <BtbView />}
                  {v === "dok" && <DokView />}
                  {v === "mat" && <MatView />}
                  {v === "notif" && <NotifView />}
                  {v === "kal" && <KalView />}
                  {v === "suo" && <StundenUebersicht />}
                  {v === "tag" && <TagView />}
                  {v === "reg" && <RegView />}
                  {v === "kos" && <KostenView />}
                  {v === "mit" && <MitView />}
                  {v === "mitf" && <MitForm />}
                  {v === "sub" && <SubView />}
                  {v === "mehr" && <MehrView />}
                </div>
              </div>
              {cu && <TabBar />}
            </div>

            {/* Home Indicator (desktop only via CSS) */}
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
