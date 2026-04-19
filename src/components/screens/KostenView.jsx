import { useState } from "react";
import { Plus, X, Download, Trash2, Receipt, User } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { bStd, fE, fK, P, RED, GREEN, BTN, CS, IC, isMitarbeiterEntry, parseDecimal } from "../../utils/helpers";
import { ScreenLayout, PBar, Empty, Spinner } from "../ui";
import { useSaving } from "../../hooks/useSaving";

const KostenView = () => {
  const { data, actions, show, goBack, cu, addN } = useApp();
  const { saving, withSaving } = useSaving();
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
  const katLabels = {
    lohn: "Lohnkosten",
    material: "Material",
    subunternehmer: "Subunternehmer",
    sonstiges: "Sonstiges",
  };
  const katColors = {
    lohn: "#007AFF",
    material: "#FF9500",
    subunternehmer: "#5856D6",
    sonstiges: "#8e8e93",
  };
  const fH = (h) => (Number.isInteger(h) ? h + "h" : h.toFixed(1) + "h");

  const bsList =
    fl === "alle"
      ? data.baustellen
      : data.baustellen.filter((b) => b.status === fl);

  // Lohnkosten berechnen pro Baustelle
  const calcLohn = (bid) => {
    const ei = data.stundeneintraege.filter(
      (e) => e.baustelleId === bid && isMitarbeiterEntry(e),
    );
    return ei.reduce((s, e) => {
      const u = data.users.find((x) => x.id === e.mitarbeiterId);
      const std = parseFloat(bStd(e.beginn, e.ende, e.pause));
      return s + std * (u?.stundensatz || 45);
    }, 0);
  };


  // Gesamtkosten pro Baustelle
  const calcTotal = (bid) => {
    const lohn = calcLohn(bid);
    const extra = data.kosten
      .filter((k) => k.baustelleId === bid)
      .reduce((s, k) => s + (k.betrag || 0), 0);
    return lohn + extra;
  };

  // Kosten nach Kategorie pro Baustelle
  const calcKat = (bid, kat) => {
    if (kat === "lohn") return calcLohn(bid);
    return data.kosten
      .filter((k) => k.baustelleId === bid && k.kategorie === kat)
      .reduce((s, k) => s + (k.betrag || 0), 0);
  };

  // Gesamtkosten aller Baustellen
  const totalAll = data.baustellen.reduce((s, b) => s + calcTotal(b.id), 0);
  const budgetAll = data.baustellen.reduce((s, b) => s + (b.budget || 0), 0);

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
        byUser[e.mitarbeiterId] += parseFloat(bStd(e.beginn, e.ende, e.pause));
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

  // Detail-Ansicht einer Baustelle
  if (selBs) {
    const b = selBs;
    const total = calcTotal(b.id);
    const budget = b.budget || 0;
    const pct =
      budget > 0 ? Math.min(100, Math.round((total / budget) * 100)) : 0;
    const isOver = budget > 0 && total > budget;
    const ei = data.stundeneintraege.filter(
      (e) =>
        e.baustelleId === b.id &&
        (!e.personTyp || e.personTyp === "mitarbeiter"),
    );
    const bsKosten = data.kosten.filter((k) => k.baustelleId === b.id);

    // Lohnkosten nach Mitarbeiter
    const byUser = {};
    ei.forEach((e) => {
      const uid = e.mitarbeiterId;
      if (!byUser[uid]) byUser[uid] = { std: 0, kosten: 0 };
      const std = parseFloat(bStd(e.beginn, e.ende, e.pause));
      const u = data.users.find((x) => x.id === uid);
      byUser[uid].std += std;
      byUser[uid].kosten += std * (u?.stundensatz || 45);
    });

    const delKost = async (id) => {
      if (confirm("Kosten löschen?")) {
        try {
          await actions.kosten.remove(id);
          show("Gelöscht");
        } catch (e) {
          show("Fehler", "error");
        }
      }
    };

    return (
      <ScreenLayout title={`Kosten: ${b.kunde}`} onBack={() => setSelBs(null)}>
        <div className="space-y-2">
          {/* Budget Übersicht */}
          <div
            style={{
              borderRadius: 12,
              padding: 16,
              background: isOver ? `${RED}08` : "rgba(0,0,0,0.02)",
              boxShadow: CS,
            }}
          >
            <div
              className="flex justify-between items-start"
              style={{ marginBottom: 8 }}
            >
              <div>
                <p style={{ fontSize: 12, color: "#8e8e93" }}>Gesamtkosten</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>
                  {fE(total)}
                </p>
              </div>
              {budget > 0 && (
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 12, color: "#8e8e93" }}>Budget</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: "#000" }}>
                    {fE(budget)}
                  </p>
                </div>
              )}
            </div>
            {budget > 0 && (
              <div>
                <PBar value={pct} />
                <div className="flex justify-between" style={{ marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: isOver ? RED : P }}>
                    {pct}% verbraucht
                  </span>
                  <span style={{ fontSize: 12, color: isOver ? RED : GREEN }}>
                    {isOver
                      ? `${fE(total - budget)} über Budget`
                      : `${fE(budget - total)} übrig`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Stunden Zusammenfassung */}
          {ei.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
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
                  {(() => {
                    const h = ei.reduce(
                      (s, e) => s + parseFloat(bStd(e.beginn, e.ende, e.pause)),
                      0,
                    );
                    return Number.isInteger(h) ? h : h.toFixed(1);
                  })()}
                </p>
                <p style={{ fontSize: 12, color: "#8e8e93" }}>Stunden</p>
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
                  {Object.keys(byUser).length}
                </p>
                <p style={{ fontSize: 12, color: "#8e8e93" }}>Mitarbeiter</p>
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
                  {fE(calcLohn(b.id))}
                </p>
                <p style={{ fontSize: 12, color: "#8e8e93" }}>Lohnkosten</p>
              </div>
            </div>
          )}

          {/* Kategorie-Aufteilung */}
          <div
            style={{
              borderRadius: 12,
              background: "white",
              padding: 16,
              boxShadow: CS,
            }}
          >
            <p
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "#000",
                marginBottom: 8,
              }}
            >
              Kostenaufteilung
            </p>
            <div className="space-y-2">
              {["lohn", "material", "subunternehmer", "sonstiges"].map(
                (kat) => {
                  const val = calcKat(b.id, kat);
                  const katPct =
                    total > 0 ? Math.round((val / total) * 100) : 0;
                  return val > 0 || kat === "lohn" ? (
                    <div key={kat}>
                      <div
                        className="flex justify-between items-center"
                        style={{ marginBottom: 4 }}
                      >
                        <div className="flex items-center" style={{ gap: 8 }}>
                          <div
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 5,
                              background: katColors[kat],
                            }}
                          />
                          <span style={{ fontSize: 13, color: "#3c3c43" }}>
                            {katLabels[kat]}
                          </span>
                        </div>
                        <div className="flex items-center" style={{ gap: 8 }}>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "#000",
                            }}
                          >
                            {fE(val)}
                          </span>
                          <span style={{ fontSize: 12, color: "#8e8e93" }}>
                            {katPct}%
                          </span>
                        </div>
                      </div>
                      <PBar value={katPct} small color={katColors[kat]} />
                    </div>
                  ) : null;
                },
              )}
            </div>
          </div>

          {/* Lohnkosten Detail */}
          {Object.keys(byUser).length > 0 && (
            <div
              style={{
                borderRadius: 12,
                background: "white",
                padding: 16,
                boxShadow: CS,
              }}
            >
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#000",
                  marginBottom: 8,
                }}
              >
                Lohnkosten pro Mitarbeiter
              </p>
              <div className="space-y-1.5">
                {Object.entries(byUser).map(([uid, d]) => {
                  const u = data.users.find((x) => x.id === uid);
                  const ue = ei.filter((e) => e.mitarbeiterId === uid);
                  const tage = [...new Set(ue.map((e) => e.datum))].length;
                  return (
                    <div
                      key={uid}
                      style={{
                        padding: 10,
                        borderRadius: 10,
                        background: "#f2f2f7",
                        fontSize: 13,
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <p style={{ color: "#000", fontWeight: 600 }}>
                          {u?.name || "?"}
                        </p>
                        <span style={{ fontWeight: 700, color: "#000" }}>
                          {fE(d.kosten)}
                        </span>
                      </div>
                      <div
                        className="flex items-center"
                        style={{ gap: 12, marginTop: 2, color: "#8e8e93" }}
                      >
                        <span>
                          {fH(d.std)} an {tage} {tage === 1 ? "Tag" : "Tagen"}
                        </span>
                        <span>×</span>
                        <span>{fE(u?.stundensatz || 45)}/h</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div
                className="flex justify-between items-center"
                style={{
                  fontSize: 13,
                  marginTop: 8,
                  paddingTop: 8,
                  borderTop: "0.5px solid rgba(0,0,0,0.08)",
                }}
              >
                <span style={{ color: "#8e8e93", fontWeight: 600 }}>
                  Lohn gesamt
                </span>
                <span style={{ color: "#000", fontWeight: 700 }}>
                  {fE(Object.values(byUser).reduce((s, d) => s + (d.kosten || 0), 0))}
                </span>
              </div>
            </div>
          )}

          {/* Einzelposten */}
          <div
            style={{
              borderRadius: 12,
              background: "white",
              padding: 16,
              boxShadow: CS,
            }}
          >
            <div
              className="flex justify-between items-center"
              style={{ marginBottom: 8 }}
            >
              <p style={{ fontSize: 15, fontWeight: 600, color: "#000" }}>
                Kosteneinträge ({bsKosten.length})
              </p>
              <button
                onClick={() => {
                  sKf({ ...kf, baustelleId: String(b.id) });
                  setSf(true);
                }}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  fontSize: 13,
                  color: "white",
                  background: BTN,
                  border: "none",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Plus size={14} />
                Kosten
              </button>
            </div>
            {bsKosten.length === 0 ? (
              <p style={{ fontSize: 13, color: "#8e8e93" }}>
                Keine manuellen Kosten eingetragen
              </p>
            ) : (
              [...bsKosten].reverse().map((k) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between"
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    background: "#f2f2f7",
                    marginBottom: 4,
                    fontSize: 13,
                  }}
                >
                  <div className="flex items-center flex-1" style={{ gap: 8 }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        background: katColors[k.kategorie],
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <p style={{ color: "#000" }}>{k.beschreibung}</p>
                      <p style={{ color: "#8e8e93" }}>
                        {katLabels[k.kategorie]} · {fK(k.datum)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center" style={{ gap: 12 }}>
                    <span style={{ fontWeight: 600, color: "#000" }}>
                      {fE(k.betrag)}
                    </span>
                    <button
                      onClick={() => delKost(k.id)}
                      style={{
                        padding: 8,
                        color: "#c7c7cc",
                        background: "none",
                        border: "none",
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </ScreenLayout>
    );
  }

  // Hauptübersicht
  return (
    <ScreenLayout
      title="Kostenübersicht"
      onBack={goBack}
      right={
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setSf(!sf)}
            style={{
              padding: 8,
              borderRadius: 10,
              background: sf ? "rgba(0,0,0,0.05)" : BTN,
              border: "none",
            }}
          >
            {sf ? (
              <X size={18} style={{ color: "#3c3c43" }} />
            ) : (
              <Plus size={18} style={{ color: "white" }} />
            )}
          </button>
          <button
            onClick={exportCSV}
            style={{
              padding: 8,
              borderRadius: 10,
              color: "#8e8e93",
              background: "rgba(0,0,0,0.05)",
              border: "none",
            }}
          >
            <Download size={18} />
          </button>
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
                (s, e) => s + parseFloat(bStd(e.beginn, e.ende, e.pause)),
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
              (s, e) => s + parseFloat(bStd(e.beginn, e.ende, e.pause)),
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
              byU[uid] += parseFloat(bStd(e.beginn, e.ende, e.pause));
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
