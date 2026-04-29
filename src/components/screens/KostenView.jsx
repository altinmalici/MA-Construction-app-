import { useState } from "react";
import { Plus, X, Download, Trash2, Receipt, User } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { bStdNum, fE, P, RED, GREEN, BTN, CS, IC, isMitarbeiterEntry, parseDecimal } from "../../utils/helpers";
import { ScreenLayout, PBar, Empty, Spinner, ConfirmModal, IconButton } from "../ui";
import { useSaving } from "../../hooks/useSaving";
import { useKostenAggregat, KAT_LABELS, KAT_COLORS } from "./KostenView/aggregations.js";
import KostenDetail from "./KostenView/Detail.jsx";

const KostenView = () => {
  const { data, actions, show, goBack, cu, addN } = useApp();
  const { saving, withSaving } = useSaving();
  // confirmDeleteKost/doDeleteKost wurden mit Detail-Block in Detail.jsx
  // verschoben (waren nur dort genutzt).
  const [selBs, setSelBs] = useState(null);
  const [sf, setSf] = useState(false);
  const [fl, setFl] = useState("alle");
  const [kf, sKf] = useState({
    baustelleId: "",
    kategorie: "material",
    beschreibung: "",
    betrag: "",
    datum: new Date().toISOString().split("T")[0],
  });
  const katLabels = KAT_LABELS;
  const katColors = KAT_COLORS;
  const fH = (h) => (Number.isInteger(h) ? h + "h" : h.toFixed(1) + "h");

  const bsList =
    fl === "alle"
      ? data.baustellen
      : data.baustellen.filter((b) => b.status === fl);

  // 6-03a Phase 1: Aggregations-Logic in useKostenAggregat-Hook ausgelagert
  // (siehe ./KostenView/aggregations.js). calc*-Reader und totalAll/budgetAll
  // werden destrukturiert für unveränderte Aufrufer-Signatur.
  const { calcLohn, calcTotal, calcKat, totalAll, budgetAll } = useKostenAggregat({
    baustellen: data.baustellen,
    stundeneintraege: data.stundeneintraege,
    users: data.users,
    kosten: data.kosten,
  });

  const saveKost = () =>
    withSaving(async () => {
      if (!kf.baustelleId || !kf.beschreibung.trim() || !kf.betrag) {
        show("Alle Felder ausfüllen", "error");
        return;
      }
      try {
        await actions.kosten.create({
          baustelleId: kf.baustelleId,
          kategorie: kf.kategorie,
          beschreibung: kf.beschreibung,
          betrag: parseDecimal(kf.betrag),
          datum: kf.datum,
          ersteller: cu?.id,
        });
        addN(
          "info",
          `Kosten: ${fE(parseDecimal(kf.betrag))} – ${kf.beschreibung}`,
          kf.baustelleId,
        );
        show("Kosten erfasst");
        setSf(false);
        sKf({ ...kf, beschreibung: "", betrag: "" });
      } catch (e) {
        console.error("[KostenView.saveKost]", e);
        show(e?.message || "Fehler beim Speichern", "error");
      }
    });

  const exportCSV = () => {
    const rows = [
      ["Baustelle", "Kategorie", "Beschreibung", "Betrag", "Datum"],
    ];
    bsList.forEach((b) => {
      // Lohnkosten pro Mitarbeiter
      const ei = data.stundeneintraege.filter(
        (e) => e.baustelleId === b.id && isMitarbeiterEntry(e),
      );
      const byUser = {};
      ei.forEach((e) => {
        if (!byUser[e.mitarbeiterId]) byUser[e.mitarbeiterId] = 0;
        byUser[e.mitarbeiterId] += bStdNum(e.beginn, e.ende, e.pause);
      });
      Object.entries(byUser).forEach(([uid, std]) => {
        const u = data.users.find((x) => x.id === uid);
        rows.push([
          b.kunde,
          "Lohn",
          `${u?.name || "?"} (${std.toFixed(1)}h × ${fE(u?.stundensatz || 45)})`,
          ((u?.stundensatz || 45) * std).toFixed(2),
          "",
        ]);
      });
      // Extra Kosten
      data.kosten
        .filter((k) => k.baustelleId === b.id)
        .forEach((k) =>
          rows.push([
            b.kunde,
            katLabels[k.kategorie],
            k.beschreibung,
            k.betrag.toFixed(2),
            k.datum,
          ]),
        );
      // Budget Zeile
      rows.push([b.kunde, "BUDGET", "Gesamt", b.budget || 0, ""]);
      rows.push([b.kunde, "GESAMT", "", calcTotal(b.id).toFixed(2), ""]);
      rows.push(["", "", "", "", ""]);
    });
    const csv = "\uFEFF" + rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const flSuffix = fl === "alle" ? "" : `_${fl}`;
    a.download = `Kostenübersicht${flSuffix}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    show("CSV exportiert");
  };

  // 6-03a Phase 2: Detail-Ansicht in Sub-Component KostenView/Detail.jsx
  // ausgelagert. Aggregat + onAddKosten-Callback dorthin durchgereicht.
  if (selBs) {
    return (
      <KostenDetail
        bsId={selBs.id}
        aggregat={{ calcLohn, calcTotal, calcKat }}
        onBack={() => setSelBs(null)}
        onAddKosten={(bid) => {
          sKf({ ...kf, baustelleId: String(bid) });
          setSf(true);
          setSelBs(null);
        }}
      />
    );
  }

  // Hauptübersicht
  return (
    <ScreenLayout
      title="Kostenübersicht"
      onBack={goBack}
      right={
        <div style={{ display: "flex", gap: 8 }}>
          <IconButton
            icon={sf ? X : Plus}
            variant={sf ? "default" : "primary"}
            onClick={() => setSf(!sf)}
            ariaLabel={sf ? "Schließen" : "Kosten erfassen"}
          />
          <IconButton
            icon={Download}
            variant="default"
            onClick={exportCSV}
            ariaLabel="CSV exportieren"
          />
        </div>
      }
    >
      {/* Neuer Kosteneintrag */}
      {sf && (
        <div
          className="space-y-2"
          style={{
            paddingBottom: 16,
            borderBottom: "0.5px solid rgba(0,0,0,0.08)",
          }}
        >
          <select
            value={kf.baustelleId}
            onChange={(e) => sKf({ ...kf, baustelleId: e.target.value })}
            className={IC}
            style={{ background: "rgba(118,118,128,0.12)", border: "none" }}
          >
            <option value="">Baustelle *</option>
            {data.baustellen.map((b) => (
              <option key={b.id} value={b.id}>
                {b.kunde}
              </option>
            ))}
          </select>
          <div style={{ display: "flex", gap: 8 }}>
            {["material", "subunternehmer", "sonstiges"].map((k) => (
              <button
                key={k}
                onClick={() => sKf({ ...kf, kategorie: k })}
                className="flex-1"
                style={{
                  padding: "12px 0",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  minHeight: 44,
                  border: "none",
                  color: kf.kategorie === k ? "white" : "#3c3c43",
                  background: kf.kategorie === k ? katColors[k] : "white",
                  boxShadow: kf.kategorie === k ? "none" : CS,
                }}
              >
                {katLabels[k]}
              </button>
            ))}
          </div>
          <input
            value={kf.beschreibung}
            onChange={(e) => sKf({ ...kf, beschreibung: e.target.value })}
            placeholder="Beschreibung *"
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
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#8e8e93",
                  fontSize: 15,
                }}
              >
                €
              </span>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                value={kf.betrag}
                onChange={(e) => sKf({ ...kf, betrag: e.target.value })}
                placeholder="Betrag *"
                className={IC}
                style={{ background: "rgba(118,118,128,0.12)", border: "none" }}
              />
            </div>
            <input
              type="date"
              value={kf.datum}
              onChange={(e) => sKf({ ...kf, datum: e.target.value })}
              className={IC}
              style={{ background: "rgba(118,118,128,0.12)", border: "none" }}
            />
          </div>
          <button
            onClick={saveKost}
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
            {saving ? <Spinner size={18} color="white" /> : <Receipt size={18} />}
            {saving ? "Speichere..." : "Kosten erfassen"}
          </button>
        </div>
      )}

      {/* Gesamtübersicht */}
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
            borderRadius: 12,
            padding: 14,
            background: "white",
            boxShadow: CS,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>
            {fE(totalAll)}
          </p>
          <p style={{ fontSize: 12, color: "#8e8e93", marginTop: 4 }}>
            Gesamtkosten
          </p>
        </div>
        <div
          style={{
            borderRadius: 12,
            padding: 14,
            background: "white",
            boxShadow: CS,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>
            {budgetAll > 0 ? fE(budgetAll) : "–"}
          </p>
          <p style={{ fontSize: 12, color: "#8e8e93", marginTop: 4 }}>Budget</p>
        </div>
        <div
          style={{
            borderRadius: 12,
            padding: 14,
            background: "white",
            boxShadow: CS,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>
            {fH(
              data.stundeneintraege.reduce(
                (s, e) => s + bStdNum(e.beginn, e.ende, e.pause),
                0,
              ),
            )}
          </p>
          <p style={{ fontSize: 12, color: "#8e8e93", marginTop: 4 }}>
            Stunden
          </p>
        </div>
      </div>

      {/* Filter */}
      <div
        style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 12 }}
      >
        {["alle", "aktiv", "geplant", "fertig", "abgerechnet"].map((s) => (
          <button
            key={s}
            onClick={() => setFl(s)}
            style={{
              padding: "8px 16px",
              borderRadius: 100,
              fontSize: 13,
              fontWeight: 500,
              whiteSpace: "nowrap",
              border: "none",
              cursor: "pointer",
              ...(fl === s
                ? { background: BTN, color: "white" }
                : { background: "white", boxShadow: CS, color: "#3c3c43" }),
            }}
          >
            {s === "alle" ? "Alle" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Baustellen-Liste */}
      <div className="space-y-2" style={{ paddingTop: 8 }}>
        {bsList.length === 0 ? (
          <Empty icon={Receipt} text="Keine Baustellen vorhanden" />
        ) : (
          bsList.map((b) => {
            const total = calcTotal(b.id);
            const budget = b.budget || 0;
            const pct =
              budget > 0
                ? Math.min(100, Math.round((total / budget) * 100))
                : 0;
            const isOver = budget > 0 && total > budget;
            const ei = data.stundeneintraege.filter(
              (e) =>
                e.baustelleId === b.id &&
                (!e.personTyp || e.personTyp === "mitarbeiter"),
            );
            const totalStd = ei.reduce(
              (s, e) => s + bStdNum(e.beginn, e.ende, e.pause),
              0,
            );
            const lohn = calcLohn(b.id);
            const extraK = data.kosten
              .filter((k) => k.baustelleId === b.id)
              .reduce((s, k) => s + (k.betrag || 0), 0);
            const byU = {};
            ei.forEach((e) => {
              const uid = e.mitarbeiterId;
              if (!byU[uid]) byU[uid] = 0;
              byU[uid] += bStdNum(e.beginn, e.ende, e.pause);
            });
            return (
              <button
                key={b.id}
                onClick={() => setSelBs(b)}
                className="w-full text-left"
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: "white",
                  boxShadow: CS,
                  border: "none",
                }}
              >
                <div
                  className="flex justify-between items-start"
                  style={{ marginBottom: 4 }}
                >
                  <p style={{ fontSize: 15, fontWeight: 600, color: "#000" }}>
                    {b.kunde}
                  </p>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: isOver ? RED : "#000",
                    }}
                  >
                    {fE(total)}
                  </span>
                </div>
                {budget > 0 && (
                  <div>
                    <div
                      className="flex justify-between"
                      style={{ fontSize: 13, marginBottom: 4 }}
                    >
                      <span style={{ color: "#8e8e93" }}>
                        Budget: {fE(budget)}
                      </span>
                      <span style={{ color: isOver ? RED : GREEN }}>
                        {pct}%
                      </span>
                    </div>
                    <PBar
                      value={Math.min(pct, 100)}
                      small
                      color={isOver ? RED : undefined}
                    />
                  </div>
                )}
                {!budget && (
                  <p style={{ fontSize: 13, color: "#8e8e93" }}>
                    Kein Budget gesetzt
                  </p>
                )}
                {Object.keys(byU).length > 0 && (
                  <div style={{ marginTop: 8 }} className="space-y-1">
                    {Object.entries(byU).map(([uid, std]) => {
                      const u = data.users.find((x) => x.id === uid);
                      const kst = std * (u?.stundensatz || 45);
                      return (
                        <div
                          key={uid}
                          className="flex items-center justify-between"
                          style={{ fontSize: 13 }}
                        >
                          <div className="flex items-center" style={{ gap: 6 }}>
                            <User size={10} style={{ color: "#8e8e93" }} />
                            <span style={{ color: "#3c3c43" }}>
                              {u?.name || "?"}
                            </span>
                            <span style={{ color: "#8e8e93" }}>{fH(std)}</span>
                          </div>
                          <span style={{ color: "#3c3c43" }}>{fE(kst)}</span>
                        </div>
                      );
                    })}
                    <div
                      className="flex items-center justify-between"
                      style={{
                        fontSize: 13,
                        paddingTop: 4,
                        marginTop: 4,
                        borderTop: "0.5px solid rgba(0,0,0,0.08)",
                      }}
                    >
                      <span style={{ color: "#8e8e93", fontWeight: 600 }}>
                        Lohn gesamt ({fH(totalStd)})
                      </span>
                      <span style={{ color: "#000", fontWeight: 600 }}>
                        {fE(lohn)}
                      </span>
                    </div>
                  </div>
                )}
                {Object.keys(byU).length === 0 && (
                  <p style={{ fontSize: 13, color: "#8e8e93", marginTop: 4 }}>
                    Noch keine Stunden eingetragen
                  </p>
                )}
                {extraK > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 6,
                      paddingTop: 6,
                      borderTop: "0.5px solid rgba(0,0,0,0.08)",
                    }}
                  >
                    {["material", "subunternehmer", "sonstiges"].map((kat) => {
                      const val = calcKat(b.id, kat);
                      return val > 0 ? (
                        <div
                          key={kat}
                          className="flex items-center"
                          style={{ gap: 4 }}
                        >
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 3,
                              background: katColors[kat],
                            }}
                          />
                          <span style={{ fontSize: 13, color: "#8e8e93" }}>
                            {katLabels[kat]}: {fE(val)}
                          </span>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </ScreenLayout>
  );
};

export default KostenView;
