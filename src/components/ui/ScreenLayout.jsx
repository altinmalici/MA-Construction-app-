import Hdr from "./Hdr";

const ScreenLayout = ({ title, onBack, right, children, large }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: "#f2f2f7",
    }}
  >
    {title && <Hdr title={title} onBack={onBack} right={right} large={large} />}
    <div
      className="app-scroll"
      style={{
        padding: title
          ? "16px 20px 32px"
          : "calc(var(--safe-top) + 16px) 20px 32px",
      }}
    >
      {children}
    </div>
  </div>
);

export default ScreenLayout;
