import { useState, useRef, useEffect } from "react";
import { Check, Save, Edit3, Trash2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { CS, BTN, RED, IC, fDat, bStd, fStd, todayIso } from "../../utils/helpers";
import { ScreenLayout, PhotoGrid, TimePicker, Spinner, ConfirmModal } from "../ui";
import { useSaving } from "../../hooks/useSaving";
import { uploadPhotos } from "../../lib/storage";
import { enqueueStunde } from "../../lib/offlineQueue";
import { pruefeStunde, baueEintrag, snapPause } from "../../utils/stunden";
import { fehlerText, istNetzFehler } from "../../utils/errors";

const SteView = () => {
  const {
    sb,
    chef,
    cu,
    data,
    actions,
    show,
    nav,
    goBack,
    prevV,
    eName,
    trigPhoto,
    addN,
  } = useApp();
  const { saving, withSaving } = useSaving();
  const [editId, setEditId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const initFd = {
    baustelleId: sb?.id || "",
    datum: todayIso(),
    beginn: "07:00",
    ende: "16:00",
    // Pause und Fahrtzeit starten bei 0: Der Mitarbeiter trägt ein, was
    // tatsächlich anfiel. Früher waren pauschal je 30 Minuten vorausgefüllt
    // und wurden oft unbemerkt mitgespeichert.
    pause: 0,
    fahrtzeit: 0,
    arbeit: "",
    material: "",
    fotos: [],
    personTyp: "mitarbeiter",
    mitarbeiterId: chef ? "" : cu?.id || "",
    subId: "",
    personName: "",
  };
  const [fd, sFd] = useState(initFd);
  const [saved, setSaved] = useState(false);
  const [showList, setShowList] = useState(false);
  // Feste ID pro Formular-Durchgang: Ein zweiter Speicher-Versuch (nach
  // einer Fehlermeldung) schreibt denselben Eintrag, kein Duplikat.
  const entryIdRef = useRef(null);
  // Pause des Eintrags, wie er beim Öffnen zum Bearbeiten gespeichert war.
  const origPauseRef = useRef(null);
  const navTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(navTimerRef.current), []);
  const [confirmLang, setConfirmLang] = useState(null); // Stunden bei Rückfrage
  const [confirmFreigabe, setConfirmFreigabe] = useState(false);
  const [editFreigegeben, setEditFreigegeben] = useState(false);
  if (!cu) return null;
  const mb = chef
    ? data.baustellen
    : data.baustellen.filter((b) => b.mitarbeiter.includes(cu.id));
  // Bei genau einer möglichen Baustelle ist sie automatisch gewählt.
  const baustelleId = fd.baustelleId || (mb.length === 1 ? mb[0].id : "");

  const startEdit = (e) => {
    setEditId(e.id);
    sFd({
      baustelleId: String(e.baustelleId),
      datum: e.datum,
      beginn: e.beginn,
      ende: e.ende,
      pause: e.pause ?? 0,
      fahrtzeit: e.fahrtzeit || 0,
      arbeit: e.arbeit,
      material: e.material || "",
      fotos: e.fotos || [],
      personTyp: e.personTyp || "mitarbeiter",
      mitarbeiterId: e.mitarbeiterId || "",
      subId: e.subId || "",
      personName: e.personName || "",
    });
    setEditFreigegeben(!!e.freigegeben);
    origPauseRef.current = e.pause ?? 0;
    entryIdRef.current = null;
    setShowList(false);
  };


  const done = (kind) => {
    entryIdRef.current = null;
    setSaved(kind);
    navTimerRef.current = setTimeout(() => {
      sFd(initFd);
      setSaved(false);
      if (!chef) nav(sb ? "bsd" : "dash");
    }, 1200);
  };

  // Eintrag in die Offline-Warteschlange legen (kein Netz / Netzfehler).
  const queue = (entry, hinweis) => {
    if (!enqueueStunde(entry)) {
      show("Speicher voll – konnte offline nicht sichern", "error");
      return false;
    }
    actions.stundeneintraege.addLocal(entry);
    show(hinweis);
    done("create");
    return true;
  };

  // opts.langOk / opts.freigabeOk: Rückfragen wurden bereits bestätigt.
  const save = (opts = {}) =>
    withSaving(async () => {
      const form = { ...fd, baustelleId };
      // Alter Eintrag, Pause nicht angefasst → gespeicherten Wert belassen.
      const pauseBelassen =
        !!editId && Number(fd.pause) === Number(origPauseRef.current);
      const check = pruefeStunde(form, { pauseBelassen });
      if (check.fehler) {
        show(check.fehler, "error");
        return;
      }
      if (check.lang && !opts.langOk) {
        setConfirmLang(check.stunden);
        return;
      }
      // Freigegebene Stunden sind an die Lohnbuchhaltung übergeben: Ändern
      // nur nach Rückfrage, und die Freigabe wird dabei zurückgenommen.
      if (editId && editFreigegeben && !opts.freigabeOk) {
        setConfirmFreigabe(true);
        return;
      }
      const wasEdit = !!editId;
      if (!entryIdRef.current) entryIdRef.current = crypto.randomUUID();
      const entryId = editId || entryIdRef.current;
      const existing = form.fotos.filter((f) => typeof f === "string");
      const blobs = form.fotos.filter((f) => f && f.blob);
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;

      // OFFLINE: neuer Eintrag ohne Netz → in die Warteschlange statt Fehler.
      // Foto-Upload braucht Netz; neue Fotos werden ausgelassen (mit Hinweis).
      if (!editId && offline) {
        queue(
          baueEintrag(form, { id: entryId, fotos: existing }),
          blobs.length > 0
            ? "Offline gespeichert (ohne Foto – kein Netz)"
            : "Offline gespeichert – synchronisiert bei Empfang",
        );
        return;
      }

      let fotos = existing;
      try {
        // Foto-Upload VOR dem Schreiben; die ID steht schon fest, damit der
        // Storage-Pfad zum Eintrag passt.
        // Alles oder nichts: scheitert ein Foto, werden die übrigen wieder
        // entfernt (keine verwaisten Dateien).
        const uploaded = await uploadPhotos(
          blobs.map((p) => p.blob),
          form.baustelleId,
          "stundeneintraege",
          entryId,
        );
        fotos = [...existing, ...uploaded];
        const entry = baueEintrag(form, { id: entryId, fotos, pauseBelassen });

        if (editId) {
          await actions.stundeneintraege.update(editId, entry, {
            resetFreigabe: editFreigegeben,
          });
          show(editFreigegeben ? "Aktualisiert – Freigabe zurückgenommen" : "Aktualisiert");
          setEditId(null);
          setEditFreigegeben(false);
        } else {
          try {
            await actions.stundeneintraege.create(entry);
          } catch (e) {
            // Schon gespeichert (erster Versuch kam durch, nur die Antwort
            // ging verloren) → Erfolg, kein Duplikat.
            if (!(e?.code === "23505" || /duplicate key/i.test(e?.message || ""))) throw e;
          }
          const pn =
            form.personTyp === "mitarbeiter"
              ? data.users.find((u) => u.id === form.mitarbeiterId)?.name
              : form.personTyp === "sub"
                ? data.subunternehmer.find((x) => x.id === form.subId)?.name
                : form.personName;
          addN("stunden", `${pn || cu.name}: Stunden eingetragen`, form.baustelleId);
        }
        done(wasEdit ? "update" : "create");
      } catch (e) {
        console.error("[SteView.save]", e);
        // Schwacher Empfang: navigator.onLine sagt "online", die Anfrage
        // scheitert trotzdem. Neue Einträge dann NICHT verlieren, sondern
        // wie offline in die Warteschlange legen.
        if (!editId && istNetzFehler(e)) {
          queue(
            baueEintrag(form, { id: entryId, fotos }),
            blobs.length > 0 && fotos.length === existing.length
              ? "Kein Empfang – gespeichert ohne Foto, wird später gesendet"
              : "Kein Empfang – gespeichert, wird später gesendet",
          );
          return;
        }
        show(`Nicht gespeichert: ${fehlerText(e, "Bitte erneut versuchen.")}`, "error");
      }
    });

  const delEntry = (id) => setConfirmDelete(id);
  const doDeleteEntry = async () => {
    const id = confirmDelete;
    setConfirmDelete(null);
    if (!id) return;
    try {
      await actions.stundeneintraege.remove(id);
      show("Gelöscht");
    } catch (e) {
      console.error("[SteView.delEntry]", e);
      show(`Nicht gelöscht: ${fehlerText(e, "Bitte erneut versuchen.")}`, "error");
    }
  };

  // Einträge für gewählte Baustelle
  const bsEintraege = baustelleId
    ? data.stundeneintraege.filter((e) => e.baustelleId === baustelleId)
    : [];

  if (saved)
    return (
      <ScreenLayout>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100%",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: "rgba(52,199,89,0.15)" }}
            >
              <Check size={28} style={{ color: "#34C759" }} />
            </div>
            <p style={{ fontSize: 17, fontWeight: 600, color: "#000" }}>
              {saved === "update" ? "Aktualisiert!" : "Gespeichert!"}
            </p>
          </div>
        </div>
      </ScreenLayout>
    );
  return (
    <ScreenLayout
      title={
        sb ? (editId ? "Stunden bearbeiten" : "Stunden eintragen") : "Stunden"
      }
      large={!sb}
      onBack={
        sb
          ? () => {
              setEditId(null);
              goBack();
            }
          : prevV
            ? goBack
            : undefined
      }
      right={
        chef &&
        bsEintraege.length > 0 && (
          <button
            onClick={() => setShowList(!showList)}
            style={{
              padding: "4px 8px",
              borderRadius: 8,
              fontSize: 12,
              color: "#8e8e93",
              background: "rgba(0,0,0,0.05)",
              border: "none",
            }}
          >
            {showList ? "Formular" : "Einträge (" + bsEintraege.length + ")"}
          </button>
        )
      }
    >
      {/* Einträge-Liste (Chef) */}
      {showList && chef ? (
        <div className="space-y-2">
          {[...bsEintraege].reverse().map((e) => {
            return (
              <div
                key={e.id}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: "white",
                  boxShadow: CS,
                }}
              >
                <div
                  className="flex justify-between items-start"
                  style={{ marginBottom: 4 }}
                >
                  <div>
                    <p style={{ fontSize: 15, color: "#000" }}>
                      {eName(e)}
                      {e.personTyp === "sub" && (
                        <span
                          style={{
                            color: "#8e8e93",
                            fontSize: 13,
                            marginLeft: 4,
                          }}
                        >
                          (Sub)
                        </span>
                      )}
                      {e.personTyp === "sonstige" && (
                        <span
                          style={{
                            color: "#8e8e93",
                            fontSize: 13,
                            marginLeft: 4,
                          }}
                        >
                          (Sonstige)
                        </span>
                      )}
                    </p>
                    <p style={{ fontSize: 13, color: "#8e8e93" }}>
                      {fDat(e.datum)} · {e.beginn}–{e.ende}
                    </p>
                  </div>
                  <span
                    style={{ fontWeight: 600, fontSize: 15, color: "#000" }}
                  >
                    {bStd(e.beginn, e.ende, e.pause)}h
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "#8e8e93" }}>{e.arbeit}</p>
                {e.material && (
                  <p style={{ fontSize: 13, color: "#8e8e93" }}>
                    Material: {e.material}
                  </p>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    onClick={() => startEdit(e)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      fontSize: 13,
                      background: "rgba(0,0,0,0.06)",
                      color: "#3c3c43",
                      border: "none",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Edit3 size={12} />
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => delEntry(e.id)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      fontSize: 13,
                      background: `${RED}12`,
                      color: RED,
                      border: "none",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Trash2 size={12} />
                    Löschen
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Formular */
        <div>
          {/* Card: Baustelle & Person */}
          <div
            style={{
              background: "white",
              borderRadius: 12,
              marginBottom: 16,
              overflow: "hidden",
              boxShadow: CS,
            }}
          >
            <div style={{ padding: "12px 16px" }}>
              <label
                style={{
                  fontSize: 13,
                  color: "#8e8e93",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Baustelle
              </label>
              <select
                value={baustelleId}
                onChange={(e) => sFd({ ...fd, baustelleId: e.target.value })}
                className={IC}
              >
                <option value="">Baustelle wählen...</option>
                {mb.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.kunde}
                  </option>
                ))}
              </select>
              {!chef && mb.length === 0 && (
                <p
                  style={{
                    fontSize: 13,
                    color: RED,
                    marginTop: 8,
                    lineHeight: 1.4,
                  }}
                >
                  Dir ist noch keine Baustelle zugewiesen. Bitte melde dich beim
                  Bauleiter, damit du Stunden erfassen kannst.
                </p>
              )}
            </div>
            {chef && (
              <div
                style={{
                  borderTop: "0.5px solid rgba(0,0,0,0.08)",
                  padding: "12px 16px",
                }}
              >
                <label
                  style={{
                    fontSize: 13,
                    color: "#8e8e93",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Stunden für
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { id: "mitarbeiter", l: "Handwerker" },
                    { id: "sub", l: "Subunternehmer" },
                    { id: "sonstige", l: "Sonstige" },
                  ].map(({ id, l }) => (
                    <button
                      key={id}
                      onClick={() =>
                        sFd({
                          ...fd,
                          personTyp: id,
                          mitarbeiterId:
                            id !== "mitarbeiter" ? "" : fd.mitarbeiterId,
                          subId: id !== "sub" ? "" : fd.subId,
                        })
                      }
                      style={{
                        flex: 1,
                        padding: "10px 0",
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 500,
                        border: "none",
                        cursor: "pointer",
                        ...(fd.personTyp === id
                          ? { background: BTN, color: "white" }
                          : {
                              background: "white",
                              color: "#8e8e93",
                              boxShadow: CS,
                            }),
                      }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                {fd.personTyp === "mitarbeiter" && (
                  <select
                    value={fd.mitarbeiterId}
                    onChange={(e) =>
                      sFd({ ...fd, mitarbeiterId: e.target.value })
                    }
                    className={IC}
                    style={{ marginTop: 8 }}
                  >
                    <option value="">Handwerker wählen...</option>
                    {data.users
                      .filter((u) => u.role === "mitarbeiter")
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    <option value={cu.id}>{cu.name} (ich)</option>
                  </select>
                )}
                {fd.personTyp === "sub" && (
                  <select
                    value={fd.subId}
                    onChange={(e) => sFd({ ...fd, subId: e.target.value })}
                    className={IC}
                    style={{ marginTop: 8 }}
                  >
                    <option value="">Subunternehmer wählen...</option>
                    {data.subunternehmer.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.gewerk ? ` (${s.gewerk})` : ""}
                      </option>
                    ))}
                  </select>
                )}
                {fd.personTyp === "sonstige" && (
                  <input
                    value={fd.personName}
                    onChange={(e) => sFd({ ...fd, personName: e.target.value })}
                    placeholder="Name (z.B. Probearbeiter, Aushilfe...)"
                    className={IC}
                    style={{ marginTop: 8 }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Card: Datum & Zeiten */}
          <div
            style={{
              background: "white",
              borderRadius: 12,
              marginBottom: 16,
              overflow: "hidden",
              boxShadow: CS,
            }}
          >
            <div style={{ padding: "12px 16px" }}>
              <label
                style={{
                  fontSize: 13,
                  color: "#8e8e93",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Datum
              </label>
              <input
                type="date"
                value={fd.datum}
                onChange={(e) => sFd({ ...fd, datum: e.target.value })}
                className={IC}
              />
            </div>
            <div
              style={{
                borderTop: "0.5px solid rgba(0,0,0,0.08)",
                padding: "12px 16px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      color: "#8e8e93",
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    Beginn
                  </label>
                  <TimePicker
                    value={fd.beginn}
                    onChange={(v) => sFd({ ...fd, beginn: v })}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      color: "#8e8e93",
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    Ende
                  </label>
                  <TimePicker
                    value={fd.ende}
                    onChange={(v) => sFd({ ...fd, ende: v })}
                  />
                </div>
              </div>
            </div>
            <div
              style={{
                borderTop: "0.5px solid rgba(0,0,0,0.08)",
                padding: "12px 16px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      color: "#8e8e93",
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    Pause (Min)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="15"
                    inputMode="numeric"
                    value={fd.pause}
                    onChange={(e) =>
                      sFd({
                        ...fd,
                        pause: Math.max(0, parseInt(e.target.value, 10) || 0),
                      })
                    }
                    // Beim Antippen den Inhalt markieren: Sonst wird aus der
                    // vorbelegten "0" beim Tippen "045" (oder, mit dem Cursor
                    // vor der Null, 450 Minuten).
                    onFocus={(e) => e.target.select()}
                    // 15-Minuten-Raster: beim Verlassen des Feldes einrasten.
                    // Ausnahme: die unveränderte Pause eines alten Eintrags
                    // bleibt stehen (sonst würde schon das Antippen des
                    // Feldes die gespeicherte Arbeitszeit ändern).
                    onBlur={() =>
                      sFd((p) =>
                        editId && Number(p.pause) === Number(origPauseRef.current)
                          ? p
                          : { ...p, pause: snapPause(p.pause) },
                      )
                    }
                    className={IC}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      color: "#8e8e93",
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    Fahrtzeit (Min)
                  </label>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={fd.fahrtzeit}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) =>
                      sFd({
                        ...fd,
                        fahrtzeit: Math.max(
                          0,
                          parseInt(e.target.value, 10) || 0,
                        ),
                      })
                    }
                    className={IC}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stunden-Anzeige */}
          {fd.beginn && fd.ende && (
            <div
              style={{
                background: "white",
                borderRadius: 12,
                marginBottom: 16,
                padding: "14px 16px",
                boxShadow: CS,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 14, color: "#8e8e93" }}>
                Berechnete Arbeitszeit
              </span>
              <span style={{ fontSize: 17, fontWeight: 700, color: "#000" }}>
                {bStd(fd.beginn, fd.ende, fd.pause)}h{" "}
                <span
                  style={{ fontSize: 13, fontWeight: 500, color: "#8e8e93" }}
                >
                  + {fd.fahrtzeit}min Fahrt
                </span>
              </span>
            </div>
          )}

          {/* Card: Arbeit & Material */}
          <div
            style={{
              background: "white",
              borderRadius: 12,
              marginBottom: 16,
              overflow: "hidden",
              boxShadow: CS,
            }}
          >
            <div style={{ padding: "12px 16px" }}>
              <label
                style={{
                  fontSize: 13,
                  color: "#8e8e93",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Tätigkeit
              </label>
              <textarea
                value={fd.arbeit}
                onChange={(e) => sFd({ ...fd, arbeit: e.target.value })}
                placeholder="Was wurde gemacht? (optional)"
                rows={2}
                className={IC + " resize-none"}
              />
            </div>
            <div
              style={{
                borderTop: "0.5px solid rgba(0,0,0,0.08)",
                padding: "12px 16px",
              }}
            >
              <label
                style={{
                  fontSize: 13,
                  color: "#8e8e93",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Material
              </label>
              <input
                value={fd.material}
                onChange={(e) => sFd({ ...fd, material: e.target.value })}
                placeholder="Material verbraucht..."
                className={IC}
              />
            </div>
            <div
              style={{
                borderTop: "0.5px solid rgba(0,0,0,0.08)",
                padding: "12px 16px",
              }}
            >
              <label
                style={{
                  fontSize: 13,
                  color: "#8e8e93",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Fotos
              </label>
              <PhotoGrid
                fotos={fd.fotos}
                onAdd={() =>
                  trigPhoto((photo) =>
                    sFd((p) => ({ ...p, fotos: [...p.fotos, photo] })),
                  )
                }
                onRemove={(i) =>
                  sFd((p) => ({
                    ...p,
                    fotos: p.fotos.filter((_, idx) => idx !== i),
                  }))
                }
              />
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={() => save()}
            disabled={!baustelleId || saving}
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
              opacity: !baustelleId || saving ? 0.5 : 1,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? <Spinner size={20} color="white" /> : <Save size={20} />}
            {saving ? "Speichere..." : editId ? "Aktualisieren" : "Speichern"}
          </button>
          {editId && (
            <button
              onClick={() => {
                setEditId(null);
                setEditFreigegeben(false);
                sFd(initFd);
              }}
              className="w-full py-3 text-center"
              style={{ color: "#8e8e93", fontSize: 14, marginTop: 8 }}
            >
              Abbrechen – neuen Eintrag erstellen
            </button>
          )}
        </div>
      )}
      <ConfirmModal
        open={confirmLang !== null}
        title="Sehr lange Schicht"
        message={`Das ergibt ${fStd(confirmLang || 0)} Stunden (${fd.beginn}–${fd.ende}). Sind Beginn und Ende richtig?`}
        confirmLabel="Ja, speichern"
        cancelLabel="Korrigieren"
        onConfirm={() => {
          setConfirmLang(null);
          return save({ langOk: true });
        }}
        onCancel={() => setConfirmLang(null)}
      />
      <ConfirmModal
        open={confirmFreigabe}
        title="Freigegebenen Eintrag ändern?"
        message="Dieser Eintrag ist bereits freigegeben (an die Lohnabrechnung übergeben). Beim Ändern wird die Freigabe zurückgenommen."
        confirmLabel="Ändern"
        cancelLabel="Abbrechen"
        destructive
        onConfirm={() => {
          setConfirmFreigabe(false);
          return save({ langOk: true, freigabeOk: true });
        }}
        onCancel={() => setConfirmFreigabe(false)}
      />
      <ConfirmModal
        open={!!confirmDelete}
        title="Eintrag löschen?"
        message={
          data.stundeneintraege.find((e) => e.id === confirmDelete)?.freigegeben
            ? "Achtung: Dieser Eintrag ist bereits freigegeben (an die Lohnabrechnung übergeben). Er wird dauerhaft entfernt."
            : "Der Stundeneintrag wird dauerhaft entfernt."
        }
        confirmLabel="Löschen"
        cancelLabel="Abbrechen"
        destructive
        onConfirm={doDeleteEntry}
        onCancel={() => setConfirmDelete(null)}
      />
    </ScreenLayout>
  );
};

export default SteView;
