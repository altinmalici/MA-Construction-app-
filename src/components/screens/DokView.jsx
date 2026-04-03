import { Plus, FileText, FileUp, Trash2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { fK, BTN, CS } from "../../utils/helpers";
import { Empty, ScreenLayout } from "../ui";

const DokView = () => {
  const { sb, chef, data, actions, show, goBack } = useApp();
  const ds = sb
    ? data.dokumente.filter((d) => d.baustelleId === sb.id)
    : data.dokumente;
  const add = async () => {
    const n = prompt("Dokumentenname:");
    if (!n) return;
    try {
      await actions.dokumente.create({
        baustelleId: sb?.id || data.baustellen[0]?.id || "",
        name: n,
        typ: "dokument",
        groesse: "–",
        datum: new Date().toISOString().split("T")[0],
      });
      show("Hinzugefügt");
    } catch (e) {
      show("Fehler", "error");
    }
  };
  const del = async (id) => {
    try {
      await actions.dokumente.remove(id);
      show("Gelöscht");
    } catch (e) {
      show("Fehler", "error");
    }
  };
  return (
    <ScreenLayout
      title="Dokumente"
      onBack={goBack}
      right={
        chef && (
          <button
            onClick={add}
            style={{
              padding: 8,
              borderRadius: 10,
              color: "white",
              background: BTN,
              border: "none",
              cursor: "pointer",
            }}
          >
            <Plus size={18} />
          </button>
        )
      }
    >
      <div className="space-y-2">
        {ds.length === 0 ? (
          <Empty
            icon={FileUp}
            text="Tippe auf + um ein Dokument hinzuzufügen"
          />
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
                  {d.groesse} · {fK(d.datum)}
                </p>
              </div>
              {chef && (
                <button
                  onClick={() => del(d.id)}
                  style={{
                    padding: 8,
                    color: "#c7c7cc",
                    background: "none",
                    border: "none",
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </ScreenLayout>
  );
};

export default DokView;
