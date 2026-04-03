import { useRef, useEffect } from "react";
import { Check, AlertTriangle } from "lucide-react";
import { GREEN, RED } from "../../utils/helpers";

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

export default Toast;
