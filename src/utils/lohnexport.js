// Detaillierter Lohn-/Stundenexport als CSV.
//
// Deutsch-freundlich: Semikolon als Spaltentrenner, Komma als Dezimal-
// trennzeichen und UTF-8-BOM, damit Excel Umlaute + Zahlen korrekt oeffnet.
// Format bewusst neutral/detailliert gehalten — laesst sich spaeter leicht
// an das konkrete Lexware-Importschema anpassen (Spalten umbenennen/mappen).

// Auf Viertelstunde runden (CLAUDE.md-Regel: Arbeitszeit auf 15 Min).
// Bei den ueblichen 30-Min-Eingaben aendert das nichts, macht die Werte aber
// robust und lohnabrechnungs-tauglich.
const round15 = (h) => Math.round(h * 4) / 4;

const deNum = (n, dec = 2) =>
  Number(n || 0).toLocaleString("de-DE", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });

// 'YYYY-MM-DD' -> 'DD.MM.YYYY'
const deDate = (iso) => {
  const [y, m, d] = String(iso).split("-");
  return d && m && y ? `${d}.${m}.${y}` : String(iso);
};

const cell = (v) => {
  const s = v == null ? "" : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const row = (arr) => arr.map(cell).join(";");

/**
 * Baut den detaillierten Lohn-CSV-String.
 *
 * @param {Object}   p
 * @param {Array}    p.entries        Stundeneintraege des Monats (nur Mitarbeiter)
 * @param {Function} p.hoursOf        (entry) => Stunden als Float
 * @param {Map}      p.userById       id -> { name, stundensatz }
 * @param {Map}      p.baustelleById  id -> { kunde }
 * @param {string}   p.monthLabel     z.B. 'Juli 2026'
 * @returns {string} CSV (mit BOM, CRLF-Zeilenenden)
 */
export function buildLohnCsv({ entries, hoursOf, userById, baustelleById, monthLabel }) {
  const lines = [];
  lines.push(row(["Lohn-/Stundenexport", monthLabel]));
  lines.push("");
  lines.push(
    row([
      "Mitarbeiter",
      "Datum",
      "Baustelle",
      "Taetigkeit",
      "Beginn",
      "Ende",
      "Pause (Min)",
      "Fahrtzeit (Min)",
      "Stunden",
      "Stundensatz (EUR)",
      "Betrag (EUR)",
      "Freigegeben",
    ]),
  );

  const sorted = [...entries].sort((a, b) => {
    const ua = userById.get(a.mitarbeiterId)?.name || "";
    const ub = userById.get(b.mitarbeiterId)?.name || "";
    return ua.localeCompare(ub) || String(a.datum).localeCompare(String(b.datum));
  });

  const summary = new Map(); // uid -> { name, satz, std, betrag }
  let totalStd = 0;
  let totalBetrag = 0;

  sorted.forEach((e) => {
    const u = userById.get(e.mitarbeiterId);
    const name = u?.name || "Unbekannt";
    const satz = Number(u?.stundensatz || 0);
    const std = round15(hoursOf(e));
    const betrag = std * satz;
    const bs = baustelleById.get(e.baustelleId)?.kunde || "";
    lines.push(
      row([
        name,
        deDate(e.datum),
        bs,
        e.arbeit || "",
        e.beginn || "",
        e.ende || "",
        e.pause ?? "",
        e.fahrtzeit ?? "",
        deNum(std),
        deNum(satz),
        deNum(betrag),
        e.freigegeben ? "Ja" : "Nein",
      ]),
    );
    let s = summary.get(e.mitarbeiterId);
    if (!s) {
      s = { name, satz, std: 0, betrag: 0 };
      summary.set(e.mitarbeiterId, s);
    }
    s.std += std;
    s.betrag += betrag;
    totalStd += std;
    totalBetrag += betrag;
  });

  lines.push("");
  lines.push(row(["Zusammenfassung", monthLabel]));
  lines.push(
    row(["Mitarbeiter", "Stunden gesamt", "Stundensatz (EUR)", "Betrag gesamt (EUR)"]),
  );
  [...summary.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((s) => {
      lines.push(row([s.name, deNum(s.std), deNum(s.satz), deNum(s.betrag)]));
    });
  lines.push(row(["GESAMT", deNum(totalStd), "", deNum(totalBetrag)]));

  return "﻿" + lines.join("\r\n");
}

/** Loest einen CSV-Download im Browser aus. */
export function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
