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
import { G, P, BTN, RED, GREEN, CS, COLORS } from "../../utils/helpers";
import { ScreenLayout } from "../ui";

const Dash = () => {
  const { data, cu, chef, nav, unread, setSb, setEm } = useApp();
  const mb = chef
    ? data.baustellen
    : data.baustellen.filter((b) => b.mitarbeiter.includes(cu.id));
  const todayStr = new Date().toISOString().split("T")[0];
  const todayEntries = data.stundeneintraege.filter(
    (e) => e.datum === todayStr,
  );
  const openMaengel = data.maengel.filter(
    (m) => m.status !== "erledigt",
  ).length;
  const todayTermine = data.kalender.filter((t) => t.datum === todayStr).length;
  const vorname = cu.name.split(" ")[0];
  const initials = cu.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const aktiveBst = mb.filter((b) => b.status === "aktiv").length;
  const heuteErfasst = chef
    ? todayEntries.length
    : todayEntries.filter((e) => e.mitarbeiterId === cu.id).length;

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
          s: `${data.stundeneintraege.filter((e) => e.mitarbeiterId === cu.id).length} Eintr\u00e4ge`,
          n: null,
        },
        {
          k: "mng",
          i: AlertCircle,
          c: COLORS.maengel,
          l: "M\u00e4ngel melden",
          s: "Problem melden",
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
            background: "white",
            boxShadow:
              "0 1px 3px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.04)",
            color: "#000",
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
                "0 1px 3px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.04)",
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
        {!chef && (
          <button
            onClick={() => nav("mng")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: 100,
              background: "white",
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.04)",
              color: "#000",
              fontSize: 14,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <AlertCircle size={16} />
            Mangel melden
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
        \u00dcbersicht
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
            {aktiveBst}
          </p>
          <p style={{ fontSize: 12, color: "#8e8e93", marginTop: 4 }}>Aktiv</p>
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
            {heuteErfasst}
          </p>
          <p style={{ fontSize: 12, color: "#8e8e93", marginTop: 4 }}>
            Erfasst
          </p>
        </div>
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 14,
            boxShadow: CS,
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
        </div>
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
    </ScreenLayout>
  );
};

export default Dash;
