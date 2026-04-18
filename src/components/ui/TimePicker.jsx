import { useEffect, useRef } from "react";

const ROW_HEIGHT = 40;
const VISIBLE_ROWS = 5;
const CENTER_INDEX = Math.floor(VISIBLE_ROWS / 2);
const PICKER_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS;

export const minuteOptions = (step) => {
  const arr = [];
  for (let i = 0; i < 60; i += step) arr.push(i);
  return arr;
};

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);

export const parseTime = (s) => {
  if (!/^\d{2}:\d{2}$/.test(s || "")) return { h: 0, m: 0 };
  const [h, m] = s.split(":").map(Number);
  return {
    h: Math.min(23, Math.max(0, h)),
    m: Math.min(59, Math.max(0, m)),
  };
};

export const formatTime = (h, m) =>
  `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

// Bei Gleichstand: die nächst-höhere Option (z.B. 15 → 30 bei step=30).
export const snapMinute = (m, step) => {
  const opts = minuteOptions(step);
  return opts.reduce(
    (best, o) =>
      Math.abs(o - m) <= Math.abs(best - m) ? o : best,
    opts[0],
  );
};

const Wheel = ({ options, format, selected, onSelect, disabled }) => {
  const ref = useRef(null);
  const scrollTimer = useRef(null);
  const userScrolling = useRef(false);

  // Initial-Scroll auf den selektierten Index (ohne Animation, ohne onChange).
  useEffect(() => {
    const idx = options.indexOf(selected);
    if (idx < 0 || !ref.current) return;
    ref.current.scrollTop = idx * ROW_HEIGHT;
  }, [selected, options]);

  const handleScroll = () => {
    if (disabled) return;
    userScrolling.current = true;
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      userScrolling.current = false;
      const el = ref.current;
      if (!el) return;
      const idx = Math.round(el.scrollTop / ROW_HEIGHT);
      const clamped = Math.max(0, Math.min(options.length - 1, idx));
      const snapTop = clamped * ROW_HEIGHT;
      if (Math.abs(el.scrollTop - snapTop) > 1) {
        el.scrollTop = snapTop;
      }
      const value = options[clamped];
      if (value !== selected) onSelect(value);
    }, 120);
  };

  return (
    <div
      style={{
        position: "relative",
        height: PICKER_HEIGHT,
        flex: 1,
        overflow: "hidden",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0, #000 30%, #000 70%, transparent 100%)",
        maskImage:
          "linear-gradient(to bottom, transparent 0, #000 30%, #000 70%, transparent 100%)",
      }}
    >
      <div
        ref={ref}
        role="listbox"
        onScroll={handleScroll}
        style={{
          height: "100%",
          overflowY: disabled ? "hidden" : "auto",
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <div style={{ height: ROW_HEIGHT * CENTER_INDEX }} />
        {options.map((opt) => {
          const isSelected = opt === selected;
          return (
            <div
              key={opt}
              role="option"
              aria-selected={isSelected}
              style={{
                height: ROW_HEIGHT,
                lineHeight: `${ROW_HEIGHT}px`,
                textAlign: "center",
                fontSize: isSelected ? 20 : 17,
                fontWeight: 400,
                color: "#000",
                opacity: isSelected ? 1 : 0.5,
                scrollSnapAlign: "center",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {format(opt)}
            </div>
          );
        })}
        <div style={{ height: ROW_HEIGHT * CENTER_INDEX }} />
      </div>
      {/* Center-Highlight Bar */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: ROW_HEIGHT * CENTER_INDEX,
          left: 0,
          right: 0,
          height: ROW_HEIGHT,
          background: "#f2f2f7",
          borderTop: "0.5px solid rgba(0,0,0,0.1)",
          borderBottom: "0.5px solid rgba(0,0,0,0.1)",
          pointerEvents: "none",
          zIndex: -1,
        }}
      />
    </div>
  );
};

const TimePicker = ({
  value,
  onChange,
  minuteStep = 30,
  disabled = false,
}) => {
  const { h, m } = parseTime(value);
  const minutes = minuteOptions(minuteStep);
  const snappedMinute = snapMinute(m, minuteStep);

  const setHour = (newH) => {
    if (disabled) return;
    onChange(formatTime(newH, snappedMinute));
  };
  const setMinute = (newM) => {
    if (disabled) return;
    onChange(formatTime(h, newM));
  };

  const fmt = (n) => String(n).padStart(2, "0");

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        height: PICKER_HEIGHT,
        opacity: disabled ? 0.5 : 1,
        position: "relative",
        background: "white",
        borderRadius: 12,
        padding: "0 8px",
        userSelect: "none",
      }}
    >
      <Wheel
        options={HOUR_OPTIONS}
        format={fmt}
        selected={h}
        onSelect={setHour}
        disabled={disabled}
      />
      <span
        aria-hidden="true"
        style={{
          fontSize: 20,
          fontWeight: 400,
          color: "#000",
          padding: "0 2px",
        }}
      >
        :
      </span>
      <Wheel
        options={minutes}
        format={fmt}
        selected={snappedMinute}
        onSelect={setMinute}
        disabled={disabled}
      />
    </div>
  );
};

export default TimePicker;
