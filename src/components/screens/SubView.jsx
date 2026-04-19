import { useState } from "react";
import { Plus, X, Briefcase, Phone, Trash2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { IC, BTN, CS } from "../../utils/helpers";
import { Empty, Bdg, ScreenLayout, Spinner, ConfirmModal, IconButton } from "../ui";
import { useSaving } from "../../hooks/useSaving";

const SubView = () => {
  const { data, actions, show, goBack } = useApp();
  const { saving, withSaving } = useSaving();
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [sf, setSf] = useState(false);
  const [fn, setFn] = useState("");
  const [fg, setFg] = useState("");
  const [ft, setFt] = useState("");
  const add = () =>
    withSaving(async () => {
      if (!fn.trim()) {
        show("Name nötig", "error");
        return;
      }
      try {
        await actions.subunternehmer.create({
          name: fn.trim(),
          gewerk: fg,
          telefon: ft,
        });
        show("Angelegt");
        setSf(false);
        setFn("");
        setFg("");
        setFt("");
      } catch (e) {
        console.error("[SubView.add]", e);
        show(e?.message || "Fehler beim Anlegen", "error");
      }
    });
  const del = (id) => setConfirmDelete(id);
  const doDelete = async () => {
    const id = confirmDelete;
    setConfirmDelete(null);
    if (!id) return;
    try {
      await actions.subunternehmer.remove(id);
      show("Gelöscht");
    } catch (e) {
      console.error("[SubView.del]", e);
      show(e?.message || "Fehler beim Löschen", "error");
    }
  };
  return (
    <ScreenLayout
      title="Subunternehmer"
      onBack={goBack}
      right={
        <IconButton
          icon={sf ? X : Plus}
          variant={sf ? "default" : "primary"}
          onClick={() => setSf(!sf)}
          ariaLabel={sf ? "Schließen" : "Subunternehmer anlegen"}
        />
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
          <input
            value={fn}
            onChange={(e) => setFn(e.target.value)}
            placeholder="Firma *"
            className={IC}
            style={{ background: "rgba(118,118,128,0.12)", border: "none" }}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 8,
            }}
          >
            <input
              value={fg}
              onChange={(e) => setFg(e.target.value)}
              placeholder="Gewerk"
              className={IC}
              style={{ background: "rgba(118,118,128,0.12)", border: "none" }}
            />
            <input
              value={ft}
              onChange={(e) => setFt(e.target.value)}
              placeholder="Telefon"
              className={IC}
              style={{ background: "rgba(118,118,128,0.12)", border: "none" }}
            />
          </div>
          <button
            onClick={add}
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
            {saving ? <Spinner size={18} color="white" /> : <Plus size={18} />}
            {saving ? "Speichere..." : "Anlegen"}
          </button>
        </div>
      )}
      <div className="space-y-2">
        {data.subunternehmer.length === 0 ? (
          <Empty
            icon={Briefcase}
            text="Tippe auf + um einen Subunternehmer anzulegen"
          />
        ) : (
          data.subunternehmer.map((s) => {
            const bs = data.baustellen.filter((b) =>
              (b.subunternehmer || []).includes(s.id),
            );
            return (
              <div
                key={s.id}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: "white",
                  boxShadow: CS,
                }}
              >
                <div
                  className="flex items-center gap-3"
                  style={{ marginBottom: 8 }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "rgba(0,0,0,0.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Briefcase size={16} style={{ color: "#3c3c43" }} />
                  </div>
                  <div className="flex-1">
                    <p style={{ fontSize: 15, color: "#000" }}>{s.name}</p>
                    <p style={{ fontSize: 13, color: "#8e8e93" }}>{s.gewerk}</p>
                  </div>
                  <IconButton
                    icon={Trash2}
                    variant="subtle"
                    iconSize={16}
                    onClick={() => del(s.id)}
                    ariaLabel="Subunternehmer löschen"
                  />
                </div>
                {s.telefon && (
                  <div
                    className="flex items-center gap-1"
                    style={{ fontSize: 13, color: "#8e8e93", marginBottom: 4 }}
                  >
                    <Phone size={11} />
                    {s.telefon}
                  </div>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {bs.length === 0 ? (
                    <span style={{ fontSize: 13, color: "#8e8e93" }}>
                      Keine Baustellen
                    </span>
                  ) : (
                    bs.map((b) => <Bdg key={b.id} text={b.kunde} />)
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      <ConfirmModal
        open={!!confirmDelete}
        title="Subunternehmer löschen?"
        message="Der Subunternehmer wird dauerhaft entfernt."
        confirmLabel="Löschen"
        cancelLabel="Abbrechen"
        destructive
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </ScreenLayout>
  );
};

export default SubView;
