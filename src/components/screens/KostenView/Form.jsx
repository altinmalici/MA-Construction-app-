import { Receipt } from "lucide-react";
import { BTN, CS, IC } from "../../../utils/helpers";
import { Spinner } from "../../ui";
import { KAT_LABELS, KAT_COLORS } from "./aggregations.js";

/**
 * KostenView Form-Sub-Component (6-03a Phase 2). Pure-Render — gesamter
 * State wird vom Parent (KostenView/index oder List) gehalten.
 *
 * Props:
 *  - kf:          Form-State { baustelleId, kategorie, beschreibung, betrag, datum }
 *  - sKf:         Setter für kf
 *  - baustellen:  data.baustellen
 *  - saving:      boolean (von useSaving)
 *  - onSave:      Callback (löst saveKost in Parent aus)
 */
const Form = ({ kf, sKf, baustellen, saving, onSave }) => (
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
      {baustellen.map((b) => (
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
            background: kf.kategorie === k ? KAT_COLORS[k] : "white",
            boxShadow: kf.kategorie === k ? "none" : CS,
          }}
        >
          {KAT_LABELS[k]}
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
      onClick={onSave}
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
);

export default Form;
