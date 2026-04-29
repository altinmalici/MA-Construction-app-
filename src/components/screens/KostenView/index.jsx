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
        onAddKosten={() => {
          // List-Form ist nur in der List-View sichtbar — zurück und User
          // tippt selbst auf "+". Wir öffnen es nicht magisch in der List
          // weil das eine Cross-Component-State-Manipulation wäre.
          setSelBs(null);
        }}
      />
    );
  }

  return <KostenList onSelectBs={setSelBs} />;
};

export default KostenView;
