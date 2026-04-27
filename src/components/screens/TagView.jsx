import { useState } from "react";
import { Clock } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { bStd, bStdNum, IC } from "../../utils/helpers";
import { Empty, ScreenLayout, Card } from "../ui";

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
        <Card padding={14} style={{ textAlign: "center" }}>
          <p style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>
            {te.length}
          </p>
          <p style={{ fontSize: 12, color: "#8e8e93" }}>Einträge</p>
        </Card>
        <Card padding={14} style={{ textAlign: "center" }}>
          <p style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>
            {(() => {
              const t = te.reduce(
                (s, e) => s + bStdNum(e.beginn, e.ende, e.pause),
                0,
              );
              return t === 0 ? "0" : t.toFixed(1);
            })()}
            h
          </p>
          <p style={{ fontSize: 12, color: "#8e8e93" }}>Gesamt</p>
        </Card>
      </div>
      {te.length === 0 ? (
        <Empty icon={Clock} text="Keine Einträge an diesem Tag" />
      ) : (
        <div className="space-y-2">
          {te.map((e) => {
            const bs = data.baustellen.find((b) => b.id === e.baustelleId);
            return (
              <Card key={e.id}>
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
              </Card>
            );
          })}
        </div>
      )}
    </ScreenLayout>
  );
};

export default TagView;
