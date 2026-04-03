import { useState } from "react";
import { Plus, Search, Building2, MapPin } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { P, BTN, GREEN, CS } from "../../utils/helpers";
import { ScreenLayout, Empty, Bdg, PBar } from "../ui";

const BstList = () => {
  const { data, cu, chef, sq, setSq, nav, setSb, setEm, prevV, goBack } =
    useApp();
  const [fl, setFl] = useState("alle");
  if (!cu) return null;
  let ls = chef
    ? data.baustellen
    : data.baustellen.filter((b) => b.mitarbeiter.includes(cu.id));
  if (sq)
    ls = ls.filter((b) =>
      (b.kunde + b.adresse).toLowerCase().includes(sq.toLowerCase()),
    );
  if (fl !== "alle") ls = ls.filter((b) => b.status === fl);
  const sc = {
    geplant: P,
    aktiv: GREEN,
    fertig: "#8e8e93",
    abgerechnet: "#8e8e93",
  };
  return (
    <ScreenLayout
      large
      title="Baustellen"
      onBack={prevV ? goBack : undefined}
      right={
        chef && (
          <button
            onClick={() => {
              setSb(null);
              setEm(false);
              nav("bsf");
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: BTN,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
            }}
          >
            <Plus size={18} style={{ color: "white" }} />
          </button>
        )
      }
    >
      <div style={{ marginBottom: 8 }}>
        <div style={{ position: "relative" }}>
          <Search
            style={{
              position: "absolute",
              top: "50%",
              transform: "translateY(-50%)",
              left: 12,
              color: "#8e8e93",
            }}
            size={16}
          />
          <input
            value={sq}
            onChange={(e) => setSq(e.target.value)}
            placeholder="Suchen..."
            style={{
              width: "100%",
              padding: "10px 16px 10px 38px",
              borderRadius: 12,
              fontSize: 15,
              background: "rgba(118,118,128,0.12)",
              border: "none",
              color: "#000",
              outline: "none",
            }}
          />
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          marginBottom: 12,
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {["alle", "geplant", "aktiv", "fertig", "abgerechnet"].map((s) => (
          <button
            key={s}
            onClick={() => setFl(s)}
            style={{
              padding: "8px 16px",
              borderRadius: 100,
              fontSize: 13,
              fontWeight: 500,
              whiteSpace: "nowrap",
              border: "none",
              cursor: "pointer",
              ...(fl === s
                ? { background: P, color: "white", boxShadow: "none" }
                : {
                    background: "white",
                    color: "#3c3c43",
                    boxShadow:
                      "0 1px 3px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.04)",
                  }),
            }}
          >
            {s === "alle" ? "Alle" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {ls.length === 0 ? (
          <Empty
            icon={Building2}
            text="Tippe auf + um eine Baustelle anzulegen"
          />
        ) : (
          ls.map((b) => (
            <button
              key={b.id}
              onClick={() => {
                setSb(b);
                nav("bsd");
              }}
              className="w-full text-left"
              style={{
                padding: "16px",
                borderRadius: 12,
                background: "white",
                boxShadow: CS,
                border: "none",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <div
                className="flex items-start justify-between"
                style={{ marginBottom: 6 }}
              >
                <p style={{ fontSize: 15, fontWeight: 600, color: "#000" }}>
                  {b.kunde}
                </p>
                <Bdg text={b.status} color={sc[b.status]} />
              </div>
              <div
                className="flex items-center gap-1"
                style={{ color: "#8e8e93", fontSize: 13, marginBottom: 8 }}
              >
                <MapPin size={11} />
                {b.adresse}
              </div>
              <div className="flex items-center gap-2">
                <PBar value={b.fortschritt || 0} small />
                <span style={{ fontSize: 13, color: "#8e8e93", width: 32 }}>
                  {b.fortschritt || 0}%
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </ScreenLayout>
  );
};

export default BstList;
