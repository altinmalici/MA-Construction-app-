import { bStdNum } from "./helpers.js";

// Ab dieser Dauer fragt die Stundenerfassung nach ("Stimmt das?"). Fängt
// vor allem vertauschte Zeiten ab: 16:00–07:00 würde sonst still als
// 15-Stunden-Nachtschicht gespeichert.
export const LANGE_SCHICHT_STD = 12;

// Pause auf das 15-Minuten-Raster bringen (Projektregel).
export const snapPause = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n / 15) * 15;
};

/**
 * Prüft die Eingaben der Stundenerfassung.
 * @returns {{fehler: string|null, stunden: number, lang: boolean}}
 *   fehler: Meldung für den Nutzer oder null; lang: Rückfrage nötig.
 */
export function pruefeStunde(fd, { pauseBelassen = false } = {}) {
  const err = (fehler) => ({ fehler, stunden: 0, lang: false });
  if (!fd.baustelleId) return err("Baustelle wählen");
  if (fd.personTyp === "mitarbeiter" && !fd.mitarbeiterId) return err("Mitarbeiter wählen");
  if (fd.personTyp === "sub" && !fd.subId) return err("Subunternehmer wählen");
  if (fd.personTyp === "sonstige" && !String(fd.personName || "").trim()) return err("Name eingeben");
  if (!fd.datum || !/^\d{4}-\d{2}-\d{2}$/.test(fd.datum)) return err("Datum wählen");
  if (!/^\d{1,2}:\d{2}$/.test(fd.beginn || "") || !/^\d{1,2}:\d{2}$/.test(fd.ende || ""))
    return err("Beginn und Ende angeben");
  if (fd.beginn === fd.ende) return err("Beginn und Ende sind gleich");
  // Mit der Pause prüfen, die auch gespeichert wird (15-Minuten-Raster).
  const stunden = bStdNum(
    fd.beginn,
    fd.ende,
    pauseBelassen ? Number(fd.pause) || 0 : snapPause(fd.pause),
  );
  if (!(stunden > 0)) return err("Arbeitszeit ist 0 – Beginn, Ende und Pause prüfen");
  return { fehler: null, stunden, lang: stunden > LANGE_SCHICHT_STD };
}

// Aus dem Formular-State den zu speichernden Eintrag bauen.
// pauseBelassen: die Pause NICHT aufs 15-Minuten-Raster bringen — für das
// Bearbeiten eines alten Eintrags, dessen Pause der Nutzer nicht angefasst
// hat (z.B. 20 min aus der Zeit vor dem Raster). Sonst würde ein Eintrag,
// bei dem nur die Tätigkeit korrigiert wird, still andere Stunden bekommen.
export function baueEintrag(fd, { id, fotos, pauseBelassen = false }) {
  return {
    ...fd,
    id,
    fotos,
    pause: pauseBelassen ? Number(fd.pause) || 0 : snapPause(fd.pause),
    baustelleId: fd.baustelleId,
    mitarbeiterId: fd.personTyp === "mitarbeiter" ? fd.mitarbeiterId : null,
    subId: fd.personTyp === "sub" ? fd.subId : null,
    personName: fd.personTyp === "sonstige" ? String(fd.personName || "").trim() : "",
  };
}
