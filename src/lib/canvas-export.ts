import html2canvas from 'html2canvas';

export type ImageFormat = 'png' | 'jpeg';

export interface ExportOptions {
  format: ImageFormat;
  quality?: number; // 0-1, only for JPEG
  scale?: number; // DPI multiplier (2 = 2x resolution)
  backgroundColor?: string;
}

const defaultOptions: ExportOptions = {
  format: 'png',
  quality: 0.95,
  scale: 2, // 2x for better quality on retina displays
  backgroundColor: '#ffffff',
};

/**
 * Convert an HTML element to a canvas
 */
export async function elementToCanvas(
  element: HTMLElement,
  options: Partial<ExportOptions> = {}
): Promise<HTMLCanvasElement> {
  const opts = { ...defaultOptions, ...options };
  
  const canvas = await html2canvas(element, {
    scale: opts.scale,
    backgroundColor: opts.backgroundColor,
    useCORS: true,
    logging: false,
    // Ensure we capture the full element
    width: element.scrollWidth,
    height: element.scrollHeight,
  });

  return canvas;
}

/**
 * Convert an HTML element to a data URL
 */
export async function elementToDataUrl(
  element: HTMLElement,
  options: Partial<ExportOptions> = {}
): Promise<string> {
  const opts = { ...defaultOptions, ...options };
  const canvas = await elementToCanvas(element, opts);
  
  const mimeType = opts.format === 'jpeg' ? 'image/jpeg' : 'image/png';
  return canvas.toDataURL(mimeType, opts.quality);
}

/**
 * Convert an HTML element to a Blob
 */
export async function elementToBlob(
  element: HTMLElement,
  options: Partial<ExportOptions> = {}
): Promise<Blob> {
  const opts = { ...defaultOptions, ...options };
  const canvas = await elementToCanvas(element, opts);
  
  return new Promise((resolve, reject) => {
    const mimeType = opts.format === 'jpeg' ? 'image/jpeg' : 'image/png';
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      },
      mimeType,
      opts.quality
    );
  });
}

/**
 * Download an HTML element as an image file
 */
export async function downloadElementAsImage(
  element: HTMLElement,
  filename: string,
  options: Partial<ExportOptions> = {}
): Promise<void> {
  const opts = { ...defaultOptions, ...options };
  const dataUrl = await elementToDataUrl(element, opts);
  
  const extension = opts.format === 'jpeg' ? 'jpg' : 'png';
  const fullFilename = filename.includes('.') ? filename : `${filename}.${extension}`;
  
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fullFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
