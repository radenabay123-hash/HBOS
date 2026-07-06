// Document Element Types — Elementor-style layout system
// Each element has absolute position (x, y in mm) on A4 canvas
// PDF generator reads these positions → preview = download, guaranteed

export type ElementType = "rect" | "logo" | "text" | "body" | "signature";

export interface LayoutElement {
  id: string;
  type: ElementType;
  label: string; // display name in editor sidebar
  x: number; // mm from left edge of A4
  y: number; // mm from top edge of A4
  w: number; // mm width
  h: number; // mm height
  // Text properties
  content?: string;
  fontSize?: number; // pt
  color?: string; // hex
  bold?: boolean;
  align?: "left" | "center" | "right";
  // Rect properties
  bgColor?: string; // hex
  // Logo properties
  logoSize?: number; // mm
  logoColor?: string;
  logoText?: string;
  // Signature properties
  lineStyle?: "solid" | "dashed" | "none";
  lineColor?: string;
  // Z-index for layering
  z?: number;
}

export interface DocumentLayoutData {
  paperSize: string; // A4
  elements: LayoutElement[];
}

// A4 dimensions in mm
export const A4_WIDTH = 210;
export const A4_HEIGHT = 297;

// Default element layouts per document type
// These match the current professional design (header inside, 28mm height)
export function getDefaultLayout(docType: string): DocumentLayoutData {
  const commonElements: LayoutElement[] = [
    // Header background (full width navy rect)
    {
      id: "header-bg",
      type: "rect",
      label: "Background Header",
      x: 0, y: 0, w: 210, h: 28,
      bgColor: docType === "SURAT" ? "#0f234b" : "#1e3a8a",
      z: 0,
    },
    // Logo (top-left inside header)
    {
      id: "logo",
      type: "logo",
      label: "Logo",
      x: 15, y: 7, w: 14, h: 14,
      logoSize: 14,
      logoColor: docType === "SURAT" ? "#ff8000" : "#f97316",
      logoText: docType === "SURAT" ? "H" : "HF",
      z: 1,
    },
    // Company Name (right-aligned in header)
    {
      id: "company-name",
      type: "text",
      label: "Nama Perusahaan",
      x: 20, y: 8.4, w: 175, h: 5,
      content: "PT. HAFARA AQIBA NUSANTARA",
      fontSize: 12,
      color: "#ffffff",
      bold: true,
      align: "right",
      z: 1,
    },
    // Company Address
    {
      id: "company-address",
      type: "text",
      label: "Alamat",
      x: 20, y: 15.4, w: 175, h: 4,
      content: "New Head Office: Jl. Tanjung Sariloyo Sambongdukuh, Kab. Jombang, Jawa Timur",
      fontSize: 7.5,
      color: "#dce6f5",
      bold: false,
      align: "right",
      z: 1,
    },
    // Company Contact
    {
      id: "company-contact",
      type: "text",
      label: "Kontak",
      x: 20, y: 22.4, w: 175, h: 4,
      content: "Info@hafaragroup.com | www.HafaraGroup.com | Phone: 081324511570",
      fontSize: 7,
      color: "#b4c8e6",
      bold: false,
      align: "right",
      z: 1,
    },
    // Accent line below header
    {
      id: "accent-line",
      type: "rect",
      label: "Garis Aksen",
      x: 0, y: 28, w: 210, h: 1.5,
      bgColor: docType === "SURAT" ? "#ff8000" : "#1e3a8a",
      z: 0,
    },
    // Document Title
    {
      id: "doc-title",
      type: "text",
      label: "Judul Dokumen",
      x: 15, y: 40, w: 180, h: 8,
      content: docType === "SURAT" ? "Surat Penawaran" : docType === "INVOICE" ? "INVOICE" : "SLIP GAJI",
      fontSize: docType === "INVOICE" ? 18 : docType === "SLIP_GAJI" ? 14 : 10,
      color: docType === "SURAT" ? "#0f234b" : "#1e3a8a",
      bold: true,
      align: docType === "INVOICE" ? "left" : docType === "SLIP_GAJI" ? "center" : "left",
      z: 2,
    },
    // Body content placeholder
    {
      id: "body",
      type: "body",
      label: "Area Isi Dokumen",
      x: 15, y: 52, w: 180, h: 180,
      z: 2,
    },
    // Signature
    {
      id: "signature",
      type: "signature",
      label: "Tanda Tangan",
      x: 145, y: 235, w: 50, h: 35,
      fontSize: 10,
      color: "#0f234b",
      lineStyle: "dashed",
      lineColor: "#d1d5db",
      z: 2,
    },
    // Footer background
    {
      id: "footer-bg",
      type: "rect",
      label: "Background Footer",
      x: 0, y: 283, w: 210, h: 14,
      bgColor: docType === "SURAT" ? "#0f234b" : "#1e3a8a",
      z: 0,
    },
    // Footer accent line
    {
      id: "footer-accent",
      type: "rect",
      label: "Garis Aksen Footer",
      x: 0, y: 283, w: 210, h: 1,
      bgColor: docType === "SURAT" ? "#ff8000" : "#1e3a8a",
      z: 1,
    },
    // Footer text
    {
      id: "footer-text",
      type: "text",
      label: "Teks Footer",
      x: 0, y: 287, w: 210, h: 5,
      content: "Terima Kasih!",
      fontSize: 10,
      color: "#ffffff",
      bold: true,
      align: "center",
      z: 1,
    },
    // Footer sub-text
    {
      id: "footer-subtext",
      type: "text",
      label: "Sub-teks Footer",
      x: 0, y: 292, w: 210, h: 4,
      content: "Atas dedikasi & kontribusi Anda kepada Hafara Group.",
      fontSize: 7,
      color: "#ffffff",
      bold: false,
      align: "center",
      z: 1,
    },
  ];

  return {
    paperSize: "A4",
    elements: commonElements,
  };
}

// Convert mm to pixels for display (at 72 DPI: 1mm = 2.835px)
export const MM_TO_PX = 2.835;
export const PX_TO_MM = 1 / MM_TO_PX;
