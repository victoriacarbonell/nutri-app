// Downscales a photo before sending it to the AI. A phone photo weighs several MB;
// at 1280 px on the long side and 85 % JPEG it drops to a few hundred KB, which is
// plenty to recognize the food and makes each analysis cheaper.
const MAX_SIDE = 1280;
const QUALITY = 0.85;

export async function downscaleImage(file: File): Promise<string> {
  // imageOrientation "from-image" respects the EXIF rotation of phone photos.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas is not available");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", QUALITY);
}
