"use client";

import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Type, Palette, Minus, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const FONT_SIZES = [
  { label: "8", value: "1" },
  { label: "10", value: "2" },
  { label: "12", value: "3" },
  { label: "14", value: "4" },
  { label: "16", value: "5" },
  { label: "18", value: "6" },
  { label: "24", value: "7" },
];

const FONT_FAMILIES = [
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Calibri", value: "Calibri, sans-serif" },
  { label: "Tahoma", value: "Tahoma, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
];

const TEXT_COLORS = [
  "#000000", "#333333", "#666666", "#999999",
  "#003366", "#2563eb", "#dc2626", "#16a34a",
  "#ca8a04", "#7c3aed", "#db2777", "#0891b2",
];

export function RichTextEditor({ value, onChange, placeholder, minHeight = 200 }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  useEffect(() => {
    const updateActiveFormats = () => {
      setActiveFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        justifyLeft: document.queryCommandState("justifyLeft"),
        justifyCenter: document.queryCommandState("justifyCenter"),
        justifyRight: document.queryCommandState("justifyRight"),
        justifyFull: document.queryCommandState("justifyFull"),
        insertUnorderedList: document.queryCommandState("insertUnorderedList"),
        insertOrderedList: document.queryCommandState("insertOrderedList"),
      });
    };

    const editor = editorRef.current;
    editor?.addEventListener("keyup", updateActiveFormats);
    editor?.addEventListener("mouseup", updateActiveFormats);
    return () => {
      editor?.removeEventListener("keyup", updateActiveFormats);
      editor?.removeEventListener("mouseup", updateActiveFormats);
    };
  }, []);

  function exec(command: string, val?: string) {
    document.execCommand(command, false, val);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    editorRef.current?.focus();
    // Update active formats
    setTimeout(() => {
      setActiveFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        justifyLeft: document.queryCommandState("justifyLeft"),
        justifyCenter: document.queryCommandState("justifyCenter"),
        justifyRight: document.queryCommandState("justifyRight"),
        justifyFull: document.queryCommandState("justifyFull"),
        insertUnorderedList: document.queryCommandState("insertUnorderedList"),
        insertOrderedList: document.queryCommandState("insertOrderedList"),
      });
    }, 10);
  }

  function handleInput() {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }

  const toolBtn = (active?: boolean) =>
    cn("h-8 w-8 p-0 flex items-center justify-center rounded transition-all",
      active ? "bg-blue-100 text-blue-700" : "text-slate-600 hover:bg-slate-100");

  const divider = <div className="w-px h-5 bg-slate-200 mx-0.5" />;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
      {/* ===== TOOLBAR (Word-like) ===== */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 bg-slate-50 flex-wrap">
        {/* Font Family */}
        <select
          onChange={(e) => exec("fontName", e.target.value)}
          className="h-8 text-xs border border-slate-200 rounded bg-white px-1.5 mr-1 cursor-pointer hover:border-blue-300"
          defaultValue="Arial, sans-serif"
          title="Jenis Font"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
          ))}
        </select>

        {/* Font Size */}
        <select
          onChange={(e) => exec("fontSize", e.target.value)}
          className="h-8 text-xs border border-slate-200 rounded bg-white px-1.5 mr-1 cursor-pointer hover:border-blue-300"
          defaultValue="3"
          title="Ukuran Font"
        >
          {FONT_SIZES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}pt</option>
          ))}
        </select>

        {divider}

        {/* Bold */}
        <button type="button" className={toolBtn(activeFormats.bold)} onClick={() => exec("bold")} title="Bold (Ctrl+B)">
          <Bold className="w-4 h-4" />
        </button>
        {/* Italic */}
        <button type="button" className={toolBtn(activeFormats.italic)} onClick={() => exec("italic")} title="Italic (Ctrl+I)">
          <Italic className="w-4 h-4" />
        </button>
        {/* Underline */}
        <button type="button" className={toolBtn(activeFormats.underline)} onClick={() => exec("underline")} title="Underline (Ctrl+U)">
          <Underline className="w-4 h-4" />
        </button>

        {/* Text Color */}
        <div className="relative">
          <button
            type="button"
            className={toolBtn()}
            onClick={() => setShowColorPicker(!showColorPicker)}
            title="Warna Teks"
          >
            <Palette className="w-4 h-4" />
          </button>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-2 grid grid-cols-4 gap-1">
              {TEXT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="w-6 h-6 rounded border border-slate-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    exec("foreColor", color);
                    setShowColorPicker(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {divider}

        {/* Align Left */}
        <button type="button" className={toolBtn(activeFormats.justifyLeft)} onClick={() => exec("justifyLeft")} title="Rata Kiri">
          <AlignLeft className="w-4 h-4" />
        </button>
        {/* Align Center */}
        <button type="button" className={toolBtn(activeFormats.justifyCenter)} onClick={() => exec("justifyCenter")} title="Rata Tengah">
          <AlignCenter className="w-4 h-4" />
        </button>
        {/* Align Right */}
        <button type="button" className={toolBtn(activeFormats.justifyRight)} onClick={() => exec("justifyRight")} title="Rata Kanan">
          <AlignRight className="w-4 h-4" />
        </button>
        {/* Align Justify */}
        <button type="button" className={toolBtn(activeFormats.justifyFull)} onClick={() => exec("justifyFull")} title="Rata Kanan-Kiri">
          <AlignJustify className="w-4 h-4" />
        </button>

        {divider}

        {/* Bullet List */}
        <button type="button" className={toolBtn(activeFormats.insertUnorderedList)} onClick={() => exec("insertUnorderedList")} title="Daftar Bullet">
          <List className="w-4 h-4" />
        </button>
        {/* Numbered List */}
        <button type="button" className={toolBtn(activeFormats.insertOrderedList)} onClick={() => exec("insertOrderedList")} title="Daftar Nomor">
          <ListOrdered className="w-4 h-4" />
        </button>

        {divider}

        {/* Increase indent */}
        <button type="button" className={toolBtn()} onClick={() => exec("indent")} title="Tambah Indentasi">
          <Plus className="w-4 h-4" />
        </button>
        {/* Decrease indent */}
        <button type="button" className={toolBtn()} onClick={() => exec("outdent")} title="Kurangi Indentasi">
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* ===== EDITABLE AREA ===== */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        className="px-4 py-3 outline-none text-sm text-slate-700 overflow-y-auto focus:bg-blue-50/20 transition-colors"
        style={{
          minHeight: `${minHeight}px`,
          fontFamily: "Arial, sans-serif",
          fontSize: "12pt",
          lineHeight: "1.8",
        }}
        data-placeholder={placeholder || ""}
        suppressContentEditableWarning
      />

      {/* Placeholder style */}
      <style>{`
        [contenteditable][data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: #cbd5e1;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
