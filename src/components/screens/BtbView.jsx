import { useState } from "react";
import { Plus, X, Save, ClipboardList, Trash2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { fDat, IC, BTN, RED, CS } from "../../utils/helpers";
import { Empty, ScreenLayout, Spinner } from "../ui";
import { useSaving } from "../../hooks/useSaving";

const BtbView = () => {
  const { sb, chef, cu, data, actions, show, goBack } = useApp();
  const { saving, withSaving } = useSaving();
  const [sf, setSf] = useState(false);
  const ls = sb
    ? data.bautagebuch.filter((b) => b.baustelleId === sb.id)
    : data.bautagebuch;
  const [bf, sBf] = useState({
    baustelleId:
      sb?.id ||
      (chef
        ? data.baustellen[0]?.id || ""
        : data.baustellen.find((b) => b.mitarbeiter?.includes(cu?.id))?.id ||
          ""),
    datum: new Date().toISOString().split("T")[0],
    anwesende: [],
    arbeiten: "",
    besonderheiten: "",
    behinderungen: "",
  });
  const tgA = (id) =>
    sBf((p) => ({
      ...p,
      anwesende: p.anwesende.includes(id)
        ? p.anwesende.filter((x) => x !== id)
        : [...p.anwesende, id],
    }));
  const save = () =>
    withSaving(async () => {
      if (!bf.baustelleId) {
        show("Baustelle wählen", "error");
        return;
      }
      if (!bf.arbeiten.trim()) {
        show("Arbeiten beschreiben", "error");
        return;
      }
      try {
        await actions.bautagebuch.create({
          baustelleId: bf.baustelleId,
          datum: bf.datum,
          anwesende: bf.anwesende,
          arbeiten: bf.arbeiten,
          besonderheiten: bf.besonderheiten,
          behinderungen: bf.behinderungen,
        });
        show("Gespeichert");
        setSf(false);
        sBf({
          ...bf,
          arbeiten: "",
          besonderheiten: "",
          behinderungen: "",
          anwesende: [],
        });
      } catch (e) {
        console.error("[BtbView.save]", e);
        show(e?.message || "Fehler beim Speichern", "error");
      }
    });
  const delBtb = async (id) => {
    if (confirm("Eintrag löschen?")) {
      try {
        await actions.bautagebuch.remove(id);
        show("Gelöscht");
      } catch (e) {
        console.error("[BtbView.delBtb]", e);
        show(e?.message || "Fehler beim Löschen", "error");
      }
    }
  };
  return (
    <ScreenLayout
      title="Bautagebuch"
      onBack={goBack}
      right={
        chef && (
          <button
            onClick={() => setSf(!sf)}
            style={{
              padding: 8,
              borderRadius: 10,
              background: sf ? "rgba(0,0,0,0.05)" : BTN,
              border: "none",
              cursor: "pointer",
            }}
          >
            {sf ? (
              <X size={18} style={{ color: "#3c3c43" }} />
            ) : (
              <Plus size={18} style={{ color: "white" }} />
            )}
          </button>
        )
      }
    >
      {sf && (
        <div
          className="space-y-2"
          style={{
            paddingBottom: 16,
            borderBottom: "0.5px solid rgba(0,0,0,0.08)",
          }}
        >
          {!sb &&
            (() => {
              const myBs = chef
                ? data.baustellen
                : data.baustellen.filter((b) => b.mitarbeiter?.includes(cu?.id));
              if (myBs.length <= 1) return null;
              return (
                <select
                  value={bf.baustelleId}
                  onChange={(e) => sBf({ ...bf, baustelleId: e.target.value })}
                  className={IC}
                  style={{
                    background: "rgba(118,118,128,0.12)",
                    border: "none",
                  }}
                >
                  <option value="">Baustelle...</option>
                  {myBs.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.kunde}
                    </option>
                  ))}
                </select>
              );
            })()}
          <input
            type="date"
            value={bf.datum}
            onChange={(e) => sBf({ ...bf, datum: e.target.value })}
            className={IC}
            style={{ background: "rgba(118,118,128,0.12)", border: "none" }}
          />
          <div>
            <p style={{ fontSize: 13, color: "#8e8e93", marginBottom: 4 }}>
              Anwesende
            </p>
            <div className="flex flex-wrap gap-2">
              {data.users
                .filter((u) => u.role === "mitarbeiter")
                .map((u) => (
                  <button
                    key={u.id}
                    onClick={() => tgA(u.id)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      border: "none",
                      color: bf.anwesende.includes(u.id) ? "white" : "#8e8e93",
                      background: bf.anwesende.includes(u.id) ? BTN : "#f2f2f7",
                    }}
                  >
                    {u.name}
                  </button>
                ))}
            </div>
          </div>
          <textarea
            value={bf.arbeiten}
            onChange={(e) => sBf({ ...bf, arbeiten: e.target.value })}
            placeholder="Arbeiten *"
            rows={2}
            className={IC + " resize-none"}
          />
          <input
            value={bf.besonderheiten}
            onChange={(e) => sBf({ ...bf, besonderheiten: e.target.value })}
            placeholder="Besonderheiten"
            className={IC}
          />
          <input
            value={bf.behinderungen}
            onChange={(e) => sBf({ ...bf, behinderungen: e.target.value })}
            placeholder="Behinderungen"
            className={IC}
          />
          <button
            onClick={save}
            disabled={saving}
            style={{
              width: "100%",
              padding: "16px 24px",
              borderRadius: 14,
              color: "white",
              fontWeight: 600,
              fontSize: 17,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: BTN,
              boxShadow: "0 2px 8px rgba(124,58,237,0.35)",
              border: "none",
              opacity: saving ? 0.6 : 1,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? <Spinner size={18} color="white" /> : <Save size={18} />}
            {saving ? "Speichere..." : "Speichern"}
          </button>
        </div>
      )}
      <div className="space-y-2">
        {ls.length === 0 ? (
          <Empty
            icon={ClipboardList}
            text="Tippe auf + um einen Eintrag zu erstellen"
          />
        ) : (
          [...ls].reverse().map((e) => {
            const bs = data.baustellen.find((b) => b.id === e.baustelleId);
            return (
              <div
                key={e.id}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: "white",
                  boxShadow: CS,
                }}
              >
                <div
                  className="flex justify-between items-start"
                  style={{ marginBottom: 6 }}
                >
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: "#000" }}>
                      {bs?.kunde}
                    </p>
                    <p style={{ fontSize: 13, color: "#8e8e93" }}>
                      {fDat(e.datum)}
                    </p>
                  </div>
                  {chef && (
                    <button
                      onClick={() => delBtb(e.id)}
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
                <p style={{ fontSize: 13, color: "#3c3c43", marginBottom: 4 }}>
                  {e.arbeiten}
                </p>
                {e.besonderheiten && (
                  <p style={{ fontSize: 13, color: "#3c3c43" }}>
                    ⚡ {e.besonderheiten}
                  </p>
                )}
                {e.behinderungen && (
                  <p style={{ fontSize: 13, color: RED }}>
                    ⛔ {e.behinderungen}
                  </p>
                )}
                {e.anwesende?.length > 0 && (
                  <p style={{ fontSize: 13, color: "#8e8e93", marginTop: 4 }}>
                    {e.anwesende
                      .map((id) => data.users.find((x) => x.id === id)?.name)
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </ScreenLayout>
  );
};

export default BtbView;
