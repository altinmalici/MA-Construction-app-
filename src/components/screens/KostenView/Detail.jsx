import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import {
  bStdNum,
  fE,
  fK,
  P,
  RED,
  GREEN,
  BTN,
  CS,
} from "../../../utils/helpers";
import {
  ScreenLayout,
  PBar,
  ConfirmModal,
  IconButton,
} from "../../ui";
import { KAT_LABELS, KAT_COLORS } from "./aggregations.js";

const fH = (h) => (Number.isInteger(h) ? h + "h" : h.toFixed(1) + "h");

/**
 * KostenView Detail-Sub-Component (6-03a Phase 2).
 * Zeigt Budget-Übersicht, Stunden-Summary, Kategorie-Aufteilung,
 * Lohnkosten-Detail-Tabelle und Einzelposten-Liste für eine Baustelle.
 *
 * Props:
 *  - bsId: aktuelle Baustellen-ID (immer frisch aus data resolven, nie das
 *    selBs-Objekt closen — Stand könnte stale werden)
 *  - aggregat: { calcLohn, calcTotal, calcKat } aus useKostenAggregat
 *  - onBack: Callback zum Schließen
 *  - onAddKosten(baustelleId): öffnet Add-Kosten-Form im Parent
 */
const Detail = ({ bsId, aggregat, onBack, onAddKosten }) => {
  const { data, actions, show } = useApp();
  const [confirmDeleteKost, setConfirmDeleteKost] = useState(null);

  const b = data.baustellen.find((x) => x.id === bsId);
  if (!b) {
    // Baustelle weg (z.B. parallel gelöscht) → zurück zur Liste
    onBack();
    return null;
  }

  const { calcLohn, calcTotal, calcKat } = aggregat;
  const total = calcTotal(b.id);
  const budget = b.budget || 0;
  const pct = budget > 0 ? Math.min(100, Math.round((total / budget) * 100)) : 0;
  const isOver = budget > 0 && total > budget;
  const ei = data.stundeneintraege.filter(
    (e) => e.baustelleId === b.id && (!e.personTyp || e.personTyp === "mitarbeiter"),
  );
  const bsKosten = data.kosten.filter((k) => k.baustelleId === b.id);

  const byUser = {};
  ei.forEach((e) => {
    const uid = e.mitarbeiterId;
    if (!byUser[uid]) byUser[uid] = { std: 0, kosten: 0 };
    const std = bStdNum(e.beginn, e.ende, e.pause);
    const u = data.users.find((x) => x.id === uid);
    byUser[uid].std += std;
    byUser[uid].kosten += std * (u?.stundensatz || 45);
  });

  const doDeleteKost = async () => {
    const id = confirmDeleteKost;
    setConfirmDeleteKost(null);
    if (!id) return;
    try {
      await actions.kosten.remove(id);
      show("Gelöscht");
    } catch (e) {
      console.error("[KostenView.Detail.delKost]", e);
      show(e?.message || "Fehler beim Löschen", "error");
    }
  };

  return (
    <ScreenLayout title={`Kosten: ${b.kunde}`} onBack={onBack}>
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
                    (s, e) => s + bStdNum(e.beginn, e.ende, e.pause),
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
            {["lohn", "material", "subunternehmer", "sonstiges"].map((kat) => {
              const val = calcKat(b.id, kat);
              const katPct = total > 0 ? Math.round((val / total) * 100) : 0;
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
                          background: KAT_COLORS[kat],
                        }}
                      />
                      <span style={{ fontSize: 13, color: "#3c3c43" }}>
                        {KAT_LABELS[kat]}
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
                  <PBar value={katPct} small color={KAT_COLORS[kat]} />
                </div>
              ) : null;
            })}
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
                {fE(
                  Object.values(byUser).reduce(
                    (s, d) => s + (d.kosten || 0),
                    0,
                  ),
                )}
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
              onClick={() => onAddKosten(b.id)}
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
                      background: KAT_COLORS[k.kategorie],
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <p style={{ color: "#000" }}>{k.beschreibung}</p>
                    <p style={{ color: "#8e8e93" }}>
                      {KAT_LABELS[k.kategorie]} · {fK(k.datum)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center" style={{ gap: 12 }}>
                  <span style={{ fontWeight: 600, color: "#000" }}>
                    {fE(k.betrag)}
                  </span>
                  <IconButton
                    icon={Trash2}
                    variant="subtle"
                    iconSize={16}
                    onClick={() => setConfirmDeleteKost(k.id)}
                    ariaLabel="Kosten löschen"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <ConfirmModal
        open={!!confirmDeleteKost}
        title="Kosten löschen?"
        message="Der Kosten-Eintrag wird dauerhaft entfernt. Das kann die Lohnabrechnung beeinflussen."
        confirmLabel="Löschen"
        cancelLabel="Abbrechen"
        destructive
        onConfirm={doDeleteKost}
        onCancel={() => setConfirmDeleteKost(null)}
      />
    </ScreenLayout>
  );
};

export default Detail;
