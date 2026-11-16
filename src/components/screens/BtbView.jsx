import { useState } from "react";
import { Plus, X, Save, ClipboardList, Trash2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { fDat, todayIso, IC, BTN, RED } from "../../utils/helpers";
import { fehlerText } from "../../utils/errors";
import { Empty, ScreenLayout, Spinner, ConfirmModal, IconButton, Card, WI } from "../ui";
import { useSaving } from "../../hooks/useSaving";

const WETTER = [
  { v: "sonnig", l: "Sonnig" },
  { v: "bewölkt", l: "Bewölkt" },
  { v: "regen", l: "Regen" },
  { v: "schnee", l: "Schnee" },
  { v: "wind", l: "Wind" },
];

const BtbView = () => {
  const { sb, chef, cu, data, actions, show, goBack } = useApp();
  const { saving, withSaving } = useSaving();
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [sf, setSf] = useState(false);
  const ls = sb
    ? data.bautagebuch.filter((b) => b.baustelleId === sb.id)
    : data.bautagebuch;
  const [bf, sBf] = useState({
    baustelleId: "",
    datum: todayIso(),
    wetter: "",
    temperatur: "",
    anwesende: [],
    arbeiten: "",
    besonderheiten: "",
    behinderungen: "",
  });
  // Baustelle wird zur Renderzeit bestimmt, nicht einmalig beim Öffnen:
  // Früher wurde sie im Start-State festgeschrieben. Waren die Daten da noch
  // nicht geladen, blieb sie leer — und bei nur EINER Baustelle war die
  // Auswahl ausgeblendet, sodass Speichern immer mit "Baustelle wählen"
  // scheiterte.
  const myBs = chef
    ? data.baustellen
    : data.baustellen.filter((b) => b.mitarbeiter?.includes(cu?.id));
  // Eine früher gewählte Baustelle zählt nur, solange es sie noch gibt.
  const gewaehlt = myBs.some((b) => b.id === bf.baustelleId)
    ? bf.baustelleId
    : "";
  const baustelleId =
    sb?.id || gewaehlt || (myBs.length === 1 ? myBs[0].id : "");
  // Neueste zuerst — nach Datum, nicht nach Anlage-Reihenfolge.
  // reverse() vorab: bei gleichem Datum steht der zuletzt angelegte oben.
  const sorted = [...ls].reverse().sort((a, b) =>
    a.datum === b.datum ? 0 : a.datum < b.datum ? 1 : -1,
  );
  const tgA = (id) =>
    sBf((p) => ({
      ...p,
      anwesende: p.anwesende.includes(id)
        ? p.anwesende.filter((x) => x !== id)
        : [...p.anwesende, id],
    }));
  const save = () =>
    withSaving(async () => {
      if (!baustelleId) {
        show(
          myBs.length === 0
            ? "Keine Baustelle vorhanden – bitte zuerst eine Baustelle anlegen"
            : "Baustelle wählen",
          "error",
        );
        return;
      }
      if (!bf.datum) {
        show("Datum wählen", "error");
        return;
      }
      const temp = bf.temperatur === "" ? null : Number(bf.temperatur);
      if (temp !== null && (!Number.isInteger(temp) || temp < -40 || temp > 50)) {
        show("Temperatur als ganze Zahl in °C angeben", "error");
        return;
      }
      if (!bf.arbeiten.trim()) {
        show("Arbeiten beschreiben", "error");
        return;
      }
      try {
        await actions.bautagebuch.create({
          baustelleId,
          datum: bf.datum,
          wetter: bf.wetter || null,
          temperatur: temp,
          anwesende: bf.anwesende,
          arbeiten: bf.arbeiten,
          besonderheiten: bf.besonderheiten,
          behinderungen: bf.behinderungen,
        });
        show("Gespeichert");
        setSf(false);
        sBf({
          ...bf,
          wetter: "",
          temperatur: "",
          arbeiten: "",
          besonderheiten: "",
          behinderungen: "",
          anwesende: [],
        });
      } catch (e) {
        console.error("[BtbView.save]", e);
        show(
          `Eintrag nicht gespeichert: ${fehlerText(e, "Unbekannter Fehler – bitte erneut versuchen.")}`,
          "error",
        );
      }
    });
  const delBtb = (id) => setConfirmDelete(id);
  const doDeleteBtb = async () => {
    const id = confirmDelete;
    setConfirmDelete(null);
    if (!id) return;
    try {
      await actions.bautagebuch.remove(id);
      show("Gelöscht");
    } catch (e) {
      console.error("[BtbView.delBtb]", e);
      show(`Nicht gelöscht: ${fehlerText(e, "Bitte erneut versuchen.")}`, "error");
    }
  };
  return (
    <ScreenLayout
      title="Bautagebuch"
      onBack={goBack}
      right={
        chef && (
          <IconButton
            icon={sf ? X : Plus}
            variant={sf ? "default" : "primary"}
            onClick={() => setSf(!sf)}
            ariaLabel={sf ? "Schließen" : "Eintrag erstellen"}
          />
        )
      }
    >
      {sf && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            paddingBottom: 20,
            marginBottom: 16,
            borderBottom: "0.5px solid rgba(0,0,0,0.08)",
          }}
        >
          {!sb && myBs.length > 1 && (
            <select
              value={baustelleId}
              onChange={(e) => sBf({ ...bf, baustelleId: e.target.value })}
              className={IC}
              aria-label="Baustelle"
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
          )}
          {/* Bei genau einer Baustelle (oder aus der Baustelle heraus geöffnet)
              gibt es nichts zu wählen — trotzdem zeigen, wohin gespeichert wird. */}
          {(sb || myBs.length === 1) && baustelleId && (
            <p style={{ fontSize: 13, color: "#8e8e93" }}>
              Baustelle:{" "}
              <span style={{ color: "#000", fontWeight: 600 }}>
                {data.baustellen.find((b) => b.id === baustelleId)?.kunde ||
                  sb?.kunde}
              </span>
            </p>
          )}
          <input
            type="date"
            value={bf.datum}
            onChange={(e) => sBf({ ...bf, datum: e.target.value })}
            className={IC}
            aria-label="Datum"
            style={{ background: "rgba(118,118,128,0.12)", border: "none" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={bf.wetter}
              onChange={(e) => sBf({ ...bf, wetter: e.target.value })}
              className={IC}
              aria-label="Wetter"
              style={{ flex: 2 }}
            >
              <option value="">Wetter (optional)</option>
              {WETTER.map((w) => (
                <option key={w.v} value={w.v}>
                  {w.l}
                </option>
              ))}
            </select>
            <input
              value={bf.temperatur}
              onChange={(e) =>
                sBf({ ...bf, temperatur: e.target.value.replace(/[^0-9-]/g, "") })
              }
              placeholder="°C"
              // Text-Tastatur: der iOS-Ziffernblock hat kein Minus (Frost!).
              inputMode="text"
              autoCapitalize="none"
              autoCorrect="off"
              aria-label="Temperatur in Grad Celsius"
              className={IC}
              style={{ flex: 1 }}
            />
          </div>
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
                      padding: "8px 14px",
                      minHeight: 44,
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
              marginTop: 4,
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
      <div
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        {ls.length === 0 ? (
          <Empty
            icon={ClipboardList}
            text={
              chef
                ? "Tippe auf + um einen Eintrag zu erstellen"
                : "Noch keine Einträge. Das Bautagebuch führt der Chef."
            }
          />
        ) : (
          sorted.map((e) => {
            const bs = data.baustellen.find((b) => b.id === e.baustelleId);
            return (
              <Card key={e.id}>
                <div
                  className="flex justify-between items-start"
                  style={{ marginBottom: 6 }}
                >
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: "#000" }}>
                      {bs?.kunde}
                    </p>
                    <p
                      style={{
                        fontSize: 13,
                        color: "#8e8e93",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {fDat(e.datum)}
                      {e.wetter && (
                        <WI w={e.wetter} style={{ width: 14, height: 14 }} />
                      )}
                      {e.temperatur !== null && e.temperatur !== undefined && (
                        <span>{e.temperatur} °C</span>
                      )}
                    </p>
                  </div>
                  {chef && (
                    <IconButton
                      icon={Trash2}
                      variant="subtle"
                      iconSize={16}
                      onClick={() => delBtb(e.id)}
                      ariaLabel="Eintrag löschen"
                    />
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
              </Card>
            );
          })
        )}
      </div>
      <ConfirmModal
        open={!!confirmDelete}
        title="Eintrag löschen?"
        message="Der Bautagebuch-Eintrag wird dauerhaft entfernt."
        confirmLabel="Löschen"
        cancelLabel="Abbrechen"
        destructive
        onConfirm={doDeleteBtb}
        onCancel={() => setConfirmDelete(null)}
      />
    </ScreenLayout>
  );
};

export default BtbView;
