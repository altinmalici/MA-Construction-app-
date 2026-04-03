import { ChevronLeft } from "lucide-react";
import { P } from "../../utils/helpers";

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

export default Hdr;
