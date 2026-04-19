import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Save, Trash2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { fDat, fK, IC, BTN, CS, P, PD } from "../../utils/helpers";
import { ScreenLayout, Spinner, ConfirmModal, IconButton } from "../ui";
import { useSaving } from "../../hooks/useSaving";

const KalView = () => {
  const { data, chef, actions, show, goBack, prevV } = useApp();
  const { saving, withSaving } = useSaving();
  const [confirmDelete, setConfirmDelete] = useState(null);
  const h = new Date();
  const [mo, setMo] = useState(h.getMonth());
  const [jr, setJr] = useState(h.getFullYear());
  const [selDay, setSelDay] = useState(null);
  const [sf, setSf] = useState(false);
  const [kf, sKf] = useState({ titel: "", baustelleId: "", mitarbeiter: [] });
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
  const off = (new Date(jr, mo, 1).getDay() + 6) % 7;
  const days = new Date(jr, mo + 1, 0).getDate();
  const tm = data.kalender.filter((t) => {
    const ds = (t.datum || "").slice(0, 10); // YYYY-MM-DD
    if (ds.length !== 10) return false;
    const tJr = Number(ds.slice(0, 4));
    const tMo = Number(ds.slice(5, 7)) - 1;
    return tMo === mo && tJr === jr;
  });
  const dayTermine = selDay
    ? data.kalender.filter((t) => (t.datum || "").slice(0, 10) === selDay)
    : [];
  const tgM = (id) =>
    sKf((p) => ({
      ...p,
      mitarbeiter: p.mitarbeiter.includes(id)
        ? p.mitarbeiter.filter((x) => x !== id)
        : [...p.mitarbeiter, id],
    }));
  const saveTermin = () =>
    withSaving(async () => {
      if (!kf.titel.trim()) {
        show("Titel nötig", "error");
        return;
      }
      try {
        await actions.kalender.create({
          datum: selDay,
          baustelleId: kf.baustelleId || null,
          titel: kf.titel,
          mitarbeiter: kf.mitarbeiter,
        });
        show("Termin gespeichert");
        setSf(false);
        sKf({ titel: "", baustelleId: "", mitarbeiter: [] });
      } catch (e) {
        console.error("[KalView.saveTermin]", e);
        show(e?.message || "Fehler beim Speichern", "error");
      }
    });
  const delTermin = (id) => setConfirmDelete(id);
  const doDeleteTermin = async () => {
    const id = confirmDelete;
    setConfirmDelete(null);
    if (!id) return;
    try {
      await actions.kalender.remove(id);
      show("Gelöscht");
    } catch (e) {
      console.error("[KalView.delTermin]", e);
      show(e?.message || "Fehler beim Löschen", "error");
    }
  };
  return (
    <ScreenLayout large title="Kalender" onBack={prevV ? goBack : undefined}>
      {/* Kalender Card */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
          boxShadow: CS,
        }}
      >
        {/* Monat Navigation */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
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
        </div>
        {/* Wochentage */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((t) => (
            <div
              key={t}
              style={{
                textAlign: "center",
                fontSize: 12,
                fontWeight: 600,
                color: "#8e8e93",
                padding: "8px 0",
              }}
            >
              {t}
            </div>
          ))}
        </div>
        {/* Tage */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            rowGap: 4,
          }}
        >
          {Array.from({ length: Math.ceil((off + days) / 7) * 7 }, (_, i) => {
            const tg = i - off + 1;
            const ok = tg >= 1 && tg <= days;
            const ist =
              ok &&
              tg === h.getDate() &&
              mo === h.getMonth() &&
              jr === h.getFullYear();
            const dat = `${jr}-${String(mo + 1).padStart(2, "0")}-${String(tg).padStart(2, "0")}`;
            const hat = ok && data.kalender.some((t) => (t.datum || "").slice(0, 10) === dat);
            const sel = ok && dat === selDay;
            return (
              <button
                key={i}
                disabled={!ok}
                onClick={() => {
                  if (ok) {
                    setSelDay(dat);
                    setSf(false);
                  }
                }}
                style={{
                  width: "100%",
                  height: 44,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: ist || sel ? 600 : 400,
                  position: "relative",
                  cursor: ok ? "pointer" : "default",
                  border: "none",
                  color: !ok
                    ? "transparent"
                    : sel
                      ? "#fff"
                      : ist
                        ? "#fff"
                        : "#000",
                  background: sel ? P : ist ? PD : "transparent",
                }}
              >
                {ok && tg}
                {hat && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 5,
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      background: sel || ist ? "#fff" : P,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ausgewählter Tag */}
      {selDay && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 style={{ fontSize: 17, fontWeight: 600, color: "#000" }}>
              {fDat(selDay)}
            </h3>
          </div>

          {/* + Termin Button eigene Zeile */}
          {chef && (
            <button
              onClick={() => setSf(!sf)}
              className="w-full flex items-center justify-center gap-2"
              style={{
                padding: "12px 16px",
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 600,
                color: sf ? "#8e8e93" : "#fff",
                background: sf ? "rgba(0,0,0,0.04)" : BTN,
              }}
            >
              {sf ? (
                <>
                  <X size={16} />
                  Abbrechen
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Termin hinzufügen
                </>
              )}
            </button>
          )}

          {sf && (
            <div
              style={{
                background: "white",
                borderRadius: 12,
                padding: 16,
                boxShadow: CS,
              }}
              className="space-y-2"
            >
              <div>
                <label
                  style={{
                    fontSize: 13,
                    color: "#8e8e93",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Titel *
                </label>
                <input
                  value={kf.titel}
                  onChange={(e) => sKf({ ...kf, titel: e.target.value })}
                  placeholder="Termin / Notiz"
                  className={IC}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 13,
                    color: "#8e8e93",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Baustelle
                </label>
                <select
                  value={kf.baustelleId}
                  onChange={(e) => sKf({ ...kf, baustelleId: e.target.value })}
                  className={IC}
                >
                  <option value="">Optional</option>
                  {data.baustellen.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.kunde}
                    </option>
                  ))}
                </select>
              </div>
              {data.users.filter((u) => u.role === "mitarbeiter").length >
                0 && (
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      color: "#8e8e93",
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    Mitarbeiter
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {data.users
                      .filter((u) => u.role === "mitarbeiter")
                      .map((u) => (
                        <button
                          key={u.id}
                          onClick={() => tgM(u.id)}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 10,
                            fontSize: 12,
                            fontWeight: 500,
                            border: "none",
                            cursor: "pointer",
                            ...(kf.mitarbeiter.includes(u.id)
                              ? { background: BTN, color: "white" }
                              : { background: "#f2f2f7", color: "#8e8e93" }),
                          }}
                        >
                          {u.name}
                        </button>
                      ))}
                  </div>
                </div>
              )}
              <button
                onClick={saveTermin}
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

          {dayTermine.length === 0 && !sf && (
            <p
              style={{
                fontSize: 14,
                color: "#8e8e93",
                textAlign: "center",
                padding: "12px 0",
              }}
            >
              Keine Termine an diesem Tag
            </p>
          )}
          {dayTermine.map((t) => {
            const bs = data.baustellen.find((b) => b.id === t.baustelleId);
            return (
              <div
                key={t.id}
                style={{
                  background: "white",
                  borderRadius: 12,
                  padding: "12px 16px",
                  boxShadow: CS,
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <span
                      style={{ fontSize: 15, fontWeight: 600, color: "#000" }}
                    >
                      {t.titel}
                    </span>
                    {bs && (
                      <p style={{ fontSize: 13, color: "#3c3c43" }}>
                        {bs.kunde}
                      </p>
                    )}
                    {t.mitarbeiter?.length > 0 && (
                      <p
                        style={{ fontSize: 13, color: "#8e8e93", marginTop: 2 }}
                      >
                        {t.mitarbeiter
                          .map(
                            (id) => data.users.find((u) => u.id === id)?.name,
                          )
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                  {chef && (
                    <button
                      onClick={() => delTermin(t.id)}
                      style={{ color: "#c7c7cc", padding: 4 }}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Alle Termine des Monats wenn kein Tag gewählt */}
      {!selDay && (
        <div className="space-y-2">
          {tm.length ? (
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#000" }}>
              Termine diesen Monat
            </h3>
          ) : (
            <p
              style={{
                fontSize: 13,
                fontWeight: 400,
                color: "#8e8e93",
                textAlign: "center",
              }}
            >
              Tag antippen zum Hinzufügen
            </p>
          )}
          {tm.map((t) => {
            const bs = data.baustellen.find((b) => b.id === t.baustelleId);
            return (
              <div
                key={t.id}
                style={{
                  background: "white",
                  borderRadius: 12,
                  padding: "12px 16px",
                  boxShadow: CS,
                }}
              >
                <div className="flex justify-between">
                  <span
                    style={{ fontSize: 15, fontWeight: 600, color: "#000" }}
                  >
                    {t.titel}
                  </span>
                  <span style={{ fontSize: 13, color: "#8e8e93" }}>
                    {fK(t.datum)}
                  </span>
                </div>
                {bs && (
                  <p style={{ fontSize: 13, color: "#3c3c43" }}>{bs.kunde}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
      <ConfirmModal
        open={!!confirmDelete}
        title="Termin löschen?"
        message="Der Eintrag wird aus dem Kalender entfernt."
        confirmLabel="Löschen"
        cancelLabel="Abbrechen"
        destructive
        onConfirm={doDeleteTermin}
        onCancel={() => setConfirmDelete(null)}
      />
    </ScreenLayout>
  );
};

export default KalView;
