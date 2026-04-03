import { Package } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { fK, CS } from "../../utils/helpers";
import { Empty, ScreenLayout } from "../ui";

const MatView = () => {
  const { data, goBack } = useApp();
  const mp = {};
  data.stundeneintraege.forEach((e) => {
    if (!e.material) return;
    const bs = data.baustellen.find((b) => b.id === e.baustelleId);
    const k = bs?.kunde || "?";
    if (!mp[k]) mp[k] = [];
    mp[k].push({
      m: e.material,
      d: e.datum,
      v: data.users.find((u) => u.id === e.mitarbeiterId)?.name,
    });
  });
  return (
    <ScreenLayout title="Materialübersicht" onBack={goBack}>
      <div className="space-y-2">
        {Object.keys(mp).length === 0 ? (
          <Empty icon={Package} text="Noch kein Material erfasst" />
        ) : (
          Object.entries(mp).map(([bs, items]) => (
            <div
              key={bs}
              style={{
                borderRadius: 12,
                background: "white",
                boxShadow: CS,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "0.5px solid rgba(0,0,0,0.08)",
                }}
              >
                <p style={{ fontSize: 15, fontWeight: 600, color: "#000" }}>
                  {bs}
                </p>
              </div>
              <div style={{ padding: 16 }} className="space-y-2">
                {items.map((i, idx) => (
                  <div key={idx} style={{ fontSize: 13 }}>
                    <p style={{ color: "#3c3c43" }}>{i.m}</p>
                    <p style={{ color: "#8e8e93" }}>
                      {i.v} · {fK(i.d)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </ScreenLayout>
  );
};

export default MatView;
