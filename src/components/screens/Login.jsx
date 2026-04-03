import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { P, BTN, RED, GREEN, IC, G } from "../../utils/helpers";
import { ScreenLayout } from "../ui";

const Login = () => {
  const { actions, setCu, nav } = useApp();
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
      const u = await actions.auth.getCurrentUser();
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
          {n === "del" ? "\u2190" : n}
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
        <p style={{ color: P, fontSize: 14, fontWeight: 600 }}>Pr\u00fcfe...</p>
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
              {checking ? "Pr\u00fcfe..." : "Weiter"}
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
              {pinStep === 1 ? "PIN erstellen" : "PIN best\u00e4tigen"}
            </h1>
            <p style={{ fontSize: 15, color: "#8e8e93" }}>
              {pinStep === 1
                ? `Hallo ${obUser?.name?.split(" ")[0]}! W\u00e4hle deinen pers\u00f6nlichen PIN.`
                : "Gib den PIN zur Best\u00e4tigung erneut ein."}
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
                Willkommen zur\u00fcck
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

export default Login;
