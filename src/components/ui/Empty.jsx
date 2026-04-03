const Empty = ({ icon: I, text }) => (
  <div style={{ textAlign: "center", padding: "60px 20px" }}>
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: 20,
        background: "rgba(0,0,0,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 16px",
      }}
    >
      <I size={28} style={{ color: "#3c3c43" }} />
    </div>
    <p
      style={{ fontSize: 17, fontWeight: 600, color: "#000", marginBottom: 8 }}
    >
      Keine Einträge
    </p>
    <p style={{ fontSize: 15, color: "#8e8e93" }}>{text}</p>
  </div>
);

export default Empty;
