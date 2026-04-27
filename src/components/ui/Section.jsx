import Card from "./Card";
import SectionHeader from "./SectionHeader";

/**
 * Section: gruppiert Form/Listen-Inhalte unter einer optionalen
 * Überschrift in einer Card. Standard-Margin-Bottom 16, padding=0
 * (Inhalte bringen ihr eigenes Padding mit, z.B. label/input-Reihen).
 *
 * Eingeführt für F-09 (BstForm-Refactor) — wiederverwendbar für
 * KostenView, MitForm und alle anderen mehrteiligen Forms.
 *
 *   <Section title="Stammdaten">
 *     <div style={{padding: "12px 16px"}}>...</div>
 *     <div style={{borderTop: ..., padding: ...}}>...</div>
 *   </Section>
 */
const Section = ({ title, children, style = {} }) => (
  <div style={{ marginBottom: 16, ...style }}>
    {title && <SectionHeader>{title}</SectionHeader>}
    <Card padding={0} style={{ overflow: "hidden" }}>
      {children}
    </Card>
  </div>
);

export default Section;
