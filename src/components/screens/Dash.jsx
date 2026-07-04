import { useMemo } from "react";
import {
  Clock,
  Building2,
  Calendar,
  AlertCircle,
  Receipt,
  ClipboardList,
  FileText,
  Plus,
  Bell,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { G, BTN, RED, P, CS, COLORS, isInMonth } from "../../utils/helpers";
import { ScreenLayout, Card } from "../ui";

const Dash = () => {
  const { data, cu, chef, nav, unread, setSb, setEm } = useApp();

  // Audit P-MEDIUM: Widget-Counts memoized — vorher O(n) filter pro
  // Render je Modul. Mit useMemo werden die Filter nur neu berechnet,
  // wenn die zugrunde liegende Datenliste sich tatsächlich ändert.
  const todayStr = new Date().toISOString().split("T")[0];

  const mb = useMemo(
    () =>
      chef
        ? data.baustellen
        : data.baustellen.filter((b) => b.mitarbeiter.includes(cu?.id)),
    [chef, data.baustellen, cu?.id],
  );
  const todayEntries = useMemo(
    () => data.stundeneintraege.filter((e) => e.datum === todayStr),
    [data.stundeneintraege, todayStr],
  );
  // BUG-FU-3: synchronisiert mit MeineStd-View (aktueller Monat).
  const meineStdEntriesMonat = useMemo(() => {
    const now = new Date();
    return data.stundeneintraege.filter(
      (e) =>
        e.mitarbeiterId === cu?.id &&
        isInMonth(e.datum, now.getMonth(), now.getFullYear()),
    ).length;
  }, [data.stundeneintraege, cu?.id]);
  const openMaengel = useMemo(
    () => data.maengel.filter((m) => m.status !== "erledigt").length,
    [data.maengel],
  );
  const todayTermine = useMemo(
    () => data.kalender.filter((t) => t.datum === todayStr).length,
    [data.kalender, todayStr],
  );
  const aktiveBst = useMemo(
    () => mb.filter((b) => b.status === "aktiv").length,
    [mb],
  );
  const heuteErfasst = useMemo(
    () =>
      chef
        ? todayEntries.length
        : todayEntries.filter((e) => e.mitarbeiterId === cu?.id).length,
    [chef, todayEntries, cu?.id],
  );
  // Mitarbeiter sieht offene Mängel nur für eigene Baustellen, sortiert
  // nach Priorität (hoch → niedrig), max 5. Chef nutzt das nicht.
  const meineOffeneMaengel = useMemo(() => {
    if (chef) return [];
    const prio = { hoch: 0, mittel: 1, niedrig: 2 };
    const myBstIds = new Set(mb.map((b) => b.id));
    return data.maengel
      .filter(
        (m) => m.status !== "erledigt" && myBstIds.has(m.baustelleId),
      )
      .sort((a, b) => (prio[a.prioritaet] ?? 9) - (prio[b.prioritaet] ?? 9))
      .slice(0, 5);
  }, [chef, data.maengel, mb]);

  if (!cu) return null;
  const vorname = cu.name.split(" ")[0];
  const initials = cu.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const widgetItems = chef
    ? [
        {
          k: "bst",
          i: Building2,
          c: COLORS.baustellen,
          l: "Baustellen",
          s: `${aktiveBst} aktiv`,
          n: mb.length,
        },
        {
          k: "ste",
          i: Clock,
          c: COLORS.stunden,
          l: "Stunden",
          s: "Zeiten erfassen",
          n: todayEntries.length,
        },
        {
          k: "kal",
          i: Calendar,
          c: COLORS.kalender,
          l: "Kalender",
          s: "Termine & Planung",
          n: todayTermine,
        },
        {
          k: "mng",
          i: AlertCircle,
          c: COLORS.maengel,
          l: "M\u00e4ngel",
          s: `${openMaengel} offen`,
          n: openMaengel,
        },
        {
          k: "kos",
          i: Receipt,
          c: COLORS.kosten,
          l: "Kosten",
          s: "Budget & Abrechnung",
          n: null,
        },
        {
          k: "btb",
          i: ClipboardList,
          c: COLORS.bautagebuch,
          l: "Bautagebuch",
          s: "Tagesberichte",
          n: data.bautagebuch.length,
        },
      ]
    : [
        {
          k: "bst",
          i: Building2,
          c: COLORS.baustellen,
          l: "Baustellen",
          s: `${mb.length} zugewiesen`,
          n: mb.length,
        },
        {
          k: "ste",
          i: Clock,
          c: COLORS.stunden,
          l: "Stunden",
          s: "Zeiten erfassen",
          n: todayEntries.filter((e) => e.mitarbeiterId === cu.id).length,
        },
        {
          k: "mst",
          i: FileText,
          c: "#3c3c43",
          l: "Meine Stunden",
          s: `${meineStdEntriesMonat} Eintr\u00e4ge diesen Monat`,
          n: null,
        },
        {
          k: "kal",
          i: Calendar,
          c: COLORS.kalender,
          l: "Kalender",
          s: "Termine",
          n: todayTermine,
        },
      ];

  return (
    <ScreenLayout>
      {/* ── Greeting header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontSize: 34,
              fontWeight: 700,
              color: "#000",
              letterSpacing: "-0.5px",
              lineHeight: 1.1,
            }}
          >
            Hallo, {vorname}
          </p>
          <p style={{ fontSize: 15, color: "#8e8e93", marginTop: 4 }}>
            {new Date().toLocaleDateString("de-DE", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            })}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {chef && (
            <button
              onClick={() => nav("notif")}
              style={{
                position: "relative",
                width: 40,
                height: 40,
                borderRadius: 20,
                background: "rgba(0,0,0,0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                cursor: "pointer",
              }}
            >
              <Bell size={20} style={{ color: "#3c3c43" }} />
              {unread > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -2,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    background: RED,
                    color: "white",
                    fontSize: 11,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 4px",
                  }}
                >
                  {unread}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => nav("profil")}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              background: G,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              cursor: "pointer",
            }}
          >
            <span style={{ color: "white", fontSize: 14, fontWeight: 700 }}>
              {initials}
            </span>
          </button>
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 20,
          overflowX: "auto",
          paddingBottom: 2,
        }}
      >
        <button
          onClick={() => nav("ste")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            borderRadius: 100,
            background: BTN,
            boxShadow: "0 2px 8px rgba(124,58,237,0.35)",
            color: "white",
            fontSize: 14,
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <Clock size={16} />
          Stunden
        </button>
        {chef && (
          <button
            onClick={() => {
              setSb(null);
              setEm(false);
              nav("bsf");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: 100,
              background: "white",
              boxShadow:
                "0 0 0 0.5px rgba(0,0,0,0.04), 0 2px 12px rgba(0,0,0,0.06)",
              color: "#000",
              fontSize: 14,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <Plus size={16} />
            Baustelle
          </button>
        )}
      </div>

      {/* ── Section: \u00dcbersicht ── */}
      <p
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#8e8e93",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          paddingBottom: 8,
        }}
      >
        Übersicht
      </p>

      {/* KPI stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          marginBottom: 24,
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
            {aktiveBst}
          </p>
          <p style={{ fontSize: 12, color: "#8e8e93", marginTop: 4 }}>Aktiv</p>
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
            {heuteErfasst}
          </p>
          <p style={{ fontSize: 12, color: "#8e8e93", marginTop: 4 }}>
            Erfasst
          </p>
        </Card>
        <Card
          padding={14}
          style={{
            textAlign: "center",
            ...(chef && openMaengel > 0
              ? { border: "0.5px solid rgba(255,59,48,0.25)" }
              : {}),
          }}
        >
          <p
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: chef && openMaengel > 0 ? RED : "#000",
              lineHeight: 1,
            }}
          >
            {chef ? openMaengel : todayTermine}
          </p>
          <p
            style={{
              fontSize: 12,
              color: chef && openMaengel > 0 ? RED : "#8e8e93",
              marginTop: 4,
            }}
          >
            {chef ? "M\u00e4ngel" : "Termine"}
          </p>
        </Card>
      </div>

      {/* ── Section: Module ── */}
      <p
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#8e8e93",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          paddingBottom: 8,
          marginTop: 24,
        }}
      >
        Module
      </p>

      {/* Widget grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 8,
        }}
      >
        {/* eslint-disable-next-line no-unused-vars -- I ist destructure-rename für JSX-Component */}
        {widgetItems.map(({ k, i: I, c, l, s, n }) => (
          <button
            key={k}
            onClick={() => nav(k)}
            style={{
              background: "white",
              borderRadius: 12,
              padding: 14,
              boxShadow: CS,
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              transition: "transform 0.15s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "rgba(0,0,0,0.09)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <I size={20} style={{ color: c }} />
              </div>
              {n !== null && n !== undefined && (
                <span
                  style={{
                    fontSize: n === 0 ? 16 : 20,
                    fontWeight: n === 0 ? 600 : 700,
                    color: n === 0 ? "#c7c7cc" : k === "mng" ? RED : "#000",
                    lineHeight: 1,
                  }}
                >
                  {n}
                </span>
              )}
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#000" }}>{l}</p>
            <p
              style={{
                fontSize: 13,
                color: k === "mng" && n > 0 ? RED : "#8e8e93",
                marginTop: 2,
              }}
            >
              {s}
            </p>
          </button>
        ))}
      </div>

      {!chef && (
        <>
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#8e8e93",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              paddingBottom: 8,
              marginTop: 24,
            }}
          >
            Offene Mängel
          </p>
          {meineOffeneMaengel.length === 0 ? (
            <Card style={{ textAlign: "center", padding: 20 }}>
              <p style={{ fontSize: 13, color: "#8e8e93" }}>
                Keine offenen Mängel auf deinen Baustellen.
              </p>
            </Card>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {meineOffeneMaengel.map((m) => {
                const bs = data.baustellen.find((b) => b.id === m.baustelleId);
                const prioColor = { hoch: RED, mittel: P, niedrig: "#8e8e93" }[
                  m.prioritaet
                ];
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      if (!bs) return;
                      setSb(bs);
                      nav("bsd");
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: 14,
                      borderRadius: 12,
                      background: "white",
                      boxShadow: CS,
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        background: prioColor,
                        flexShrink: 0,
                      }}
                      aria-label={`Priorität ${m.prioritaet}`}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: "#000",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {m.titel}
                      </p>
                      <p
                        style={{
                          fontSize: 13,
                          color: "#8e8e93",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {bs?.kunde || "—"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </ScreenLayout>
  );
};

export default Dash;
