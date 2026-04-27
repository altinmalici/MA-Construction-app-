/**
 * iOS-Style Section-Überschrift (uppercase, kleines Grau).
 *
 * Aus F-01 extrahiert (Tag 2). Pattern-Quelle: MehrView.jsx,
 * KostenView.jsx, ProfilView.jsx — überall identisch.
 *
 *   <SectionHeader>Meine Baustellen</SectionHeader>
 */
const SectionHeader = ({ children, style = {} }) => (
  <p
    style={{
      fontSize: 13,
      fontWeight: 600,
      color: "#8e8e93",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      paddingBottom: 8,
      ...style,
    }}
  >
    {children}
  </p>
);

export default SectionHeader;
