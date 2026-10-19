/**
 * 후기 사진을 브라우저에서 줄인다 — 긴 변 1600px · JPEG 82%.
 *
 * 몰 서버(Vercel 함수)는 요청 본문이 4.5MB 를 넘으면 받지 못한다. 휴대폰 사진 한 장이 그 크기라
 * 원본을 그대로 보내면 네 장은커녕 한 장도 안 올라간다. 줄일 수 없는 형식(브라우저가 못 여는 HEIC 등)은
 * 원본을 돌려주고, 크기 판정은 부르는 쪽이 한다.
 */
const MAX_EDGE = 1600;
const QUALITY = 0.82;

export async function compressImage(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function" || !file.type.startsWith("image/")) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }
  // 투명 PNG 가 검게 나오지 않게 흰 바탕을 깐다.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", QUALITY));
  if (!blob || blob.size >= file.size) return file;

  const base = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}
