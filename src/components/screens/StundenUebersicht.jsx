import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Clock, Download } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { bStdNum, fK, P, isInMonth, isMitarbeiterEntry } from "../../utils/helpers";
import { buildLohnCsv, downloadCsv } from "../../utils/lohnexport";
import { ScreenLayout, Empty, IconButton, StundenDetailModal, Card } from "../ui";

const StundenUebersicht = () => {
  const { data, cu, chef, actions, show, goBack } = useApp();
  const now = new Date();
  const [mo, setMo] = useState(now.getMonth());
  const [jr, setJr] = useState(now.getFullYear());
  const [open, setOpen] = useState(null);
  // BUG-FU-1: Click auf Einzeleintrag → Detail-Modal mit Foto-Anzeige.
  const [detail, setDetail] = useState(null);
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
  const fH = (h) => (Number.isInteger(h) ? h + "h" : h.toFixed(1) + "h");

  // 6-06 Prio 1: byUser-Pipeline memoizen. Vorher pro Render:
  //   me.filter()  +  allUsers.map(filter+reduce+forEach)  +  byUser.reduce
  // bei 10k Stunden × 20 Mitarbeitern = ~200k Operationen pro Render.
  // Jetzt: O(me + me) durch userById/baustelleById-Maps; Re-Compute nur
  // wenn data oder Monats-Selektion sich ändert.
  const me = useMemo(
    () =>
      data.stundeneintraege.filter(
        (e) => isInMonth(e.datum, mo, jr) && isMitarbeiterEntry(e),
      ),
    [data.stundeneintraege, mo, jr],
  );

  const allUsers = useMemo(
    () =>
      [
        ...data.users.filter((u) => u.role === "mitarbeiter"),
        ...(cu ? [cu] : []),
      ].filter((u, i, a) => a.findIndex((x) => x.id === u.id) === i),
    [data.users, cu],
  );

  const byUser = useMemo(() => {
    // 1 Pass über me: Bucket-Aggregation pro User → Lookup-Map.
    const baustelleById = new Map(data.baustellen.map((b) => [b.id, b]));
    const acc = new Map(); // uid → { std, entries, byBs }
    me.forEach((e) => {
      let bucket = acc.get(e.mitarbeiterId);
      if (!bucket) {
        bucket = { std: 0, entries: [], byBs: {} };
        acc.set(e.mitarbeiterId, bucket);
      }
      const std = bStdNum(e.beginn, e.ende, e.pause);
      bucket.std += std;
      bucket.entries.push(e);
      const k = baustelleById.get(e.baustelleId)?.kunde || "Unbekannt";
      bucket.byBs[k] = (bucket.byBs[k] || 0) + std;
    });
    return allUsers
      .map((u) => {
        const b = acc.get(u.id);
        return b ? { user: u, ...b } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.std - a.std);
  }, [allUsers, me, data.baustellen]);

  const totalStd = useMemo(
    () => byUser.reduce((s, u) => s + u.std, 0),
    [byUser],
  );
  const arbTage = useMemo(
    () => new Set(me.map((e) => e.datum)).size,
    [me],
  );
  const mitCount = byUser.length;

  const monthLabel = new Date(jr, mo).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });
  const exportLohn = () => {
    const csv = buildLohnCsv({
      entries: me,
      hoursOf: (e) => bStdNum(e.beginn, e.ende, e.pause),
      userById: new Map(data.users.map((u) => [u.id, u])),
      baustelleById: new Map(data.baustellen.map((b) => [b.id, b])),
      monthLabel,
    });
    downloadCsv(`Lohnexport_${jr}-${String(mo + 1).padStart(2, "0")}.csv`, csv);
  };

  const toggleFreigabe = async (ids, currentlyAll) => {
    try {
      await actions.stundeneintraege.setFreigabe(ids, !currentlyAll);
      show(currentlyAll ? "Freigabe zurückgenommen" : "Monat freigegeben");
    } catch (e) {
      show(e?.message || "Freigabe fehlgeschlagen", "error");
    }
  };

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
      <Card
        padding={14}
        style={{
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <IconButton
          icon={ChevronLeft}
          variant="default"
          onClick={pv}
          ariaLabel="Vorheriger Monat"
          style={{ borderRadius: 22 }}
        />
        <span style={{ fontSize: 17, fontWeight: 600, color: "#000" }}>
          {new Date(jr, mo).toLocaleDateString("de-DE", {
            month: "long",
            year: "numeric",
          })}
        </span>
        <IconButton
          icon={ChevronRight}
          variant="default"
          onClick={nx}
          ariaLabel="Nächster Monat"
          style={{ borderRadius: 22 }}
        />
      </Card>
      {/* KPI */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <Card padding={14} style={{ textAlign: "center" }}>
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
        </Card>
        <Card padding={14} style={{ textAlign: "center" }}>
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
        </Card>
        <Card padding={14} style={{ textAlign: "center" }}>
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
        </Card>
      </div>
      {/* Lohnexport (nur Chef) */}
      {chef && (
        <button
          onClick={exportLohn}
          disabled={byUser.length === 0}
          style={{
            width: "100%",
            padding: "14px 24px",
            borderRadius: 14,
            color: "white",
            fontWeight: 600,
            fontSize: 15,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: P,
            border: "none",
            minHeight: 44,
            marginBottom: 16,
            opacity: byUser.length === 0 ? 0.5 : 1,
            cursor: byUser.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          <Download size={18} />
          Lohnexport {monthLabel} (CSV)
        </button>
      )}

      {/* Pro Mitarbeiter */}
      {byUser.length === 0 ? (
        <Empty icon={Clock} text="Keine Einträge in diesem Monat" />
      ) : (
        <div className="space-y-2">
          {byUser.map(({ user: u, std, entries, byBs }) => {
            const ids = entries.map((e) => e.id);
            const allFrei =
              entries.length > 0 && entries.every((e) => e.freigegeben);
            return (
            <Card key={u.id} padding={0} style={{ overflow: "hidden" }}>
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
                  {allFrei && (
                    <span
                      title="Abgerechnet / freigegeben"
                      style={{ color: "#34c759", fontSize: 16, fontWeight: 700 }}
                    >
                      ✓
                    </span>
                  )}
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
                  {chef && (
                    <button
                      onClick={() => toggleFreigabe(ids, allFrei)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 10,
                        fontSize: 14,
                        fontWeight: 600,
                        marginBottom: 12,
                        minHeight: 44,
                        border: allFrei ? "1px solid #d1d5db" : "none",
                        background: allFrei ? "transparent" : "#34c759",
                        color: allFrei ? "#8e8e93" : "white",
                        cursor: "pointer",
                      }}
                    >
                      {allFrei
                        ? "✓ Abgerechnet – Freigabe aufheben"
                        : "Monat als abgerechnet freigeben"}
                    </button>
                  )}
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
                        const h = bStdNum(e.beginn, e.ende, e.pause);
                        return (
                          <button
                            key={e.id}
                            onClick={() => setDetail({ eintrag: e, user: u })}
                            style={{
                              padding: "10px 12px",
                              borderRadius: 10,
                              background: "#f2f2f7",
                              fontSize: 13,
                              border: "none",
                              width: "100%",
                              textAlign: "left",
                              cursor: "pointer",
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
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </Card>
            );
          })}
        </div>
      )}
      <StundenDetailModal
        open={!!detail}
        eintrag={detail?.eintrag}
        baustelle={
          detail
            ? data.baustellen.find((b) => b.id === detail.eintrag.baustelleId)
            : null
        }
        userName={detail?.user?.name}
        onClose={() => setDetail(null)}
      />
    </ScreenLayout>
  );
};

export default StundenUebersicht;
