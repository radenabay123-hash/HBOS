"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Draggable from "react-draggable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Move, Save, RefreshCw, Eye, Square, Type, Image as ImageIcon,
  FileText, Check, Lock, Unlock, Trash2, Plus,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  type LayoutElement, type DocumentLayoutData, type ElementType,
  A4_WIDTH, A4_HEIGHT, MM_TO_PX, PX_TO_MM,
  getDefaultLayout,
} from "@/lib/document-elements";

// Canvas display scale (fit A4 on screen)
const SCALE = 0.72;
const CANVAS_W = A4_WIDTH * MM_TO_PX * SCALE;  // ~446px
const CANVAS_H = A4_HEIGHT * MM_TO_PX * SCALE; // ~632px

const ELEMENT_ICONS: Record<ElementType, any> = {
  rect: Square,
  logo: ImageIcon,
  text: Type,
  body: FileText,
  signature: Move,
};

const ELEMENT_COLORS: Record<ElementType, string> = {
  rect: "bg-slate-100 text-slate-600 border-slate-300",
  logo: "bg-orange-100 text-orange-600 border-orange-300",
  text: "bg-blue-100 text-blue-600 border-blue-300",
  body: "bg-green-100 text-green-600 border-green-300",
  signature: "bg-purple-100 text-purple-600 border-purple-300",
};

interface DocumentCanvasEditorProps {
  docType: string;
  docLabel: string;
  layoutData: DocumentLayoutData;
  onSave: (data: DocumentLayoutData) => Promise<void>;
  logoUrl?: string;
}

