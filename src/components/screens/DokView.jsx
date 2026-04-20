import { useState } from "react";
import { FileText, FileUp, Trash2, Download, Loader2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { fK, P, CS } from "../../utils/helpers";
import { Empty, ScreenLayout, ConfirmModal, IconButton } from "../ui";
import { useSaving } from "../../hooks/useSaving";
import * as dokumenteApi from "../../lib/api/dokumente";

const DokView = () => {
  const { sb, chef, data, actions, show, goBack } = useApp();
  const { saving, withSaving } = useSaving();
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const ds = sb
    ? data.dokumente.filter((d) => d.baustelleId === sb.id)
    : data.dokumente;

  const onFilePicked = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset, damit derselbe File nochmal pickable ist
    if (!file) return;
    const baustelleId = sb?.id || data.baustellen[0]?.id;
    if (!baustelleId) {
      show("Keine Baustelle verfügbar", "error");
      return;
    }
    withSaving(async () => {
      try {
        await actions.dokumente.createWithFile({ file, baustelleId });
        show("Hochgeladen");
      } catch (err) {
        console.error("[DokView.upload]", err);
        show(err?.message || "Upload fehlgeschlagen", "error");
      }
    });
  };

  const download = async (d) => {
    if (!d.storagePath) {
      show("Legacy-Eintrag ohne Datei", "error");
      return;
    }
    setDownloadingId(d.id);
    try {
      const url = await dokumenteApi.getDocumentUrl(d.storagePath, 60);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("[DokView.download]", err);
      show(err?.message || "Download fehlgeschlagen", "error");
    } finally {
      setDownloadingId(null);
    }
  };

  const doDelete = async () => {
    const target = confirmDelete;
    setConfirmDelete(null);
    if (!target) return;
    try {
      await actions.dokumente.removeWithFile(target.id, target.storagePath);
      show("Gelöscht");
    } catch (err) {
      console.error("[DokView.delete]", err);
      show(err?.message || "Fehler beim Löschen", "error");
    }
  };

  const spinStyle = { animation: "ma-spin 0.8s linear infinite" };

  return (
    <ScreenLayout
      title="Dokumente"
      onBack={goBack}
      right={
        chef && (
          <>
            <input
              type="file"
              id="dok-upload"
              style={{ display: "none" }}
              onChange={onFilePicked}
              accept=".pdf,.doc,.docx,.xls,.xlsx,image/jpeg,image/png"
              disabled={saving}
            />
            <IconButton
              icon={saving ? Loader2 : FileUp}
              variant="primary"
              onClick={() => document.getElementById("dok-upload")?.click()}
              ariaLabel="Dokument hochladen"
              disabled={saving}
              iconSize={18}
              style={saving ? spinStyle : undefined}
            />
          </>
        )
      }
    >
      {saving && (
        <div style={{ fontSize: 13, color: "#8e8e93", marginBottom: 8 }}>
          Datei wird hochgeladen…
        </div>
      )}
      <div className="space-y-2">
        {ds.length === 0 ? (
          <Empty
            icon={FileUp}
            text={
              chef
                ? "Tippe auf Hochladen um ein Dokument hinzuzufügen"
                : "Noch keine Dokumente"
            }
          />
        ) : (
          ds.map((d) => {
            const isLegacy = !d.storagePath;
            const isDownloading = downloadingId === d.id;
            return (
              <div
                key={d.id}
                className="flex items-center gap-3"
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: "white",
                  boxShadow: CS,
                  opacity: isLegacy ? 0.6 : 1,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: `${P}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: P,
                    flexShrink: 0,
                  }}
                >
                  <FileText size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: "#000",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {d.name}
                  </p>
                  <p style={{ fontSize: 13, color: "#8e8e93" }}>
                    {d.groesse} · {fK(d.datum)}
                    {isLegacy && (
                      <span style={{ color: "#FF9500", marginLeft: 6 }}>
                        Legacy
                      </span>
                    )}
                  </p>
                </div>
                {!isLegacy && (
                  <IconButton
                    icon={isDownloading ? Loader2 : Download}
                    variant="subtle"
                    onClick={() => download(d)}
                    ariaLabel="Herunterladen"
                    disabled={isDownloading}
                    iconSize={16}
                    style={isDownloading ? spinStyle : undefined}
                  />
                )}
                {chef && (
                  <IconButton
                    icon={Trash2}
                    variant="subtle"
                    onClick={() =>
                      setConfirmDelete({ id: d.id, storagePath: d.storagePath })
                    }
                    ariaLabel="Löschen"
                    iconSize={16}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
      <ConfirmModal
        open={!!confirmDelete}
        title="Dokument löschen?"
        message="Datei wird dauerhaft aus dem Speicher und der Liste entfernt."
        confirmLabel="Löschen"
        cancelLabel="Abbrechen"
        destructive
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </ScreenLayout>
  );
};

export default DokView;
