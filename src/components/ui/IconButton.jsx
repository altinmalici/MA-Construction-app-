import { P, RED } from "../../utils/helpers";

/**
 * Icon-Button mit garantiertem 44×44 Touch-Target (iOS-HIG).
 * Icon-Größe (visuell) und Touch-Fläche sind entkoppelt.
 *
 *   <IconButton icon={X} onClick={...} ariaLabel="Schließen" />
 *   <IconButton icon={Trash2} onClick={...} ariaLabel="Löschen" variant="danger" />
 */
const variants = {
  default: { color: "#3c3c43", background: "rgba(0,0,0,0.04)" },
  subtle: { color: "#8e8e93", background: "transparent" },
  primary: { color: "white", background: P },
  danger: { color: RED, background: `${RED}15` },
};

const IconButton = ({
  icon: Icon,
  onClick,
  ariaLabel,
  variant = "default",
  iconSize = 18,
  disabled = false,
  style = {},
  type = "button",
}) => {
  const v = variants[variant] || variants.default;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        minWidth: 44,
        minHeight: 44,
        borderRadius: 10,
        border: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        color: v.color,
        background: v.background,
        ...style,
      }}
    >
      <Icon size={iconSize} />
    </button>
  );
};

export default IconButton;
