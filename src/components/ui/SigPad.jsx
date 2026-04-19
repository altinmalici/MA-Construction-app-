import { useState, useRef, useEffect } from "react";
import { PenTool, Trash2 } from "lucide-react";
import { P } from "../../utils/helpers";

const SigPad = ({ onSave, onClear, sig }) => {
  const ref = useRef(null);
  const [dr, setDr] = useState(false);
  const [hd, setHd] = useState(!!sig);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const initStyles = (ctx) => {
      ctx.strokeStyle = "#374151";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
    };
    const setCanvasSize = (preserveSnapshot) => {
      const ctx = c.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      const cssW = c.offsetWidth;
      const cssH = c.offsetHeight;
      let snapshot = null;
      if (preserveSnapshot && c.width > 0 && c.height > 0) {
        try {
          snapshot = c.toDataURL();
        } catch {
          snapshot = null;
        }
      }
      // setTransform statt scale, damit wiederholter Resize nicht kumuliert.
      c.width = cssW * dpr;
      c.height = cssH * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initStyles(ctx);
      if (snapshot) {
        const img = new window.Image();
        img.onload = () => ctx.drawImage(img, 0, 0, cssW, cssH);
        img.src = snapshot;
      } else if (sig) {
        const img = new window.Image();
        img.onload = () => ctx.drawImage(img, 0, 0, cssW, cssH);
        img.src = sig;
      }
    };
    setCanvasSize(false);
    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => setCanvasSize(true));
      ro.observe(c);
      return () => ro.disconnect();
    }
    // Fallback für Browser ohne ResizeObserver
    const onResize = () => setCanvasSize(true);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [sig]);
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
          aria-label="Unterschrift löschen"
          style={{
            marginTop: 4,
            padding: "6px 8px",
            fontSize: 13,
            color: "#8e8e93",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: "none",
            border: "none",
            minHeight: 32,
            cursor: "pointer",
          }}
        >
          <Trash2 size={14} />
          Löschen
        </button>
      )}
    </div>
  );
};

export default SigPad;
