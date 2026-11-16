import { useState } from "react";
import { useApp } from "../../../context/AppContext";
import { useKostenAggregat } from "./aggregations.js";
import KostenList from "./List.jsx";
import KostenDetail from "./Detail.jsx";

/**
 * KostenView Container (6-03a Phase 2). Hält selBs-State + Routing zwischen
 * List und Detail. Aggregat-Hook lebt hier (eine zentrale Berechnungs-
 * Quelle für beide Views), wird per Prop weitergereicht.
 *
 * History-Stack: nicht React-Router — wir bleiben im AppContext-View-Pattern.
 * setSelBs(null) = "zurück zur Liste".
 */
const KostenView = () => {
  const { data } = useApp();
  const [selBs, setSelBs] = useState(null);
  // Baustelle, für die das Erfassen-Formular beim Zurückkehren offen sein soll.
  const [prefillBs, setPrefillBs] = useState(null);

  const aggregat = useKostenAggregat({
    baustellen: data.baustellen,
    stundeneintraege: data.stundeneintraege,
    users: data.users,
    kosten: data.kosten,
  });

  if (selBs) {
    return (
      <KostenDetail
        bsId={selBs.id}
        aggregat={aggregat}
        onBack={() => setSelBs(null)}
        onAddKosten={(bsId) => {
          // "+ Kosten" in der Detailansicht: zurück zur Liste und das
          // Formular gleich mit dieser Baustelle öffnen (vorher passierte
          // scheinbar nichts).
          setPrefillBs(bsId);
          setSelBs(null);
        }}
      />
    );
  }

  return (
    <KostenList
      onSelectBs={(b) => {
        setPrefillBs(null);
        setSelBs(b);
      }}
      prefillBs={prefillBs}
    />
  );
};

export default KostenView;
