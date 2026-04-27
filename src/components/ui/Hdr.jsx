import { ChevronLeft } from "lucide-react";
import { P } from "../../utils/helpers";

// Gemeinsamer Back-Button für large + compact. Nur die Größen weichen ab,
// das Markup (Icon + "Zurück"-Label) ist identisch — wir lokalisieren das
// hier statt es in beiden Branches zu duplizieren.
const BackButton = ({ onBack, iconSize, fontSize, marginClass }) => {
  if (!onBack) return null;
  return (
    <button
      onClick={onBack}
      className={`flex items-center gap-1 ${marginClass}`}
      style={{ color: P }}
    >
      <ChevronLeft size={iconSize} />
      <span style={{ fontSize }}>Zurück</span>
    </button>
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
        <div className="mb-2">
          <BackButton
            onBack={onBack}
            iconSize={20}
            fontSize={15}
            marginClass="-ml-1"
          />
        </div>
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
        <BackButton
          onBack={onBack}
          iconSize={22}
          fontSize={17}
          marginClass="-ml-2"
        />
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
