// Get company settings from database (fallback to defaults)
import { db } from "./db";

let cache: Record<string, string> | null = null;
let cacheTime = 0;
const CACHE_TTL = 30000; // 30 seconds

export async function getCompanySettings() {
  // Check cache
  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    return cache;
  }

  try {
    const settings = await db.appSetting.findMany({});
    cache = {};
    for (const s of settings) {
      cache[s.key] = s.value;
    }
    cacheTime = Date.now();

    // Fill defaults if missing
    const defaults: Record<string, string> = {
      company_name: "PT. HAFARA AQIBA NUSANTARA",
      company_address: "Jl. Tanjung Sariloyo Sambongdukuh, Kab. Jombang, Jawa Timur",
      company_phone: "081324511570",
      company_email: "info@hafaragroup.com",
      company_website: "www.HafaraGroup.com",
      company_npwp: "01.234.567.8-091.000",
      company_logo: "",
      company_signature: "",
      director_name: "M. Aqil Baihaqi",
      director_title: "Direktur Utama",
      bank_name: "Bank Mandiri",
      bank_account: "1234567890",
      bank_account_name: "PT Hafara Aqiba Nusantara",
    };

    for (const [k, v] of Object.entries(defaults)) {
      if (cache[k] == null || cache[k] === "") {
        cache[k] = v;
      }
    }

    return cache;
  } catch {
    // Fallback to defaults
    return {
      company_name: "PT. HAFARA AQIBA NUSANTARA",
      company_address: "Jl. Tanjung Sariloyo Sambongdukuh, Kab. Jombang, Jawa Timur",
      company_phone: "081324511570",
      company_email: "info@hafaragroup.com",
      company_website: "www.HafaraGroup.com",
      company_npwp: "01.234.567.8-091.000",
      company_logo: "",
      company_signature: "",
      director_name: "M. Aqil Baihaqi",
      director_title: "Direktur Utama",
      bank_name: "Bank Mandiri",
      bank_account: "1234567890",
      bank_account_name: "PT Hafara Aqiba Nusantara",
    };
  }
}

// Clear cache (call after settings update)
export function clearSettingsCache() {
  cache = null;
  cacheTime = 0;
}
