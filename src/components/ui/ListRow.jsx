import { ChevronRight } from "lucide-react";

/**
 * iOS-Style Listen-Zeile: optional Icon links, Label, optional Badge,
 * optional ChevronRight rechts (wenn `onClick` gesetzt).
 *
 * Aus F-01 extrahiert (Tag 2). Innerhalb einer `<Card padding={0}>`
 * ergeben mehrere `<ListRow>` einen iOS-Settings-artigen Block.
 *
 *   <ListRow icon={Bell} label="Benachrichtigungen" badge={3} onClick={...} />
 *   <ListRow label="Version" trailing="1.4.2" />
 */
const ListRow = ({
  icon: Icon,
  label,
  badge,
  trailing,
  onClick,
  isLast = false,
}) => (
  <button
    onClick={onClick}
    disabled={!onClick}
    style={{
      width: "100%",
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "14px 16px",
      background: "transparent",
      border: "none",
      borderBottom: isLast ? "none" : "0.5px solid rgba(0,0,0,0.08)",
      textAlign: "left",
      minHeight: 48,
      cursor: onClick ? "pointer" : "default",
      color: "#000",
      fontSize: 15,
    }}
  >
    {Icon && <Icon size={18} style={{ color: "#3c3c43", flexShrink: 0 }} />}
    <span style={{ flex: 1, fontWeight: 500 }}>{label}</span>
    {badge !== undefined && badge !== null && badge !== "" && (
      <span
        style={{
          background: "rgba(0,0,0,0.06)",
          color: "#3c3c43",
          padding: "2px 8px",
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {badge}
      </span>
    )}
    {trailing && (
      <span style={{ color: "#8e8e93", fontSize: 14 }}>{trailing}</span>
    )}
    {onClick && (
      <ChevronRight size={16} style={{ color: "#c7c7cc", flexShrink: 0 }} />
    )}
  </button>
);

export default ListRow;
