import { Share2, Copy } from "lucide-react";
import { BTN, CS } from "../../utils/helpers";
import { buildInviteText, shareInvite, copyText, whatsappUrl } from "../../utils/invite";

/**
 * Zeigt eine frische Einladung (Link oder Einladungs-PIN) und bietet
 * Teilen / Kopieren / WhatsApp an. `info`: {name, username, link?, pin?}.
 * `show` ist die Toast-Funktion aus dem AppContext.
 */
export default function InviteCard({ info, show, title }) {
  const text = buildInviteText(info);
  const share = async () => {
    const r = await shareInvite(text);
    if (r === "copied") show("Einladung kopiert – jetzt in WhatsApp/SMS einfügen");
    if (r === "failed") show("Teilen nicht möglich – bitte Text abschreiben", "error");
  };
  const copy = async () => {
    if (await copyText(text)) show("Einladung kopiert");
    else show("Kopieren nicht möglich", "error");
  };
  const label = { fontSize: 13, color: "#8e8e93", marginBottom: 2 };
  const btn = {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    border: "none",
    fontWeight: 600,
    fontSize: 15,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    cursor: "pointer",
  };
  return (
    <div style={{ background: "white", borderRadius: 12, padding: 16, boxShadow: CS }}>
      {title && (
        <p style={{ fontSize: 15, fontWeight: 600, color: "#000", marginBottom: 10 }}>{title}</p>
      )}
      <div style={{ background: "#f2f2f7", borderRadius: 10, padding: 14, marginBottom: 12 }}>
        <p style={label}>Benutzername</p>
        <p style={{ fontSize: 17, fontWeight: 600, color: "#000", marginBottom: 10 }}>
          {info.username}
        </p>
        {info.link ? (
          <>
            <p style={label}>Einladungs-Link</p>
            <p
              style={{
                fontSize: 13,
                color: "#000",
                wordBreak: "break-all",
                userSelect: "all",
                WebkitUserSelect: "all",
              }}
            >
              {info.link}
            </p>
            <p style={{ fontSize: 12, color: "#8e8e93", marginTop: 8 }}>
              7 Tage gültig, nur einmal verwendbar. Der Mitarbeiter legt darüber
              seinen eigenen PIN fest.
            </p>
          </>
        ) : (
          <>
            <p style={label}>Einladungs-PIN</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: "#000", letterSpacing: 4 }}>
              {info.pin}
            </p>
            <p style={{ fontSize: 12, color: "#8e8e93", marginTop: 8 }}>Gültig für 7 Tage</p>
          </>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={share} style={{ ...btn, background: BTN, color: "white" }}>
          <Share2 size={16} />
          Teilen
        </button>
        <button onClick={copy} style={{ ...btn, background: "rgba(0,0,0,0.06)", color: "#000" }}>
          <Copy size={16} />
          Kopieren
        </button>
      </div>
      <a
        href={whatsappUrl(text)}
        target="_blank"
        rel="noopener noreferrer"
        style={{ ...btn, background: "#25D366", color: "white", textDecoration: "none" }}
      >
        Per WhatsApp senden
      </a>
    </div>
  );
}
