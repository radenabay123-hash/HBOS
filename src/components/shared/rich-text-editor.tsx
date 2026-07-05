"use client";

import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Type,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const FONT_SIZES = [
  { label: "8pt", value: "1" },
  { label: "10pt", value: "2" },
  { label: "12pt (Normal)", value: "3" },
  { label: "14pt", value: "4" },
  { label: "16pt", value: "5" },
  { label: "18pt", value: "6" },
  { label: "24pt", value: "7" },
];

const FONT_FAMILIES = [
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Calibri", value: "Calibri, sans-serif" },
];

export function RichTextEditor({ value, onChange, placeholder, minHeight = 200 }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  function exec(command: string, val?: string) {
    document.execCommand(command, false, val);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    editorRef.current?.focus();
  }

  function handleInput() {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }

  const toolBtn = "h-7 w-7 p-0 flex items-center justify-center rounded hover:bg-slate-100 transition-colors text-slate-600";

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 bg-slate-50 flex-wrap">
        {/* Font Family */}
        <select
          onChange={(e) => exec("fontName", e.target.value)}
          className="h-7 text-xs border border-slate-200 rounded bg-white px-1 mr-1"
          defaultValue="Arial, sans-serif"
          title="Jenis Font"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        {/* Font Size */}
        <select
          onChange={(e) => exec("fontSize", e.target.value)}
          className="h-7 text-xs border border-slate-200 rounded bg-white px-1 mr-1"
          defaultValue="3"
          title="Ukuran Font"
        >
          {FONT_SIZES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Bold */}
        <button type="button" className={toolBtn} onClick={() => exec("bold")} title="Bold (Ctrl+B)">
          <Bold className="w-3.5 h-3.5" />
        </button>
        {/* Italic */}
        <button type="button" className={toolBtn} onClick={() => exec("italic")} title="Italic (Ctrl+I)">
          <Italic className="w-3.5 h-3.5" />
        </button>
        {/* Underline */}
        <button type="button" className={toolBtn} onClick={() => exec("underline")} title="Underline (Ctrl+U)">
          <Underline className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Align Left */}
        <button type="button" className={toolBtn} onClick={() => exec("justifyLeft")} title="Rata Kiri">
          <AlignLeft className="w-3.5 h-3.5" />
        </button>
        {/* Align Center */}
        <button type="button" className={toolBtn} onClick={() => exec("justifyCenter")} title="Rata Tengah">
          <AlignCenter className="w-3.5 h-3.5" />
        </button>
        {/* Align Right */}
        <button type="button" className={toolBtn} onClick={() => exec("justifyRight")} title="Rata Kanan">
          <AlignRight className="w-3.5 h-3.5" />
        </button>
        {/* Align Justify */}
        <button type="button" className={toolBtn} onClick={() => exec("justifyFull")} title="Rata Kanan-Kiri">
          <AlignJustify className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Bullet List */}
        <button type="button" className={toolBtn} onClick={() => exec("insertUnorderedList")} title="Daftar Bullet">
          <List className="w-3.5 h-3.5" />
        </button>
        {/* Numbered List */}
        <button type="button" className={toolBtn} onClick={() => exec("insertOrderedList")} title="Daftar Nomor">
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        className="px-3 py-2 outline-none text-sm text-slate-700 overflow-y-auto"
        style={{ minHeight: `${minHeight}px`, fontFamily: "Arial, sans-serif", fontSize: "12pt", lineHeight: "1.6" }}
        data-placeholder={placeholder || ""}
        suppressContentEditableWarning
      />
    </div>
  );
}
