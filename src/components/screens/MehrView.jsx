import {
  BarChart3,
  Eye,
  FileText,
  ClipboardList,
  Receipt,
  AlertCircle,
  Package,
  Users,
  Briefcase,
  User,
  Bell,
  ChevronRight,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { CS } from "../../utils/helpers";
import { ScreenLayout } from "../ui";

const MehrView = () => {
  const { data, cu, nav, unread, prevV, goBack, setSb } =
    useApp();
  const sections = [
    {
      title: "Berichte",
      items: [
        {
          k: "suo",
          i: BarChart3,
          l: "Stundenübersicht",
          s: "Monatsübersicht pro Mitarbeiter",
        },
        { k: "tag", i: Eye, l: "Tagesübersicht", s: "Alle Einträge des Tages" },
        {
          k: "reg",
          i: FileText,
          l: "Regieberichte",
          s: "Auto-generiert & druckbar",
        },
        {
          k: "btb",
          i: ClipboardList,
          l: "Bautagebuch",
          s: "Tagesberichte dokumentieren",
        },
      ],
    },
    {
      title: "Verwaltung",
      items: [
        {
          k: "kos",
          i: Receipt,
          l: "Kostenübersicht",
          s: "Budget & Abrechnung",
        },
        {
          k: "mng",
          i: AlertCircle,
          l: "Mängelmanagement",
          s: `${data.maengel.filter((m) => m.status !== "erledigt").length} offen`,
        },
        {
          k: "mat",
          i: Package,
          l: "Materialübersicht",
          s: "Verbrauch pro Baustelle",
        },
      ],
    },
    {
      title: "Team",
      items: [
        {
          k: "mit",
          i: Users,
          l: "Handwerker",
          s:
            data.users.filter((u) => u.role === "mitarbeiter").length === 1
              ? "1 Person"
              : `${data.users.filter((u) => u.role === "mitarbeiter").length} Personen`,
        },
        {
          k: "sub",
          i: Briefcase,
          l: "Subunternehmer",
          s:
            data.subunternehmer.length === 1
              ? "1 Firma"
              : `${data.subunternehmer.length} Firmen`,
        },
      ],
    },
    {
      title: "Konto",
      items: [
        { k: "profil", i: User, l: "Mein Profil", s: cu?.name },
        {
          k: "notif",
          i: Bell,
          l: "Mitteilungen",
          s: `${unread} ungelesen`,
          badge: unread,
        },
      ],
    },
  ];
  return (
    <ScreenLayout large title="Mehr" onBack={prevV ? goBack : undefined}>
      {sections.map((sec, si) => (
        <div key={sec.title} style={{ marginBottom: 24 }}>
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
            {sec.title}
          </p>
          <div
            style={{
              background: "white",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: CS,
            }}
          >
            {sec.items.map(({ k, i: I, l, s, badge }, idx) => (
              <button
                key={k}
                onClick={() => {
                  if (k === "mng") setSb(null);
                  nav(k);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  textAlign: "left",
                  padding: "12px 16px",
                  borderTop: idx > 0 ? "0.5px solid rgba(0,0,0,0.08)" : "none",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
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
                  <I size={18} style={{ color: "#3c3c43" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, color: "#000" }}>{l}</p>
                  <p
                    style={{
                      fontSize: 13,
                      color: "#8e8e93",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s}
                  </p>
                </div>
                {badge > 0 && (
                  <span
                    style={{
                      background: "#FF3B30",
                      color: "white",
                      fontSize: 13,
                      fontWeight: 600,
                      minWidth: 22,
                      height: 22,
                      borderRadius: 11,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 6px",
                    }}
                  >
                    {badge}
                  </span>
                )}
                <ChevronRight size={18} style={{ color: "#c7c7cc" }} />
              </button>
            ))}
          </div>
        </div>
      ))}
    </ScreenLayout>
  );
};

export default MehrView;
