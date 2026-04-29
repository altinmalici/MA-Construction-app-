import { useMemo } from "react";
import { bStdNum, isMitarbeiterEntry } from "../../../utils/helpers";

/**
 * Berechnet pro Baustelle:
 *  - lohn: Summe aus stundeneintraege × stundensatz (nur Mitarbeiter-Einträge)
 *  - kategorien: { material, subunternehmer, sonstiges, ... } Summen aus kosten
 *
 * Eingeführt in D3 (Audit P-MEDIUM) zur Vermeidung von 4× O(n) calc*-Calls
 * pro Baustelle pro Render. Liefert reine Reader (calcLohn/calcTotal/calcKat).
 *
 * @returns {{
 *   byBaustelleAggregat: Object<string, {lohn, kategorien}>,
 *   calcLohn: (bid) => number,
 *   calcTotal: (bid) => number,
 *   calcKat: (bid, kat) => number,
 *   totalAll: number,
 *   budgetAll: number,
 * }}
 */
export function useKostenAggregat({ baustellen, stundeneintraege, users, kosten }) {
  const byBaustelleAggregat = useMemo(() => {
    const map = {};
    baustellen.forEach((b) => {
      map[b.id] = { lohn: 0, kategorien: {} };
    });
    const userById = new Map(users.map((u) => [u.id, u]));
    stundeneintraege.forEach((e) => {
      if (!isMitarbeiterEntry(e)) return;
      const entry = map[e.baustelleId];
      if (!entry) return;
      const u = userById.get(e.mitarbeiterId);
      const std = bStdNum(e.beginn, e.ende, e.pause);
      entry.lohn += std * (u?.stundensatz || 45);
    });
    kosten.forEach((k) => {
      const entry = map[k.baustelleId];
      if (!entry) return;
      const cat = k.kategorie || "sonstiges";
      entry.kategorien[cat] = (entry.kategorien[cat] || 0) + (k.betrag || 0);
    });
    return map;
  }, [baustellen, stundeneintraege, users, kosten]);

  return useMemo(() => {
    const calcLohn = (bid) => byBaustelleAggregat[bid]?.lohn || 0;
    const calcTotal = (bid) => {
      const e = byBaustelleAggregat[bid];
      if (!e) return 0;
      const extra = Object.values(e.kategorien).reduce((s, v) => s + v, 0);
      return e.lohn + extra;
    };
    const calcKat = (bid, kat) => {
      const e = byBaustelleAggregat[bid];
      if (!e) return 0;
      if (kat === "lohn") return e.lohn;
      return e.kategorien[kat] || 0;
    };
    const totalAll = baustellen.reduce((s, b) => s + calcTotal(b.id), 0);
    const budgetAll = baustellen.reduce((s, b) => s + (b.budget || 0), 0);
    return { byBaustelleAggregat, calcLohn, calcTotal, calcKat, totalAll, budgetAll };
  }, [byBaustelleAggregat, baustellen]);
}

// Konstanten zentral — werden auch von List/Detail/Form gebraucht.
export const KAT_LABELS = {
  lohn: "Lohnkosten",
  material: "Material",
  subunternehmer: "Subunternehmer",
  sonstiges: "Sonstiges",
};

export const KAT_COLORS = {
  lohn: "#007AFF",
  material: "#FF9500",
  subunternehmer: "#5856D6",
  sonstiges: "#8e8e93",
};
