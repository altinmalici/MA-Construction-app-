import { useState } from "react";
import { Plus, X, AlertCircle, CheckCircle, Trash2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { fK, IC, BTN, CS, P, RED, GREEN } from "../../utils/helpers";
import { ScreenLayout, Empty, Bdg, PhotoGrid } from "../ui";

const MngView = () => {
  const { sb, chef, cu, data, actions, show, goBack, trigPhoto, addN } =
    useApp();
  const [sf, setSf] = useState(false);
  const [fl, setFl] = useState("alle");
  const [mf, sMf] = useState({
    baustelleId:
      sb?.id ||
      (chef
        ? data.baustellen[0]?.id
        : data.baustellen.find((b) => b.mitarbeiter.includes(cu.id))?.id) ||
      "",
    titel: "",
    beschreibung: "",
    prioritaet: "mittel",
    zustaendig: "",
    frist: "",
    fotos: [],
  });
  const myBs = chef
    ? data.baustellen
    : data.baustellen.filter((b) => b.mitarbeiter.includes(cu.id));
  let ls = sb
    ? data.maengel.filter((m) => m.baustelleId === sb.id)
    : chef
      ? data.maengel
      : data.maengel.filter((m) => myBs.some((b) => b.id === m.baustelleId));
  if (fl !== "alle") ls = ls.filter((m) => m.status === fl);
  const save = async () => {
    if (!mf.baustelleId) {
      show("Baustelle wählen", "error");
      return;
    }
    if (!mf.titel.trim()) {
      show("Titel nötig", "error");
      return;
    }
    try {
      await actions.maengel.create({
        baustelleId: mf.baustelleId,
        titel: mf.titel,
        beschreibung: mf.beschreibung,
        prioritaet: mf.prioritaet,
        status: "offen",
        zustaendig: mf.zustaendig || null,
        erstelltAm: new Date().toISOString().split("T")[0],
        frist: mf.frist,
        fotos: mf.fotos,
      });
      addN("mangel", `Mangel: ${mf.titel}`, mf.baustelleId);
      show("Erfasst");
      setSf(false);
      sMf({ ...mf, titel: "", beschreibung: "", fotos: [] });
    } catch (e) {
      show("Fehler", "error");
    }
  };
  const upSt = async (id, st) => {
    try {
      await actions.maengel.updateStatus(id, st);
      show(st === "erledigt" ? "Erledigt" : "In Arbeit");
    } catch (e) {
      show("Fehler", "error");
    }
  };
  const delMng = async (id) => {
    if (confirm("Mangel löschen?")) {
      try {
        await actions.maengel.remove(id);
        show("Gelöscht");
      } catch (e) {
        show("Fehler", "error");
      }
    }
  };
  const pc = { hoch: RED, mittel: P, niedrig: "#8e8e93" };
  const sl = { offen: "Offen", in_arbeit: "In Arbeit", erledigt: "Erledigt" };
  const stc = { offen: RED, in_arbeit: P, erledigt: GREEN };
  return (
    <ScreenLayout
      title="Mängelmanagement"
      onBack={goBack}
      right={
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
          {!sb && (
            <select
              value={mf.baustelleId}
              onChange={(e) => sMf({ ...mf, baustelleId: e.target.value })}
              className={IC}
              style={{ background: "rgba(118,118,128,0.12)", border: "none" }}
            >
              <option value="">Baustelle...</option>
              {myBs.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.kunde}
                </option>
              ))}
            </select>
          )}
          <input
            value={mf.titel}
            onChange={(e) => sMf({ ...mf, titel: e.target.value })}
            placeholder="Mangel-Titel *"
            className={IC}
            style={{ background: "rgba(118,118,128,0.12)", border: "none" }}
          />
          <textarea
            value={mf.beschreibung}
            onChange={(e) => sMf({ ...mf, beschreibung: e.target.value })}
            placeholder="Beschreibung..."
            rows={2}
            className={IC + " resize-none"}
            style={{ background: "rgba(118,118,128,0.12)", border: "none" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            {["niedrig", "mittel", "hoch"].map((p) => (
              <button
                key={p}
                onClick={() => sMf({ ...mf, prioritaet: p })}
                className="flex-1"
                style={{
                  padding: "12px 0",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  minHeight: 44,
                  border: "none",
                  color: mf.prioritaet === p ? "white" : "#3c3c43",
                  background: mf.prioritaet === p ? pc[p] : "white",
                  boxShadow: mf.prioritaet === p ? "none" : CS,
                }}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          {chef && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 8,
              }}
            >
              <select
                value={mf.zustaendig}
                onChange={(e) => sMf({ ...mf, zustaendig: e.target.value })}
                className={IC}
              >
                <option value="">Zuständig...</option>
                {data.subunternehmer.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
                {data.users
                  .filter((u) => u.role === "mitarbeiter")
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
              <input
                type="date"
                value={mf.frist}
                onChange={(e) => sMf({ ...mf, frist: e.target.value })}
                className={IC}
              />
            </div>
          )}
          <PhotoGrid
            fotos={mf.fotos}
            onAdd={() =>
              trigPhoto((img) =>
                sMf((p) => ({ ...p, fotos: [...p.fotos, img] })),
              )
            }
            onRemove={(i) =>
              sMf((p) => ({
                ...p,
                fotos: p.fotos.filter((_, idx) => idx !== i),
              }))
            }
          />
          <button
            onClick={save}
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
            }}
          >
            <AlertCircle size={18} />
            Erfassen
          </button>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {["alle", "offen", "in_arbeit", "erledigt"].map((s) => (
          <button
            key={s}
            onClick={() => setFl(s)}
            style={{
              padding: "8px 16px",
              borderRadius: 100,
              fontSize: 13,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              ...(fl === s
                ? {
                    background: s === "alle" ? BTN : stc[s] || BTN,
                    color: "white",
                  }
                : { background: "white", boxShadow: CS, color: "#3c3c43" }),
            }}
          >
            {s === "alle" ? "Alle" : sl[s]}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {ls.length === 0 ? (
          <Empty icon={CheckCircle} text="Keine Mängel vorhanden" />
        ) : (
          ls.map((m) => {
            const bs = data.baustellen.find((b) => b.id === m.baustelleId);
            const z =
              data.subunternehmer.find((s) => s.id === m.zustaendig) ||
              data.users.find((u) => u.id === m.zustaendig);
            return (
              <div
                key={m.id}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: "white",
                  boxShadow: CS,
                }}
              >
                <div
                  className="flex items-start justify-between"
                  style={{ marginBottom: 6 }}
                >
                  <div className="flex-1">
                    <p style={{ fontSize: 15, fontWeight: 600, color: "#000" }}>
                      {m.titel}
                    </p>
                    <p style={{ fontSize: 13, color: "#8e8e93" }}>
                      {bs?.kunde}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <Bdg text={m.prioritaet} color={pc[m.prioritaet]} />
                    <Bdg text={sl[m.status]} color={stc[m.status]} />
                  </div>
                </div>
                {m.beschreibung && (
                  <p
                    style={{ fontSize: 13, color: "#8e8e93", marginBottom: 6 }}
                  >
                    {m.beschreibung}
                  </p>
                )}
                <div
                  className="flex items-center justify-between"
                  style={{ fontSize: 13 }}
                >
                  <div style={{ color: "#8e8e93" }}>
                    {z && <span>→ {z.name}</span>}
                    {m.frist && (
                      <span style={{ marginLeft: 8 }}>
                        Frist: {fK(m.frist)}
                      </span>
                    )}
                  </div>
                  {chef && m.status !== "erledigt" && (
                    <div style={{ display: "flex", gap: 8 }}>
                      {m.status === "offen" && (
                        <button
                          onClick={() => upSt(m.id, "in_arbeit")}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 10,
                            fontSize: 13,
                            background: "rgba(0,0,0,0.07)",
                            color: "#3c3c43",
                            border: "none",
                            fontWeight: 600,
                          }}
                        >
                          In Arbeit
                        </button>
                      )}
                      <button
                        onClick={() => upSt(m.id, "erledigt")}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 10,
                          fontSize: 13,
                          background: `${GREEN}15`,
                          color: GREEN,
                          border: "none",
                          fontWeight: 600,
                        }}
                      >
                        Erledigt
                      </button>
                    </div>
                  )}
                  {chef && (
                    <button
                      onClick={() => delMng(m.id)}
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
                {m.fotos?.length > 0 && (
                  <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                    {m.fotos.map((f, i) => (
                      <img
                        key={i}
                        src={f}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          objectFit: "cover",
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </ScreenLayout>
  );
};

export default MngView;
