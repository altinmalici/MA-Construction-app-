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

export default SigPad;
