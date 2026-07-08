// Helper to fetch document layout settings from DB (for use in client-side PDF generation)
import { api } from "./api-client";

let cache: Record<string, any> = {};
let appSettingsCache: any = null;

export async function fetchLayoutSettings(docType: string): Promise<{ layout: any; appSettings: any }> {
  try {
    const d = await api<{ layout: any; appSettings: any }>(`/api/doc-layout?docType=${docType}`);
    cache[docType] = d.layout || {};
    appSettingsCache = d.appSettings || {};
    return { layout: d.layout || {}, appSettings: d.appSettings || {} };
  } catch {
    return { layout: cache[docType] || {}, appSettings: appSettingsCache || {} };
  }
}

// Convert hex color to RGB array for jsPDF
export function hexToRgb(hex: string): [number, number, number] {
  const num = parseInt(hex.replace("#", ""), 16);
  if (isNaN(num)) return [0, 51, 102];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// Shade color for gradient
export function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, (num >> 16) + Math.round(2.55 * percent));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(2.55 * percent));
  const b = Math.min(255, (num & 0xff) + Math.round(2.55 * percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// Logo image data interface
export interface LogoImageData {
  dataUrl: string;
  width: number;
  height: number;
}

// Load an image from URL and convert to data URL with dimensions (for jsPDF addImage)
// Returns null if URL is empty or image fails to load
export async function loadImageAsDataURL(url: string): Promise<LogoImageData | null> {
  if (!url) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (!w || !h) { resolve(null); return; }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0);
      try {
        // Detect format from URL
        const isJpeg = /\.(jpe?g)$/i.test(url) || url.startsWith("data:image/jpeg");
        const dataUrl = canvas.toDataURL(isJpeg ? "image/jpeg" : "image/png", 0.92);
        resolve({ dataUrl, width: w, height: h });
      } catch {
        // Canvas might be tainted due to CORS - try without conversion
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
