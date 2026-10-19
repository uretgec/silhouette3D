export interface SilhouetteData {
  width: number;
  height: number;
  pixels: Uint8Array;
  filledPixels: number;
}

export function extractSilhouetteAsImageData(
  image: HTMLImageElement,
  threshold: number = 128,
  maxSize: number = 600
): { canvas: HTMLCanvasElement; result: SilhouetteData } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  let width = image.naturalWidth;
  let height = image.naturalHeight;
  const scale = Math.min(maxSize / width, maxSize / height, 1);
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  canvas.width = width;
  canvas.height = height;

  // Flip horizontally for correct orientation
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(image, -width, 0, width, height);
  ctx.restore();

  const imageData = ctx.getImageData(0, 0, width, height);
  const imgData = imageData.data;
  const pixels = new Uint8Array(width * height);
  let filledPixels = 0;

  for (let i = 0; i < width * height; i++) {
    const r = imgData[i * 4];
    const g = imgData[i * 4 + 1];
    const b = imgData[i * 4 + 2];
    const a = imgData[i * 4 + 3];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    const isFilled = (gray < threshold && a > 128) ? 1 : 0;
    pixels[i] = isFilled;
    if (isFilled) filledPixels++;

    const val = isFilled ? 0 : 255;
    imgData[i * 4] = val;
    imgData[i * 4 + 1] = val;
    imgData[i * 4 + 2] = val;
    imgData[i * 4 + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);

  const silhouetteResult: SilhouetteData = { width, height, pixels, filledPixels };
  return { canvas, result: silhouetteResult };
}
