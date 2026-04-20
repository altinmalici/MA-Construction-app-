import { useEffect, useState } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { RED } from "../../utils/helpers";
import { getPhotoUrls } from "../../lib/storage";
import Lightbox from "./Lightbox";

/**
 * Hybrides PhotoGrid — unterstützt gemischte Listen aus:
 *   - Base64-DataURLs ("data:image/...") für Legacy-Einträge
 *   - Storage-Pfaden ("{baustelleId}/...") für neue Einträge
 *   - Foto-Objekte {blob, previewDataUrl} für lokal gepickte Fotos
 *     (noch nicht hochgeladen, werden beim Save durch uploadPhoto ersetzt)
 *
 * Props:
 *   fotos      — Array von String | {blob, previewDataUrl}
 *   onAdd      — () => void; Parent ruft trigPhoto(...)
 *   onRemove   — (index) => void
 *   maxFotos   — number, default 5
 */
const PhotoGrid = ({ fotos, onAdd, onRemove, maxFotos = 5 }) => {
  const [urlMap, setUrlMap] = useState({});
  const [lightboxUrl, setLightboxUrl] = useState(null);

  // Storage-Pfade batch-signieren
  useEffect(() => {
    const paths = (fotos || [])
      .filter((f) => typeof f === "string" && !f.startsWith("data:"));
    if (paths.length === 0) return;
    let cancelled = false;
    getPhotoUrls(paths, 3600)
      .then((map) => {
        if (!cancelled) setUrlMap(map);
      })
      .catch((err) => {
        console.error("[PhotoGrid.getPhotoUrls]", err);
        if (!cancelled) setUrlMap({});
      });
    return () => {
      cancelled = true;
    };
  }, [fotos]);

  // Liefert die anzuzeigende URL für einen Foto-Eintrag (String oder Objekt)
  const resolveSrc = (f) => {
    if (!f) return null;
    if (typeof f === "object" && f.previewDataUrl) return f.previewDataUrl;
    if (typeof f === "string") {
      if (f.startsWith("data:")) return f; // Legacy Base64
      return urlMap[f] || null; // Storage → signedUrl
    }
    return null;
  };

  const isPathPending = (f) =>
    typeof f === "string" && !f.startsWith("data:") && !urlMap[f];

  const count = fotos?.length || 0;
  const canAdd = onAdd && count < maxFotos;

  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(fotos || []).map((f, i) => {
          const src = resolveSrc(f);
          const loading = isPathPending(f);
          const keyPart =
            typeof f === "string" ? f.slice(0, 32) : `blob-${i}`;
          return (
            <div
              key={`${i}-${keyPart}`}
              style={{
                position: "relative",
                width: 64,
                height: 64,
                borderRadius: 10,
                overflow: "hidden",
                border: "0.5px solid rgba(0,0,0,0.1)",
                background: "#f2f2f7",
              }}
            >
              {loading ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    height: "100%",
                    color: "#8e8e93",
                  }}
                >
                  <Loader2
                    size={14}
                    style={{ animation: "ma-spin 0.8s linear infinite" }}
                  />
                </div>
              ) : (
                src && (
                  <img
                    src={src}
                    alt={`Foto ${i + 1}`}
                    loading="lazy"
                    onClick={() => setLightboxUrl(src)}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      cursor: "zoom-in",
                    }}
                  />
                )
              )}
              {onRemove && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(i);
                  }}
                  aria-label="Foto entfernen"
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    background: RED,
                    color: "white",
                    borderRadius: "0 0 0 8px",
                    padding: 2,
                    border: "none",
                    cursor: "pointer",
                    minWidth: 22,
                    minHeight: 22,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          );
        })}
        {canAdd && (
          <button
            onClick={onAdd}
            aria-label="Foto hinzufügen"
            style={{
              width: 64,
              height: 64,
              borderRadius: 10,
              border: "2px dashed rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              color: "#8e8e93",
              background: "none",
              cursor: "pointer",
            }}
          >
            <Camera size={16} />
            <span style={{ fontSize: 12 }}>Foto</span>
          </button>
        )}
        {!canAdd && onAdd && count >= maxFotos && (
          <div
            style={{
              fontSize: 11,
              color: "#8e8e93",
              alignSelf: "center",
              padding: "0 8px",
            }}
          >
            Max {maxFotos} Fotos
          </div>
        )}
      </div>
      <Lightbox
        open={!!lightboxUrl}
        url={lightboxUrl}
        onClose={() => setLightboxUrl(null)}
      />
    </>
  );
};

export default PhotoGrid;
