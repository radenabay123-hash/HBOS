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
