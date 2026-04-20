/**
 * Canvas-basierte Foto-Compression. iPhone-Original (4000×3000, ~5 MB)
 * wird typisch zu ~300-500 KB JPEG bei longest=1600 + quality=0.7.
 *
 * EXIF-Rotation: moderne Browser (Safari 13.4+, Chromium) respektieren
 * `image-orientation: from-image` als Default — das Image-Element rendert
 * iPhone-Fotos schon korrekt rotiert, Canvas drawImage übernimmt das.
 * Falls Altin/Agim später gedrehte Fotos meldet → Follow-up mit
 * createImageBitmap({ imageOrientation: 'from-image' }).
 */

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.7;

export async function compressImage(file, opts = {}) {
  const maxDim = opts.maxDimension ?? MAX_DIMENSION;
  const quality = opts.quality ?? JPEG_QUALITY;

  if (!file) throw new Error("Foto fehlt");
  if (!(file instanceof Blob)) throw new Error("Ungültiges Foto-Objekt");

  const img = await loadImage(file);

  const { width: srcW, height: srcH } = img;
  const longest = Math.max(srcW, srcH);
  let dstW;
  let dstH;
  if (longest <= maxDim) {
    // Kein Upscale — Original behalten (Screenshots, vorkomprimierte Bilder).
    dstW = srcW;
    dstH = srcH;
  } else {
    const scale = maxDim / longest;
    dstW = Math.round(srcW * scale);
    dstH = Math.round(srcH * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = dstW;
  canvas.height = dstH;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, dstW, dstH);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("Canvas-toBlob fehlgeschlagen"));
      },
      "image/jpeg",
      quality,
    );
  });

  if (img.src && img.src.startsWith("blob:")) {
    URL.revokeObjectURL(img.src);
  }

  return blob;
}

/**
 * Blob → DataURL (Base64). Brücke für die bestehende Foto-Pipeline,
 * bis 4-05 PhotoGrid auf Blob/Storage umstellt.
 */
export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    if (!blob) {
      reject(new Error("Blob fehlt"));
      return;
    }
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error || new Error("FileReader-Fehler"));
    r.readAsDataURL(blob);
  });
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Bild konnte nicht geladen werden"));
    };
    img.src = url;
  });
}
