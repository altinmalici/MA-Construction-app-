import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { bStd, fK, P, CS } from "../../utils/helpers";
import { ScreenLayout, Empty } from "../ui";

const StundenUebersicht = () => {
  const { data, cu, goBack } = useApp();
  const now = new Date();
  const [mo, setMo] = useState(now.getMonth());
  const [jr, setJr] = useState(now.getFullYear());
  const [open, setOpen] = useState(null);
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
  const me = data.stundeneintraege.filter((e) => {
    const d = new Date(e.datum);
    return d.getMonth() === mo && d.getFullYear() === jr;
  });
  const fH = (h) => (Number.isInteger(h) ? h + "h" : h.toFixed(1) + "h");
  const allUsers = [
    ...data.users.filter((u) => u.role === "mitarbeiter"),
    cu,
  ].filter((u, i, a) => a.findIndex((x) => x.id === u.id) === i);
  const byUser = allUsers
    .map((u) => {
      const ue = me.filter((e) => e.mitarbeiterId === u.id);
      if (ue.length === 0) return null;
      const std = ue.reduce(
        (s, e) => s + parseFloat(bStd(e.beginn, e.ende, e.pause)),
        0,
      );
      const byBs = {};
      ue.forEach((e) => {
        const b = data.baustellen.find((x) => x.id === e.baustelleId);
        const k = b?.kunde || "Unbekannt";
        if (!byBs[k]) byBs[k] = 0;
        byBs[k] += parseFloat(bStd(e.beginn, e.ende, e.pause));
      });
      return { user: u, std, entries: ue, byBs };
    })
    .filter(Boolean)
    .sort((a, b) => b.std - a.std);
  const totalStd = byUser.reduce((s, u) => s + u.std, 0);
  const arbTage = [...new Set(me.map((e) => e.datum))].length;
  const mitCount = byUser.length;
  return (
    <ScreenLayout>
      <div style={{ paddingBottom: 4 }}>
        <button
          onClick={goBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            color: P,
            background: "none",
            border: "none",
          }}
        >
          <ChevronLeft size={20} />
          <span style={{ fontSize: 17 }}>Zurück</span>
        </button>
      </div>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: "#000",
          letterSpacing: "-0.5px",
          margin: 0,
        }}
      >
        Stundenübersicht
      </h1>
      {/* Monatsauswahl */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 14,
          boxShadow: CS,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          onClick={pv}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.04)",
            border: "none",
          }}
        >
          <ChevronLeft size={18} style={{ color: "#8e8e93" }} />
        </button>
        <span style={{ fontSize: 17, fontWeight: 600, color: "#000" }}>
          {new Date(jr, mo).toLocaleDateString("de-DE", {
            month: "long",
            year: "numeric",
          })}
        </span>
        <button
          onClick={nx}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.04)",
            border: "none",
          }}
        >
          <ChevronRight size={18} style={{ color: "#8e8e93" }} />
        </button>
      </div>
      {/* KPI */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 14,
            boxShadow: CS,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#000",
              lineHeight: 1,
            }}
          >
            {fH(totalStd)}
          </p>
          <p style={{ fontSize: 12, color: "#8e8e93", marginTop: 4 }}>Gesamt</p>
        </div>
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 14,
            boxShadow: CS,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#000",
              lineHeight: 1,
            }}
          >
            {arbTage}
          </p>
          <p style={{ fontSize: 12, color: "#8e8e93", marginTop: 4 }}>
            Arbeitstage
          </p>
        </div>
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 14,
            boxShadow: CS,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#000",
              lineHeight: 1,
            }}
          >
            {mitCount}
          </p>
          <p style={{ fontSize: 12, color: "#8e8e93", marginTop: 4 }}>
            Mitarbeiter
          </p>
        </div>
      </div>
      {/* Pro Mitarbeiter */}
      {byUser.length === 0 ? (
        <Empty icon={Clock} text="Keine Einträge in diesem Monat" />
      ) : (
        <div className="space-y-2">
          {byUser.map(({ user: u, std, entries, byBs }) => (
            <div
              key={u.id}
              style={{
                background: "white",
                borderRadius: 12,
                boxShadow: CS,
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => setOpen(open === u.id ? null : u.id)}
                style={{
                  width: "100%",
                  padding: 16,
                  background: "none",
                  border: "none",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      background: "rgba(0,0,0,0.09)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#3c3c43",
                      }}
                    >
                      {u.name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .toUpperCase()}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: "#000",
                      }}
                    >
                      {u.name}
                    </p>
                  </div>
                  <span
                    style={{ fontSize: 20, fontWeight: 700, color: "#000" }}
                  >
                    {fH(std)}
                  </span>
                  <ChevronRight
                    size={16}
                    style={{
                      color: "#c7c7cc",
                      transform: open === u.id ? "rotate(90deg)" : "none",
                      transition: "transform 0.15s ease",
                    }}
                  />
                </div>
                {/* Baustellen-Aufschlüsselung */}
                <div
                  style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: "0.5px solid rgba(0,0,0,0.08)",
                  }}
                >
                  {Object.entries(byBs).map(([name, h], i) => (
                    <div
                      key={name}
                      className="flex justify-between"
                      style={{
                        padding: "4px 0",
                        borderTop:
                          i > 0 ? "0.5px solid rgba(0,0,0,0.08)" : "none",
                      }}
                    >
                      <span style={{ fontSize: 13, color: "#8e8e93" }}>
                        {name}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#000",
                        }}
                      >
                        {fH(h)}
                      </span>
                    </div>
                  ))}
                </div>
              </button>
              {/* Einzeleinträge aufgeklappt */}
              {open === u.id && (
                <div style={{ padding: "0 16px 16px" }}>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#8e8e93",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      marginBottom: 8,
                    }}
                  >
                    Einzeleinträge
                  </p>
                  <div className="space-y-1.5">
                    {[...entries]
                      .sort((a, b) => b.datum.localeCompare(a.datum))
                      .map((e) => {
                        const bs = data.baustellen.find(
                          (x) => x.id === e.baustelleId,
                        );
                        const h = parseFloat(bStd(e.beginn, e.ende, e.pause));
                        return (
                          <div
                            key={e.id}
                            style={{
                              padding: "10px 12px",
                              borderRadius: 10,
                              background: "#f2f2f7",
                              fontSize: 13,
                            }}
                          >
                            <div className="flex justify-between">
                              <span style={{ color: "#000", fontWeight: 600 }}>
                                {fK(e.datum)}
                              </span>
                              <span style={{ fontWeight: 700, color: "#000" }}>
                                {fH(h)}
                              </span>
                            </div>
                            <p style={{ color: "#8e8e93", marginTop: 2 }}>
                              {e.beginn}–{e.ende}, Pause {e.pause} Min
                              {bs ? " · " + bs.kunde : ""}
                            </p>
                            {e.arbeit && (
                              <p style={{ color: "#8e8e93", marginTop: 2 }}>
                                {e.arbeit}
                              </p>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </ScreenLayout>
  );
};

export default StundenUebersicht;