export function DocumentCanvasEditor({ docType, docLabel, layoutData: initialData, onSave, logoUrl }: DocumentCanvasEditorProps) {
  const [layout, setLayout] = useState<DocumentLayoutData>(initialData);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState<Set<string>>(new Set());
  const canvasRef = useRef<HTMLDivElement>(null);

  const selected = layout.elements.find((e) => e.id === selectedId);

  const updateElement = useCallback((id: string, updates: Partial<LayoutElement>) => {
    setLayout((prev) => ({
      ...prev,
      elements: prev.elements.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }));
  }, []);

  const handleDrag = useCallback((id: string, dx: number, dy: number) => {
    if (locked.has(id)) return;
    const elem = layout.elements.find((e) => e.id === id);
    if (!elem) return;
    // Convert pixel delta to mm
    const dxMm = dx * PX_TO_MM / SCALE;
    const dyMm = dy * PX_TO_MM / SCALE;
    let newX = elem.x + dxMm;
    let newY = elem.y + dyMm;
    // Clamp to canvas bounds
    newX = Math.max(0, Math.min(newX, A4_WIDTH - elem.w));
    newY = Math.max(0, Math.min(newY, A4_HEIGHT - elem.h));
    updateElement(id, { x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 });
  }, [layout.elements, locked, updateElement]);

  function handleReset() {
    const defaults = getDefaultLayout(docType);
    setLayout(defaults);
    setSelectedId(null);
    toast.info("Layout direset ke default (klik Simpan untuk menyimpan)");
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(layout);
      toast.success("Layout disimpan! Preview & download akan sesuai posisi element.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  function toggleLock(id: string) {
    setLocked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function deleteElement(id: string) {
    setLayout((prev) => ({
      ...prev,
      elements: prev.elements.filter((e) => e.id !== id),
    }));
    if (selectedId === id) setSelectedId(null);
  }

  function addElement(type: ElementType) {
    const id = `custom-${Date.now()}`;
    const newElem: LayoutElement = {
      id,
      type,
      label: `Element ${type}`,
      x: 20, y: 100, w: 80, h: 10,
      content: type === "text" ? "Teks baru" : "",
      fontSize: 10,
      color: "#000000",
      bold: false,
      align: "left",
      bgColor: type === "rect" ? "#e0e0e0" : undefined,
      z: 5,
    };
    setLayout((prev) => ({ ...prev, elements: [...prev.elements, newElem] }));
    setSelectedId(id);
  }

  // Sort elements by z-index for rendering
  const sortedElements = [...layout.elements].sort((a, b) => (a.z || 0) - (b.z || 0));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
      {/* ===== LEFT: A4 Canvas Editor ===== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
              <Move className="w-4 h-4 text-blue-600" /> Drag & Drop Editor — {docLabel}
            </h3>
            <p className="text-xs text-slate-500">Drag element untuk mengatur posisi. Klik untuk edit style.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} className="bg-white text-xs">
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-xs">
              {saving ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
              Simpan Layout
            </Button>
          </div>
        </div>

        {/* Add element toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500">Tambah:</span>
          <Button size="sm" variant="outline" className="h-7 text-xs bg-white" onClick={() => addElement("text")}>
            <Type className="w-3 h-3 mr-1" /> Teks
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs bg-white" onClick={() => addElement("rect")}>
            <Square className="w-3 h-3 mr-1" /> Kotak
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs bg-white" onClick={() => addElement("logo")}>
            <ImageIcon className="w-3 h-3 mr-1" /> Logo
          </Button>
        </div>

        {/* A4 Canvas */}
        <div className="flex justify-center overflow-auto bg-slate-100 rounded-lg p-4">
          <div
            ref={canvasRef}
            className="bg-white shadow-lg relative"
            style={{
              width: `${CANVAS_W}px`,
              height: `${CANVAS_H}px`,
              backgroundImage: "linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)",
              backgroundSize: `${10 * MM_TO_PX * SCALE}px ${10 * MM_TO_PX * SCALE}px`,
            }}
            onClick={() => setSelectedId(null)}
          >
            {sortedElements.map((elem) => (
              <CanvasElement
                key={elem.id}
                element={elem}
                scale={SCALE}
                isSelected={selectedId === elem.id}
                isLocked={locked.has(elem.id)}
                logoUrl={logoUrl}
                onSelect={() => setSelectedId(elem.id)}
                onDrag={(dx, dy) => handleDrag(elem.id, dx, dy)}
                onToggleLock={() => toggleLock(elem.id)}
                onDelete={() => deleteElement(elem.id)}
              />
            ))}
          </div>
        </div>

        {/* Element list */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs">Daftar Element ({layout.elements.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-2 max-h-32 overflow-y-auto">
            <div className="space-y-1">
              {layout.elements.map((elem) => (
                <button
                  key={elem.id}
                  onClick={() => setSelectedId(elem.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors",
                    selectedId === elem.id ? "bg-blue-100 text-blue-700" : "hover:bg-slate-50 text-slate-600"
                  )}
                >
                  {(() => {
                    const Icon = ELEMENT_ICONS[elem.type];
                    return Icon ? <Icon className="w-3 h-3 shrink-0" /> : null;
                  })()}
                  <span className="flex-1 text-left truncate">{elem.label}</span>
                  <span className="text-[10px] text-slate-400">{Math.round(elem.x)},{Math.round(elem.y)}mm</span>
                  {locked.has(elem.id) && <Lock className="w-2.5 h-2.5 text-slate-400" />}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== RIGHT: Style Panel ===== */}
      <div className="space-y-3">
        <Card className="shadow-sm sticky top-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600" /> Style Panel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
            {selected ? (
              <StylePanel
                element={selected}
                onUpdate={(updates) => updateElement(selected.id, updates)}
                onToggleLock={() => toggleLock(selected.id)}
                isLocked={locked.has(selected.id)}
                onDelete={() => deleteElement(selected.id)}
              />
            ) : (
              <div className="text-center py-8">
                <Move className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Klik element di canvas untuk edit style</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ===== Canvas Element (draggable) =====
function CanvasElement({
  element, scale, isSelected, isLocked, logoUrl,
  onSelect, onDrag, onToggleLock, onDelete,
}: {
  element: LayoutElement;
  scale: number;
  isSelected: boolean;
  isLocked: boolean;
  logoUrl?: string;
  onSelect: () => void;
  onDrag: (dx: number, dy: number) => void;
  onToggleLock: () => void;
  onDelete: () => void;
}) {
  const Icon = ELEMENT_ICONS[element.type];
  const pxX = element.x * MM_TO_PX * scale;
  const pxY = element.y * MM_TO_PX * scale;
  const pxW = element.w * MM_TO_PX * scale;
  const pxH = element.h * MM_TO_PX * scale;

  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  function handleMouseDown(e: React.MouseEvent) {
    if (isLocked) return;
    e.stopPropagation();
    onSelect();
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      onDrag(dx, dy);
      dragStart.current = { x: e.clientX, y: e.clientY };
    }
  }

  function handleMouseUp() {
    setDragging(false);
  }

  // Render element content based on type
  function renderContent() {
    const fontSizePx = (element.fontSize || 10) * 0.35 * scale; // pt to px approx

    if (element.type === "rect") {
      return (
        <div
          className="w-full h-full"
          style={{ backgroundColor: element.bgColor || "#e0e0e0" }}
        />
      );
    }

    if (element.type === "logo") {
      const logoPx = (element.logoSize || 14) * MM_TO_PX * scale;
      if (logoUrl) {
        return <img src={logoUrl} alt="Logo" style={{ width: logoPx, height: logoPx, objectFit: "contain" }} />;
      }
      return (
        <div
          className="rounded-full flex items-center justify-center text-white font-bold"
          style={{
            width: logoPx, height: logoPx,
            backgroundColor: element.logoColor || "#ff8000",
            fontSize: `${logoPx * 0.5}px`,
          }}
        >
          {element.logoText || "H"}
        </div>
      );
    }

    if (element.type === "text") {
      return (
        <div
          className="w-full h-full flex items-center overflow-hidden"
          style={{
            fontSize: `${Math.max(4, fontSizePx)}px`,
            color: element.color || "#000",
            fontWeight: element.bold ? "bold" : "normal",
            textAlign: element.align || "left",
            justifyContent: element.align === "center" ? "center" : element.align === "right" ? "flex-end" : "flex-start",
            whiteSpace: "nowrap",
          }}
        >
          {element.content || ""}
        </div>
      );
    }

    if (element.type === "body") {
      return (
        <div
          className="w-full h-full border border-dashed border-slate-300 rounded flex items-center justify-center"
          style={{ fontSize: `${Math.max(4, fontSizePx)}px`, color: "#94a3b8" }}
        >
          [Area Isi Dokumen]
        </div>
      );
    }

    if (element.type === "signature") {
      return (
        <div className="w-full h-full flex flex-col justify-end" style={{ fontSize: `${Math.max(4, fontSizePx)}px`, color: element.color }}>
          <div style={{ height: "60%" }}></div>
          <div style={{ borderTop: element.lineStyle === "dashed" ? "1px dashed" : element.lineStyle === "solid" ? "1px solid" : "none", borderColor: element.lineColor, marginBottom: "2px" }}></div>
          <div style={{ fontWeight: "bold" }}>Nama</div>
          <div style={{ fontSize: `${Math.max(3, fontSizePx * 0.8)}px`, color: "#64748b" }}>Jabatan</div>
        </div>
      );
    }

    return null;
  }

  return (
    <div
      className={cn(
        "absolute cursor-move select-none transition-shadow",
        isLocked && "cursor-default",
        isSelected && "ring-2 ring-blue-500 z-50",
        !isSelected && "hover:ring-1 hover:ring-blue-300",
      )}
      style={{
        left: `${pxX}px`,
        top: `${pxY}px`,
        width: `${pxW}px`,
        height: `${pxH}px`,
        zIndex: isSelected ? 999 : element.z || 1,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      {renderContent()}
      {/* Selection toolbar */}
      {isSelected && (
        <div className="absolute -top-6 left-0 flex items-center gap-0.5 bg-blue-600 text-white rounded px-1 py-0.5 text-[8px] z-50">
          <Icon className="w-2.5 h-2.5" />
          <span className="whitespace-nowrap">{element.label}</span>
          <span className="ml-1 text-blue-200">{Math.round(element.x)},{Math.round(element.y)}</span>
          <button onClick={(e) => { e.stopPropagation(); onToggleLock(); }} className="ml-1 hover:text-blue-200">
            {isLocked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="hover:text-rose-300">
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ===== Style Panel for selected element =====
function StylePanel({
  element, onUpdate, onToggleLock, isLocked, onDelete,
}: {
  element: LayoutElement;
  onUpdate: (updates: Partial<LayoutElement>) => void;
  onToggleLock: () => void;
  isLocked: boolean;
  onDelete: () => void;
}) {
  const Icon = ELEMENT_ICONS[element.type];
  return (
    <div className="space-y-3">
      {/* Element info */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <div className={cn("w-7 h-7 rounded-md flex items-center justify-center", ELEMENT_COLORS[element.type])}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-900 truncate">{element.label}</p>
          <p className="text-[10px] text-slate-400">{element.type}</p>
        </div>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onToggleLock} title={isLocked ? "Unlock" : "Lock"}>
          {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600" onClick={onDelete} title="Hapus">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Label */}
      <div className="space-y-1">
        <Label className="text-[10px] font-semibold text-slate-500">Nama Element</Label>
        <Input value={element.label} onChange={(e) => onUpdate({ label: e.target.value })} className="h-8 text-xs bg-white" />
      </div>

      {/* Position */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] font-semibold text-slate-500">X (mm)</Label>
          <Input type="number" step="0.5" value={element.x} onChange={(e) => onUpdate({ x: Number(e.target.value) })} className="h-8 text-xs bg-white" disabled={isLocked} />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-semibold text-slate-500">Y (mm)</Label>
          <Input type="number" step="0.5" value={element.y} onChange={(e) => onUpdate({ y: Number(e.target.value) })} className="h-8 text-xs bg-white" disabled={isLocked} />
        </div>
      </div>

      {/* Size */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] font-semibold text-slate-500">Lebar (mm)</Label>
          <Input type="number" step="0.5" value={element.w} onChange={(e) => onUpdate({ w: Number(e.target.value) })} className="h-8 text-xs bg-white" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-semibold text-slate-500">Tinggi (mm)</Label>
          <Input type="number" step="0.5" value={element.h} onChange={(e) => onUpdate({ h: Number(e.target.value) })} className="h-8 text-xs bg-white" />
        </div>
      </div>

      {/* Text-specific properties */}
      {(element.type === "text" || element.type === "signature") && (
        <>
          <Separator className="my-1" />
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-slate-500">Konten Teks</Label>
            {element.type === "text" ? (
              <Textarea value={element.content || ""} onChange={(e) => onUpdate({ content: e.target.value })} rows={2} className="text-xs bg-white resize-none" />
            ) : (
              <p className="text-[10px] text-slate-400">Auto-generated dari data dokumen</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-slate-500">Font Size (pt)</Label>
              <Input type="number" step="0.5" value={element.fontSize || 10} onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })} className="h-8 text-xs bg-white" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-slate-500">Warna Teks</Label>
              <Input type="color" value={element.color || "#000000"} onChange={(e) => onUpdate({ color: e.target.value })} className="h-8 w-full bg-white border-slate-200" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant={element.bold ? "default" : "outline"} className="h-7 text-xs" onClick={() => onUpdate({ bold: !element.bold })}>
              <Type className="w-3 h-3 mr-1" /> Bold
            </Button>
            <div className="flex gap-1">
              {(["left", "center", "right"] as const).map((a) => (
                <Button key={a} size="sm" variant={element.align === a ? "default" : "outline"} className="h-7 px-2 text-[10px]" onClick={() => onUpdate({ align: a })}>
                  {a === "left" ? "L" : a === "center" ? "C" : "R"}
                </Button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Rect-specific properties */}
      {element.type === "rect" && (
        <>
          <Separator className="my-1" />
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-slate-500">Warna Background</Label>
            <Input type="color" value={element.bgColor || "#e0e0e0"} onChange={(e) => onUpdate({ bgColor: e.target.value })} className="h-8 w-full bg-white border-slate-200" />
          </div>
        </>
      )}

      {/* Logo-specific properties */}
      {element.type === "logo" && (
        <>
          <Separator className="my-1" />
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-slate-500">Ukuran (mm)</Label>
              <Input type="number" value={element.logoSize || 14} onChange={(e) => onUpdate({ logoSize: Number(e.target.value) })} className="h-8 text-xs bg-white" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-slate-500">Warna Logo</Label>
              <Input type="color" value={element.logoColor || "#ff8000"} onChange={(e) => onUpdate({ logoColor: e.target.value })} className="h-8 w-full bg-white border-slate-200" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-slate-500">Teks Logo (jika no image)</Label>
            <Input value={element.logoText || ""} onChange={(e) => onUpdate({ logoText: e.target.value })} className="h-8 text-xs bg-white" />
          </div>
        </>
      )}

      {/* Signature-specific properties */}
      {element.type === "signature" && (
        <>
          <Separator className="my-1" />
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-slate-500">Garis Tanda Tangan</Label>
            <div className="flex gap-1">
              {(["solid", "dashed", "none"] as const).map((s) => (
                <Button key={s} size="sm" variant={element.lineStyle === s ? "default" : "outline"} className="h-7 text-[10px]" onClick={() => onUpdate({ lineStyle: s })}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-slate-500">Warna Garis</Label>
            <Input type="color" value={element.lineColor || "#d1d5db"} onChange={(e) => onUpdate({ lineColor: e.target.value })} className="h-8 w-full bg-white border-slate-200" />
          </div>
        </>
      )}
    </div>
  );
}
