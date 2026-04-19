import { useRef, useEffect } from "react";
import { Check, AlertTriangle, X } from "lucide-react";
import { GREEN, RED } from "../../utils/helpers";

const DURATIONS = {
  success: 1800,
  error: 4500,
  info: 2500,
};

const Toast = ({ message, type = "success", onDone }) => {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const ms = DURATIONS[type] ?? DURATIONS.success;
    const t = setTimeout(() => onDoneRef.current(), ms);
    return () => clearTimeout(t);
  }, [type]);

  const bg = type === "success" ? GREEN : type === "error" ? RED : "#3c3c43";

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
      style={{
        padding: "10px 12px 10px 16px",
        borderRadius: 14,
        color: "white",
        fontSize: 15,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: bg,
        backdropFilter: "blur(10px)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      {type === "success" ? (
        <Check size={18} />
      ) : type === "error" ? (
        <AlertTriangle size={18} />
      ) : null}
      <span style={{ flex: 1, wordBreak: "break-word" }}>{message}</span>
      <button
        onClick={() => onDoneRef.current()}
        aria-label="Schließen"
        style={{
          minWidth: 32,
          minHeight: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255,255,255,0.2)",
          border: "none",
          borderRadius: 16,
          color: "white",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default Toast;
