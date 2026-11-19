// Reduce una foto antes de enviarla a la IA. Una foto de móvil pesa varios MB;
// a 1280 px de lado y JPEG al 85 % se queda en unos cientos de KB, que es más
// que suficiente para reconocer la comida y abarata cada análisis.
const MAX_SIDE = 1280;
const QUALITY = 0.85;

export async function downscaleImage(file: File): Promise<string> {
  // imageOrientation "from-image" respeta la rotación EXIF de las fotos del móvil.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", QUALITY);
}
