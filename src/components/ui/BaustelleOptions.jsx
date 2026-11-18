/**
 * <option>-Liste für eine Baustellen-Auswahl aus selectableBaustellen():
 * offene Baustellen oben, darunter die Gruppen "Abgeschlossen" und – nur wo
 * ausdrücklich verlangt – "Abgerechnet".
 */
export default function BaustelleOptions({ auswahl }) {
  const opt = (b) => (
    <option key={b.id} value={b.id}>
      {b.kunde}
    </option>
  );
  return (
    <>
      {auswahl.offen.map(opt)}
      {auswahl.abgeschlossen.length > 0 && (
        <optgroup label="Abgeschlossen">{auswahl.abgeschlossen.map(opt)}</optgroup>
      )}
      {auswahl.abgerechnet.length > 0 && (
        <optgroup label="Abgerechnet">{auswahl.abgerechnet.map(opt)}</optgroup>
      )}
    </>
  );
}
