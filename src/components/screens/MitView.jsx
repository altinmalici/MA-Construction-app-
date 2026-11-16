import { useState } from "react";
import { Plus, User, Trash2, Edit3, Users, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { fE, genUsername, genPin, BTN, RED, GREEN } from "../../utils/helpers";
import { Empty, Bdg, ScreenLayout, ConfirmModal, Card, InviteCard } from "../ui";
import { fehlerText } from "../../utils/errors";
import { inviteLink } from "../../utils/invite";
import { istRpcFehlt } from "../../lib/api/users";
import { ONBOARDING_LINK_MODE } from "../../config";

const MitView = () => {
  const { data, actions, show, goBack, setEditUser, nav } =
    useApp();
  const ma = data.users.filter((u) => u.role === "mitarbeiter");
  const [resetInfo, setResetInfo] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const getStatus = (u) => {
    if (!u.isActive) return { color: RED, text: "Deaktiviert" };
    if (!u.isOnboarded) {
      const exp =
        u.onboardingPinExpiry && new Date(u.onboardingPinExpiry) < new Date();
      return exp
        ? { color: RED, text: "PIN abgelaufen" }
        : { color: "#FF9500", text: "Eingeladen" };
    }
    return { color: GREEN, text: "Aktiv" };
  };
  const [confirmReset, setConfirmReset] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const MIGRATION_HINT =
    "Diese Funktion braucht die Datenbank-Migration 04 (Onboarding) – siehe docs/AUTOPILOT_2026-11-16.md";

  // Alter Ablauf: neuer 4-stelliger Einladungs-PIN. ACHTUNG: macht den
  // bisherigen PIN sofort ungültig → nur nach Rückfrage.
  const resetPin = async (m) => {
    const pin = genPin();
    let username = m.username;
    if (!username) {
      const existing = data.users.map((u) => u.username).filter(Boolean);
      username = genUsername(m.name, existing);
    }
    setBusyId(m.id);
    try {
      await actions.users.resetOnboardingPin(m.id, pin, username);
      setResetInfo({ name: m.name, username, pin });
      show("Neuer Einladungs-PIN erstellt");
    } catch (e) {
      console.error("[MitView.resetPin]", e);
      show(`PIN nicht zurückgesetzt: ${fehlerText(e, "Bitte erneut versuchen.")}`, "error");
    } finally {
      setBusyId(null);
    }
  };

  // Neuer Ablauf: Einladungs-Link. Der bisherige PIN bleibt gültig, bis der
  // Mitarbeiter den Link einlöst — daher keine Rückfrage nötig. Fehlt die
  // DB-Funktion (Migration noch nicht angewandt), geht es mit Rückfrage
  // über den alten PIN-Reset.
  const invite = async (m) => {
    if (ONBOARDING_LINK_MODE === "0") {
      setConfirmReset(m);
      return;
    }
    setBusyId(m.id);
    try {
      const token = await actions.users.createOnboardingToken(m.id);
      setResetInfo({ userId: m.id, name: m.name, username: m.username, link: inviteLink(token) });
      show("Einladungs-Link erstellt");
    } catch (e) {
      if (istRpcFehlt(e)) {
        setConfirmReset(m);
      } else {
        console.error("[MitView.invite]", e);
        show(`Kein Link erstellt: ${fehlerText(e, "Bitte erneut versuchen.")}`, "error");
      }
    } finally {
      setBusyId(null);
    }
  };

  const revoke = async () => {
    const info = resetInfo;
    if (!info?.userId) return;
    try {
      await actions.users.revokeOnboardingTokens(info.userId);
      setResetInfo(null);
      show("Link widerrufen – er funktioniert nicht mehr");
    } catch (e) {
      console.error("[MitView.revoke]", e);
      show(`Nicht widerrufen: ${fehlerText(e, "Bitte erneut versuchen.")}`, "error");
    }
  };

  const REPAIR_TEXT = {
    auth_angelegt: "Anmelde-Konto neu angelegt",
    auth_verknuepft: "vorhandenes Anmelde-Konto verknüpft",
    email_korrigiert: "Anmelde-Adresse korrigiert",
    identity_angelegt: "Identität ergänzt",
    identity_korrigiert: "Identität korrigiert",
    auth_felder_korrigiert: "Kontofelder korrigiert",
    sperre_aufgehoben: "Sperre aufgehoben",
    sperre_gesetzt: "Sperre gesetzt",
  };
  const repair = async (m) => {
    setBusyId(m.id);
    try {
      const r = await actions.users.repair(m.id);
      if (r === "ok") {
        show("Zugang ist in Ordnung – nichts zu reparieren");
      } else {
        const teile = String(r).split(",").map((k) => REPAIR_TEXT[k] || k);
        show(`Repariert: ${teile.join(", ")}. Jetzt neue Einladung schicken.`);
      }
    } catch (e) {
      console.error("[MitView.repair]", e);
      show(istRpcFehlt(e) ? MIGRATION_HINT : `Nicht repariert: ${fehlerText(e, "Bitte erneut versuchen.")}`, "error");
    } finally {
      setBusyId(null);
    }
  };
  const cleanup = async () => {
    try {
      const n = await actions.users.cleanupOrphans();
      show(n > 0 ? `${n} verwaiste${n === 1 ? "s Konto" : " Konten"} entfernt` : "Keine verwaisten Konten gefunden");
    } catch (e) {
      console.error("[MitView.cleanup]", e);
      show(istRpcFehlt(e) ? MIGRATION_HINT : `Nicht bereinigt: ${fehlerText(e, "Bitte erneut versuchen.")}`, "error");
    }
  };
  const toggleActive = async (m) => {
    setBusyId(m.id);
    try {
      await actions.users.toggleActive(m.id, !m.isActive);
      show(m.isActive ? "Deaktiviert" : "Aktiviert");
    } catch (e) {
      console.error("[MitView.toggleActive]", e);
      show(`Nicht geändert: ${fehlerText(e, "Bitte erneut versuchen.")}`, "error");
    } finally {
      setBusyId(null);
    }
  };
  const del = (id) => setConfirmDelete(id);
  const doDelete = async () => {
    const id = confirmDelete;
    setConfirmDelete(null);
    if (!id) return;
    try {
      await actions.users.remove(id);
      show("Gelöscht");
    } catch (e) {
      console.error("[MitView.del]", e);
      show(`Nicht gelöscht: ${fehlerText(e, "Bitte erneut versuchen.")}`, "error");
    }
  };
  return (
    <ScreenLayout
      title="Handwerker"
      onBack={goBack}
      right={
        <button
          onClick={() => {
            setEditUser(null);
            nav("mitf");
          }}
          style={{
            padding: 8,
            borderRadius: 10,
            color: "white",
            background: BTN,
            border: "none",
            cursor: "pointer",
          }}
        >
          <Plus size={18} />
        </button>
      }
    >
      {resetInfo && (
        <div style={{ marginBottom: 12, position: "relative" }}>
          <InviteCard
            info={resetInfo}
            show={show}
            title={`Einladung für ${resetInfo.name}`}
          />
          <button
            onClick={() => setResetInfo(null)}
            aria-label="Einladung schließen"
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 44,
              height: 44,
              background: "none",
              border: "none",
              color: "#8e8e93",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
          {resetInfo.link && (
            <button
              onClick={revoke}
              style={{
                width: "100%",
                minHeight: 44,
                marginTop: 4,
                fontSize: 13,
                color: RED,
                background: "none",
                border: "none",
              }}
            >
              Link widerrufen (z.B. an den Falschen geschickt)
            </button>
          )}
        </div>
      )}
      <div className="space-y-2">
        {ma.length === 0 ? (
          <Empty icon={Users} text="Noch keine Handwerker angelegt" />
        ) : (
          ma.map((m) => {
            const bs = data.baustellen.filter((b) =>
              (b.mitarbeiter || []).includes(m.id),
            );
            const st = getStatus(m);
            return (
              <Card
                key={m.id}
                style={{ opacity: m.isActive ? 1 : 0.6 }}
              >
                <div
                  className="flex items-center gap-3"
                  style={{ marginBottom: 8 }}
                >
                  <div style={{ position: "relative" }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: "rgba(0,0,0,0.06)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <User size={16} style={{ color: "#3c3c43" }} />
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        bottom: -2,
                        right: -2,
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        background: st.color,
                        border: "2px solid white",
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <p style={{ fontSize: 15, color: "#000" }}>{m.name}</p>
                    <p style={{ fontSize: 13, color: "#8e8e93" }}>
                      {m.username ? `@${m.username}` : ""}
                      {m.username ? " · " : ""}
                      {fE(m.stundensatz || 45)}/h
                    </p>
                  </div>
                  <Bdg text={st.text} color={st.color} />
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 4,
                    marginBottom: 8,
                  }}
                >
                  {bs.length === 0 ? (
                    <span style={{ fontSize: 13, color: "#8e8e93" }}>
                      Keine Baustellen
                    </span>
                  ) : (
                    bs.map((b) => <Bdg key={b.id} text={b.kunde} />)
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    borderTop: "0.5px solid rgba(0,0,0,0.08)",
                    paddingTop: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    onClick={() => {
                      setEditUser(m);
                      nav("mitf");
                    }}
                    style={{
                      flex: 1,
                      minHeight: 44,
                      padding: "8px 12px",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#3c3c43",
                      background: "rgba(0,0,0,0.06)",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                    }}
                  >
                    <Edit3 size={14} />
                    Bearbeiten
                  </button>
                  {m.isActive && (
                    <button
                      onClick={() => invite(m)}
                      disabled={busyId === m.id}
                      style={{
                        flex: 1,
                        minHeight: 44,
                        padding: "8px 12px",
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#FF9500",
                        background: "#FF950012",
                        border: "none",
                      }}
                    >
                      {m.isOnboarded ? "Neuer Zugang" : "Einladung senden"}
                    </button>
                  )}
                  {/* Für alle aktiven Mitarbeiter: auch ein bereits
                      eingerichtetes Konto kann aus dem Tritt geraten. */}
                  {m.isActive && (
                    <button
                      onClick={() => repair(m)}
                      disabled={busyId === m.id}
                      style={{
                        minHeight: 44,
                        padding: "8px 12px",
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#3c3c43",
                        background: "rgba(0,0,0,0.06)",
                        border: "none",
                      }}
                    >
                      Zugang reparieren
                    </button>
                  )}
                  <button
                    onClick={() => toggleActive(m)}
                    disabled={busyId === m.id}
                    style={{
                      minHeight: 44,
                      padding: "8px 12px",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      color: m.isActive ? RED : GREEN,
                      background: m.isActive ? `${RED}12` : `${GREEN}12`,
                      border: "none",
                    }}
                  >
                    {m.isActive ? "Deaktivieren" : "Aktivieren"}
                  </button>
                  <button
                    onClick={() => del(m.id)}
                    aria-label={`${m.name} löschen`}
                    style={{
                      minWidth: 44,
                      minHeight: 44,
                      padding: "8px",
                      borderRadius: 10,
                      color: "#c7c7cc",
                      background: "none",
                      border: "none",
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            );
          })
        )}
      </div>
      <button
        onClick={cleanup}
        style={{
          width: "100%",
          marginTop: 16,
          minHeight: 44,
          fontSize: 13,
          color: "#8e8e93",
          background: "none",
          border: "none",
        }}
      >
        Verwaiste Konten bereinigen
      </button>
      <ConfirmModal
        open={!!confirmReset}
        title="PIN zurücksetzen?"
        message={`${confirmReset?.name || ""} bekommt einen neuen Einladungs-PIN. Der bisherige PIN funktioniert danach sofort nicht mehr.`}
        confirmLabel="Zurücksetzen"
        cancelLabel="Abbrechen"
        destructive
        onConfirm={() => {
          const m = confirmReset;
          setConfirmReset(null);
          if (m) return resetPin(m);
        }}
        onCancel={() => setConfirmReset(null)}
      />
      <ConfirmModal
        open={!!confirmDelete}
        title="Mitarbeiter löschen?"
        message="Der Zugang wird komplett entfernt."
        confirmLabel="Löschen"
        cancelLabel="Abbrechen"
        destructive
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </ScreenLayout>
  );
};

export default MitView;
