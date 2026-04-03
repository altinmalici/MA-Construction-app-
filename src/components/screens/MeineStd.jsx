import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { bStd, fDat, CS } from "../../utils/helpers";
import { ScreenLayout, Empty } from "../ui";

const MeineStd = () => {
  const { data, cu, goBack } = useApp();
  const h = new Date();
  const [mo, setMo] = useState(h.getMonth());
  const [jr, setJr] = useState(h.getFullYear());
  if (!cu) return null;
  const pv = () => {
    setMo((m) => {
      if (m === 0) {
        setJr((j) => j - 1);
        return 11;
      }
      return m - 1;
    });
  };
  const nx = () => {
    setMo((m) => {
      if (m === 11) {
        setJr((j) => j + 1);
        return 0;
      }
      return m + 1;
    });
  };
  const all = data.stundeneintraege.filter((e) => e.mitarbeiterId === cu.id);
  const me = all.filter((e) => {
    const d = new Date(e.datum);
    return d.getMonth() === mo && d.getFullYear() === jr;
  });
  const moH = me.reduce(
    (s, e) => s + parseFloat(bStd(e.beginn, e.ende, e.pause)),
    0,
  );
  const totalH = all.reduce(
    (s, e) => s + parseFloat(bStd(e.beginn, e.ende, e.pause)),
    0,
  );
  // Gruppiert nach Woche
  const byWeek = {};
  me.forEach((e) => {
    const d = new Date(e.datum);
    const day = d.getDay() || 7;
    const thu = new Date(d);
    thu.setDate(d.getDate() + 4 - day);
    const kw = Math.ceil(
      ((thu - new Date(thu.getFullYear(), 0, 1)) / 86400000 + 1) / 7,
    );
    const w = `KW ${String(kw).padStart(2, "0")}`;
    if (!byWeek[w]) byWeek[w] = [];
    byWeek[w].push(e);
  });
  return (
    <ScreenLayout title="Meine Stunden" onBack={goBack}>
      {/* Monat Navigation */}
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: 12 }}
      >
        <button
          onClick={pv}
          style={{
            padding: 8,
            color: "#8e8e93",
            background: "none",
            border: "none",
          }}
        >
          <ChevronLeft size={18} />
        </button>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: "#000" }}>
          {new Date(jr, mo).toLocaleDateString("de-DE", {
            month: "long",
            year: "numeric",
          })}
        </h2>
        <button
          onClick={nx}
          style={{
            padding: 8,
            color: "#8e8e93",
            background: "none",
            border: "none",
          }}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
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
            {moH.toFixed(1)}h
          </p>
          <p style={{ fontSize: 12, color: "#8e8e93" }}>Monat</p>
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
            {me.length}
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
            {totalH.toFixed(1)}h
          </p>
          <p style={{ fontSize: 12, color: "#8e8e93" }}>Gesamt</p>
        </div>
      </div>
      {me.length === 0 ? (
        <Empty icon={Clock} text="Keine Stunden in diesem Monat" />
      ) : (
        <div className="space-y-2">
          {Object.entries(byWeek)
            .reverse()
            .map(([w, entries]) => {
              const wH = entries.reduce(
                (s, e) => s + parseFloat(bStd(e.beginn, e.ende, e.pause)),
                0,
              );
              return (
                <div
                  key={w}
                  style={{
                    borderRadius: 12,
                    background: "white",
                    boxShadow: CS,
                    overflow: "hidden",
                  }}
                >
                  <div
                    className="flex justify-between items-center"
                    style={{
                      padding: "10px 16px",
                      borderBottom: "0.5px solid rgba(0,0,0,0.08)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#8e8e93",
                      }}
                    >
                      {w}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#3c3c43",
                      }}
                    >
                      {wH.toFixed(1)}h
                    </span>
                  </div>
                  <div style={{ padding: 10 }} className="space-y-1">
                    {[...entries].reverse().map((e) => {
                      const bs = data.baustellen.find(
                        (b) => b.id === e.baustelleId,
                      );
                      return (
                        <div
                          key={e.id}
                          style={{
                            padding: 10,
                            borderRadius: 10,
                            background: "#f2f2f7",
                            fontSize: 13,
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p style={{ color: "#000" }}>
                                {bs?.kunde || "?"}
                              </p>
                              <p style={{ color: "#8e8e93" }}>
                                {fDat(e.datum)} · {e.beginn}–{e.ende}
                              </p>
                            </div>
                            <span style={{ fontWeight: 600, color: "#000" }}>
                              {bStd(e.beginn, e.ende, e.pause)}h
                            </span>
                          </div>
                          <p style={{ color: "#8e8e93", marginTop: 2 }}>
                            {e.arbeit}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </ScreenLayout>
  );
};

export default MeineStd;
