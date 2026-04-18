import { useEffect, useRef } from "react";
import {
  parseTime,
  formatTime,
  minuteOptions,
  snapMinute,
} from "./TimePicker.helpers.js";

const ROW_HEIGHT = 40;
const VISIBLE_ROWS = 5;
const CENTER_INDEX = Math.floor(VISIBLE_ROWS / 2);
const PICKER_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS;

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);

const Wheel = ({ options, format, selected, onSelect, disabled }) => {
  const ref = useRef(null);
  const scrollTimer = useRef(null);
  const userScrolling = useRef(false);

  // Initial-Scroll auf den selektierten Index. Während der User aktiv
  // scrollt nicht überschreiben — sonst springt die Liste mitten in der
  // Geste zurück.
  useEffect(() => {
    if (userScrolling.current) return;
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
      {/* Center-Highlight Bar — hinter den scrollenden Optionen, aber sichtbar */}
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
          zIndex: 0,
        }}
      />
      <div
        ref={ref}
        role="listbox"
        onScroll={handleScroll}
        style={{
          position: "relative",
          zIndex: 1,
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
        background: "transparent",
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
