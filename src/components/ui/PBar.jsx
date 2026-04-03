const PBar = ({ value, small, color }) => (
  <div
    style={{
      width: "100%",
      background: "rgba(0,0,0,0.08)",
      borderRadius: 100,
      overflow: "hidden",
      height: small ? 4 : 6,
    }}
  >
    <div
      style={{
        height: "100%",
        borderRadius: 100,
        background: color || "#8e8e93",
        width: `${value}%`,
        transition: "width 0.3s ease",
      }}
    />
  </div>
);

export default PBar;
