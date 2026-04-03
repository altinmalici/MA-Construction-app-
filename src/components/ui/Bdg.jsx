const Bdg = ({ text, color = "#3c3c43" }) => (
  <span
    style={{
      background: `${color}15`,
      color,
      padding: "4px 10px",
      borderRadius: 100,
      fontSize: 12,
      fontWeight: 600,
    }}
  >
    {text}
  </span>
);

export default Bdg;
