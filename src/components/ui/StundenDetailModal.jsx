import { useEffect } from "react";
import { X, Clock, MapPin, User } from "lucide-react";
import { fDat, bStd } from "../../utils/helpers";
import PhotoGrid from "./PhotoGrid";

/**
 * Read-only Detail-Drawer für einen Stundeneintrag.
 *
 * Eingeführt für BUG-FU-1: Stundeneinträge in Übersichts-Screens waren
 * vorher nicht anklickbar → Fotos in DB blieben unsichtbar.
 *
 * Felder: Datum, Beginn-Ende-Pause, Stunden-Summe, Baustelle (Kunde +
 * Adresse), Mitarbeiter-Name, Tätigkeit, Material, Bemerkung (falls
 * vorhanden), PhotoGrid (read-only).
 *
 *   <StundenDetailModal
 *     open={!!sel}
 *     eintrag={sel}
 *     baustelle={bs}
 *     userName={name}
 *     onClose={() => setSel(null)}
 *   />
 */
const StundenDetailModal = ({ open, eintrag, baustelle, userName, onClose }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !eintrag) return null;

  const stdStr = bStd(eintrag.beginn, eintrag.ende, eintrag.pause);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Stundeneintrag-Details"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 100,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: "16px 16px 0 0",
          width: "100%",
          maxWidth: 600,
          maxHeight: "85vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 -10px 40px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "0.5px solid rgba(0,0,0,0.08)",
          }}
        >
          <div>
            <p style={{ fontSize: 17, fontWeight: 600, color: "#000" }}>
              {fDat(eintrag.datum)}
            </p>
            <p style={{ fontSize: 13, color: "#8e8e93" }}>
              {eintrag.beginn}–{eintrag.ende}, Pause {eintrag.pause || 0} Min
              {" · "}
              <span style={{ fontWeight: 600, color: "#000" }}>{stdStr}h</span>
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Schließen"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              background: "rgba(0,0,0,0.06)",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <X size={20} style={{ color: "#3c3c43" }} />
          </button>
        </div>

        <div style={{ overflowY: "auto", padding: 16 }} className="space-y-3">
          {baustelle && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <MapPin size={16} style={{ color: "#8e8e93", marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#000" }}>
                  {baustelle.kunde}
                </p>
                {baustelle.adresse && (
                  <p style={{ fontSize: 13, color: "#8e8e93" }}>
                    {baustelle.adresse}
                  </p>
                )}
              </div>
            </div>
          )}

          {userName && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <User size={16} style={{ color: "#8e8e93" }} />
              <p style={{ fontSize: 14, color: "#000" }}>{userName}</p>
            </div>
          )}

          {eintrag.fahrtzeit > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Clock size={16} style={{ color: "#8e8e93" }} />
              <p style={{ fontSize: 14, color: "#000" }}>
                Fahrtzeit: {eintrag.fahrtzeit} Min
              </p>
            </div>
          )}

          {eintrag.arbeit && (
            <div>
              <p
                style={{
                  fontSize: 11,
                  color: "#8e8e93",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 4,
                }}
              >
                Tätigkeit
              </p>
              <p style={{ fontSize: 14, color: "#000" }}>{eintrag.arbeit}</p>
            </div>
          )}

          {eintrag.material && (
            <div>
              <p
                style={{
                  fontSize: 11,
                  color: "#8e8e93",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 4,
                }}
              >
                Material
              </p>
              <p style={{ fontSize: 14, color: "#000" }}>{eintrag.material}</p>
            </div>
          )}

          {eintrag.fotos?.length > 0 && (
            <div>
              <p
                style={{
                  fontSize: 11,
                  color: "#8e8e93",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 6,
                }}
              >
                Fotos ({eintrag.fotos.length})
              </p>
              <PhotoGrid fotos={eintrag.fotos} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StundenDetailModal;
