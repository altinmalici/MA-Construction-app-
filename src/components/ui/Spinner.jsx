const Spinner = ({ size = 16, color = "currentColor" }) => (
  <span
    aria-hidden="true"
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      border: "2px solid rgba(255,255,255,0.3)",
      borderTopColor: color,
      animation: "ma-spin 0.8s linear infinite",
      display: "inline-block",
      flexShrink: 0,
    }}
  />
);

export default Spinner;
