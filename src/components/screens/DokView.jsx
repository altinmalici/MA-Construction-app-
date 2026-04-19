import { AlertTriangle, FileText, FileUp } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { fK, CS } from "../../utils/helpers";
import { Empty, ScreenLayout } from "../ui";

const DokView = () => {
  const { sb, data, goBack } = useApp();
  const ds = sb
    ? data.dokumente.filter((d) => d.baustelleId === sb.id)
    : data.dokumente;
  return (
    <ScreenLayout title="Dokumente" onBack={goBack}>
      <div
        role="status"
        style={{
          display: "flex",
          gap: 12,
          padding: 16,
          borderRadius: 12,
          background: "#FFF8E1",
          border: "0.5px solid #F0C674",
          marginBottom: 16,
        }}
      >
        <AlertTriangle
          size={20}
          style={{ color: "#B8860B", flexShrink: 0, marginTop: 2 }}
        />
        <div>
          <p
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#000",
              marginBottom: 4,
            }}
          >
            Dokumente-Upload in Entwicklung
          </p>
          <p style={{ fontSize: 13, color: "#3c3c43", lineHeight: 1.4 }}>
            Echtes Hochladen von Dateien kommt in Kürze. Bestehende Einträge
            unten sind nur Platzhalter-Namen ohne Datei-Inhalt. Bitte nach
            Feature-Start neu hochladen.
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {ds.length === 0 ? (
          <Empty icon={FileUp} text="Noch keine Einträge. Feature kommt bald." />
        ) : (
          ds.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3"
              style={{
                padding: 16,
                borderRadius: 12,
                background: "white",
                boxShadow: CS,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(0,0,0,0.06)",
                  flexShrink: 0,
                }}
              >
                <FileText size={16} style={{ color: "#8e8e93" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  style={{ fontSize: 15, fontWeight: 600, color: "#000" }}
                  className="truncate"
                >
                  {d.name}
                </p>
                <p style={{ fontSize: 13, color: "#8e8e93" }}>
                  Platzhalter · {fK(d.datum)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </ScreenLayout>
  );
};

export default DokView;
