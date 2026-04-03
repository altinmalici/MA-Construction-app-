import { useState } from "react";
import { Clock } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { bStd, IC, CS } from "../../utils/helpers";
import { Empty, ScreenLayout } from "../ui";

const TagView = () => {
  const { data, goBack, eName } = useApp();
  const [dt, setDt] = useState(new Date().toISOString().split("T")[0]);
  const te = data.stundeneintraege.filter((e) => e.datum === dt);
  return (
    <ScreenLayout title="Tagesübersicht" onBack={goBack}>
      <input
        type="date"
        value={dt}
        onChange={(e) => setDt(e.target.value)}
        className={IC}
        style={{
          marginBottom: 12,
          background: "rgba(118,118,128,0.12)",
          border: "none",
        }}
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            borderRadius: 12,
            padding: 14,
            background: "white",
            boxShadow: CS,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>
            {te.length}
          </p>
          <p style={{ fontSize: 12, color: "#8e8e93" }}>Einträge</p>
        </div>
        <div
          style={{
            borderRadius: 12,
            padding: 14,
            background: "white",
            boxShadow: CS,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>
            {(() => {
              const t = te.reduce(
                (s, e) => s + parseFloat(bStd(e.beginn, e.ende, e.pause)),
                0,
              );
              return t === 0 ? "0" : t.toFixed(1);
            })()}
            h
          </p>
          <p style={{ fontSize: 12, color: "#8e8e93" }}>Gesamt</p>
        </div>
      </div>
      {te.length === 0 ? (
        <Empty icon={Clock} text="Keine Einträge an diesem Tag" />
      ) : (
        <div className="space-y-2">
          {te.map((e) => {
            const bs = data.baustellen.find((b) => b.id === e.baustelleId);
            return (
              <div
                key={e.id}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: "white",
                  boxShadow: CS,
                }}
              >
                <div
                  className="flex justify-between items-start"
                  style={{ marginBottom: 4 }}
                >
                  <div>
                    <p style={{ fontSize: 15, color: "#000" }}>{bs?.kunde}</p>
                    <p style={{ fontSize: 13, color: "#8e8e93" }}>
                      {eName(e)}
                      {e.personTyp === "sub" && (
                        <span style={{ color: "#8e8e93", marginLeft: 4 }}>
                          (Sub)
                        </span>
                      )}
                      {e.personTyp === "sonstige" && (
                        <span style={{ color: "#8e8e93", marginLeft: 4 }}>
                          (Sonstige)
                        </span>
                      )}
                    </p>
                  </div>
                  <span
                    style={{ fontWeight: 600, fontSize: 15, color: "#000" }}
                  >
                    {bStd(e.beginn, e.ende, e.pause)}h
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "#8e8e93" }}>{e.arbeit}</p>
                {e.material && (
                  <p style={{ fontSize: 13, color: "#8e8e93", marginTop: 4 }}>
                    Material: {e.material}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </ScreenLayout>
  );
};

export default TagView;
