"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload, FileText, Sparkles, CheckCircle2, AlertCircle, RefreshCw,
  Database, ArrowRight, Check, X, Table, Users, Play,
} from "lucide-react";
import * as XLSX from "xlsx";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Step = "upload" | "analyzing" | "review" | "importing" | "done";

const MODULE_OPTIONS = [
  { value: "PAYROLL", label: "Payroll & Gaji" },
  { value: "CRM_CLIENT", label: "CRM Client" },
  { value: "INVOICE", label: "Invoice" },
  { value: "FINANCE_TRANSACTION", label: "Arus Kas (Finance)" },
  { value: "USER", label: "Data Karyawan (User)" },
  { value: "ABSENSI", label: "Absensi" },
];

export function ImportDataModule() {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<any[][]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState("");
  const [importResult, setImportResult] = useState<any>(null);

  // ===== Step 1: Handle file upload =====
  const handleFileUpload = useCallback(async (file: File) => {
    setError("");
    setFileName(file.name);
    setStep("analyzing");
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        setError("File kosong atau hanya berisi header. Pastikan ada data.");
        setStep("upload");
        return;
      }

      const parsedHeaders = jsonData[0].map((h: any) => String(h || "").trim());
      const parsedRows = jsonData.slice(1).filter((r: any) => r.some((c: any) => c !== null && c !== ""));

      setHeaders(parsedHeaders);
      setRows(parsedRows);

      // Call AI analyze API
      const result = await api<{ suggestedModule: string; moduleName: string; fieldMapping: any; userMatchingColumn: string; notes: string; userMatching: any[]; preview: any[]; stats: any }>("/api/import/analyze", {
        method: "POST",
        body: JSON.stringify({
          fileName: file.name,
          headers: parsedHeaders,
          rows: parsedRows.slice(0, 10), // send preview for AI
        }),
      });

      setAnalysis(result);
      setStep("review");
      toast.success(`AI mendeteksi: ${result.moduleName} (${result.stats.matchedFields} field cocok)`);
    } catch (e: any) {
      setError(e.message || "Gagal menganalisis file");
      setStep("upload");
    }
  }, []);

  // ===== Step 2: Handle drag & drop =====
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".csv") || file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
      handleFileUpload(file);
    } else {
      setError("Format file tidak didukung. Gunakan CSV atau Excel (.xlsx)");
    }
  }

  // ===== Step 3: Update field mapping =====
  function updateFieldMapping(csvCol: string, hbosField: string) {
    setAnalysis((prev: any) => ({
      ...prev,
      fieldMapping: { ...prev.fieldMapping, [csvCol]: hbosField || null },
    }));
  }

  // ===== Step 4: Update user matching =====
  function updateUserMatching(csvValue: string, action: string, newUser?: any) {
    setAnalysis((prev: any) => ({
      ...prev,
      userMatching: prev.userMatching.map((um: any) =>
        um.csvValue === csvValue
          ? { ...um, action, newUser: newUser || um.newUser }
          : um
      ),
    }));
  }

  function assignExistingUser(csvValue: string, userId: string) {
    setAnalysis((prev: any) => ({
      ...prev,
      userMatching: prev.userMatching.map((um: any) =>
        um.csvValue === csvValue
          ? {
              ...um,
              matchedUser: prev.availableUsers.find((u: any) => u.id === userId) || null,
              action: "matched",
            }
          : um
      ),
    }));
  }

  // ===== Step 5: Execute import =====
  async function handleExecuteImport() {
    setStep("importing");
    try {
      // Build full rows data (all rows, not just preview)
      const fullRows = rows.map((r) => {
        const obj: any = {};
        headers.forEach((h, i) => { obj[h] = r[i]; });
        return obj;
      });

      const result = await api<{ result: any }>("/api/import/execute", {
        method: "POST",
        body: JSON.stringify({
          module: analysis.suggestedModule,
          rows: fullRows,
          fieldMapping: analysis.fieldMapping,
          userMatching: analysis.userMatching,
          userMatchingColumn: analysis.userMatchingColumn,
          options: { skipDuplicates: false },
        }),
      });

      setImportResult(result.result);
      setStep("done");
      if (result.result.failed === 0) {
        toast.success(`Import berhasil: ${result.result.success} data masuk${result.result.newUsers ? `, ${result.result.newUsers} user baru` : ""}`);
      } else {
        toast.warning(`Import selesai: ${result.result.success} berhasil, ${result.result.failed} gagal`);
      }
    } catch (e: any) {
      setError(e.message || "Gagal import data");
      setStep("review");
    }
  }

  function handleReset() {
    setStep("upload");
    setFileName("");
    setHeaders([]);
    setRows([]);
    setAnalysis(null);
    setError("");
    setImportResult(null);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Database className="w-6 h-6 text-blue-600" /> Import Data
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Import data dari Google Sheets / Excel ke HBOS. AI otomatis mendeteksi module & mapping kolom.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: "upload", label: "1. Upload File", icon: Upload },
          { key: "analyzing", label: "2. AI Analisis", icon: Sparkles },
          { key: "review", label: "3. Review & Mapping", icon: Table },
          { key: "importing", label: "4. Import", icon: Play },
          { key: "done", label: "5. Selesai", icon: CheckCircle2 },
        ].map((s, i) => {
          const stepOrder = ["upload", "analyzing", "review", "importing", "done"];
          const currentIdx = stepOrder.indexOf(step);
          const thisIdx = i;
          const isDone = thisIdx < currentIdx;
          const isCurrent = step === s.key || (step === "analyzing" && s.key === "analyzing");
          return (
            <div key={s.key} className="flex items-center gap-2">
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                isDone ? "bg-green-100 text-green-700" : isCurrent ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
              )}>
                {isDone ? <Check className="w-3 h-3" /> : isCurrent && step === "analyzing" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <s.icon className="w-3 h-3" />}
                {s.label}
              </div>
              {i < 4 && <ArrowRight className="w-3 h-3 text-slate-300" />}
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <Alert className="border-rose-200 bg-rose-50">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <AlertDescription className="text-rose-700">{error}</AlertDescription>
        </Alert>
      )}

      {/* ===== STEP 1: UPLOAD ===== */}
      {step === "upload" && (
        <Card className="shadow-sm">
          <CardContent className="p-8">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-blue-300 rounded-xl p-12 text-center hover:bg-blue-50/50 transition-colors cursor-pointer"
              onClick={() => document.getElementById("import-file-input")?.click()}
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <p className="font-semibold text-slate-900">Drag & drop file di sini, atau klik untuk pilih</p>
              <p className="text-sm text-slate-500 mt-1">Format: CSV, Excel (.xlsx, .xls)</p>
              <p className="text-xs text-slate-400 mt-2">Data dari Google Sheets bisa di-export sebagai CSV/Excel</p>
              <input
                id="import-file-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </div>

            {/* Supported modules */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MODULE_OPTIONS.map((m) => (
                <div key={m.value} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <Database className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-600">{m.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== STEP 2: ANALYZING ===== */}
      {step === "analyzing" && (
        <Card className="shadow-sm">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-blue-600 animate-pulse" />
            </div>
            <p className="font-semibold text-slate-900">AI sedang menganalisis data...</p>
            <p className="text-sm text-slate-500 mt-1">Mendeteksi module & mapping kolom untuk {fileName}</p>
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mt-4" />
          </CardContent>
        </Card>
      )}

      {/* ===== STEP 3: REVIEW & MAPPING ===== */}
      {step === "review" && analysis && (
        <div className="space-y-4">
          {/* AI Suggestion */}
          <Card className="shadow-sm border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900 text-sm">AI Mendeteksi:</p>
                    <Badge className="bg-blue-600 text-white">{analysis.moduleName}</Badge>
                    <Badge variant="outline" className="bg-white">
                      <CheckCircle2 className="w-3 h-3 mr-1 text-green-600" />
                      {analysis.stats.matchedFields} field cocok
                    </Badge>
                    {analysis.stats.newUsers > 0 && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        <Users className="w-3 h-3 mr-1" />
                        {analysis.stats.newUsers} user baru akan dibuat
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{analysis.notes}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-slate-500">Ubah module:</span>
                    <Select
                      value={analysis.suggestedModule}
                      onValueChange={(v) => setAnalysis((prev: any) => ({ ...prev, suggestedModule: v, moduleName: MODULE_OPTIONS.find((m) => m.value === v)?.label || v }))}
                    >
                      <SelectTrigger className="w-[200px] h-8 bg-white text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MODULE_OPTIONS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Matching (if detected) */}
          {analysis.userMatching && analysis.userMatching.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" /> Matching Karyawan
                  <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                    {analysis.userMatching.filter((u: any) => u.matchedUser).length} cocok
                  </Badge>
                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                    {analysis.userMatching.filter((u: any) => !u.matchedUser).length} baru
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-slate-500 mb-2">Cocokkan data CSV dengan user HBOS yang sudah ada, atau buat user baru.</p>
                {analysis.userMatching.map((um: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 bg-slate-50/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{um.csvValue}</p>
                      {um.matchedUser ? (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <Check className="w-3 h-3" /> {um.matchedUser.name} ({um.matchedUser.email})
                        </p>
                      ) : (
                        <p className="text-xs text-amber-600">User belum ada — akan dibuat baru</p>
                      )}
                    </div>
                    {!um.matchedUser && (
                      <Select
                        value=""
                        onValueChange={(v) => assignExistingUser(um.csvValue, v)}
                      >
                        <SelectTrigger className="w-[180px] h-8 bg-white text-xs"><SelectValue placeholder="Pilih user existing" /></SelectTrigger>
                        <SelectContent>
                          {analysis.availableUsers?.map((u: any) => (
                            <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Field Mapping */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Table className="w-4 h-4 text-blue-600" /> Mapping Kolom
              </CardTitle>
              <p className="text-xs text-slate-500">AI menyarankan mapping berikut. Anda bisa ubah jika perlu.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {headers.map((csvCol) => {
                const hbosField = analysis.fieldMapping?.[csvCol];
                return (
                  <div key={csvCol} className="flex items-center gap-2 p-2 rounded-lg border border-slate-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{csvCol}</p>
                      <p className="text-[10px] text-slate-400">Kolom CSV</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
                    <Select value={hbosField || "null"} onValueChange={(v) => updateFieldMapping(csvCol, v === "null" ? "" : v)}>
                      <SelectTrigger className="w-[200px] h-8 bg-white text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="null">— Tidak dipakai —</SelectItem>
                        {getModuleFields(analysis.suggestedModule).map((f) => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hbosField && <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Data Preview */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" /> Preview Data (10 baris pertama)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      {Object.keys(analysis.preview?.[0] || {}).map((k) => (
                        <th key={k} className="py-2 px-3 font-medium whitespace-nowrap">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.preview?.map((row: any, i: number) => (
                      <tr key={i} className="border-b border-slate-50">
                        {Object.values(row).map((v: any, j: number) => (
                          <td key={j} className="py-2 px-3 text-slate-600 whitespace-nowrap">{String(v ?? "-")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-400 mt-2">Total: {analysis.stats.totalRows} baris data</p>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" onClick={handleReset} className="bg-white">
              <X className="w-4 h-4 mr-1" /> Batal
            </Button>
            <Button onClick={handleExecuteImport} className="bg-blue-600 hover:bg-blue-700">
              <Play className="w-4 h-4 mr-1" /> Import {analysis.stats.totalRows} Data
            </Button>
          </div>
        </div>
      )}

      {/* ===== STEP 4: IMPORTING ===== */}
      {step === "importing" && (
        <Card className="shadow-sm">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <Database className="w-8 h-8 text-blue-600 animate-pulse" />
            </div>
            <p className="font-semibold text-slate-900">Sedang import data...</p>
            <p className="text-sm text-slate-500 mt-1">Menyimpan {rows.length} baris ke {analysis?.moduleName}</p>
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mt-4" />
          </CardContent>
        </Card>
      )}

      {/* ===== STEP 5: DONE ===== */}
      {step === "done" && importResult && (
        <div className="space-y-4">
          <Card className={cn("shadow-sm border-2", importResult.failed === 0 ? "border-green-300 bg-green-50/50" : "border-amber-300 bg-amber-50/50")}>
            <CardContent className="p-6 text-center">
              <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4", importResult.failed === 0 ? "bg-green-100" : "bg-amber-100")}>
                {importResult.failed === 0 ? <CheckCircle2 className="w-8 h-8 text-green-600" /> : <AlertCircle className="w-8 h-8 text-amber-600" />}
              </div>
              <p className="text-lg font-bold text-slate-900">
                {importResult.failed === 0 ? "Import Berhasil!" : "Import Selesai"}
              </p>
              <div className="flex items-center justify-center gap-4 mt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{importResult.success}</p>
                  <p className="text-xs text-slate-500">Berhasil</p>
                </div>
                {importResult.failed > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-rose-600">{importResult.failed}</p>
                    <p className="text-xs text-slate-500">Gagal</p>
                  </div>
                )}
                {importResult.skipped > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-600">{importResult.skipped}</p>
                    <p className="text-xs text-slate-500">Skip</p>
                  </div>
                )}
                {importResult.newUsers > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{importResult.newUsers}</p>
                    <p className="text-xs text-slate-500">User Baru</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Error details */}
          {importResult.errors.length > 0 && (
            <Card className="shadow-sm border-rose-200">
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4 text-rose-600" /> Detail Error</CardTitle></CardHeader>
              <CardContent>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {importResult.errors.map((err: string, i: number) => (
                    <p key={i} className="text-xs text-rose-600">{err}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Success details */}
          {importResult.details.filter((d: any) => d.status === "success").length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" /> Detail Import Berhasil</CardTitle></CardHeader>
              <CardContent>
                <div className="max-h-40 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-left text-slate-500">
                        <th className="py-1.5 px-2 font-medium">Baris</th>
                        <th className="py-1.5 px-2 font-medium">Nama</th>
                        <th className="py-1.5 px-2 font-medium">Bulan/Tahun</th>
                        <th className="py-1.5 px-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.details.filter((d: any) => d.status === "success").map((d: any, i: number) => (
                        <tr key={i} className="border-b border-slate-50">
                          <td className="py-1.5 px-2 text-slate-600">{d.row}</td>
                          <td className="py-1.5 px-2 text-slate-600">{d.name || "-"}</td>
                          <td className="py-1.5 px-2 text-slate-600">{d.month ? `${d.month}/${d.year}` : "-"}</td>
                          <td className="py-1.5 px-2"><Badge variant="outline" className="text-[9px] bg-green-50 text-green-700 border-green-200">OK</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset} className="bg-white">
              <Upload className="w-4 h-4 mr-1" /> Import File Lain
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Get available fields per module (for manual mapping adjustment)
function getModuleFields(module: string): string[] {
  const fields: Record<string, string[]> = {
    PAYROLL: ["userId", "month", "year", "baseSalary", "mealAllowance", "transportAllowance", "grossSalary", "tax", "bpjs", "otherDeduction", "totalDeduction", "netSalary", "status", "paidAt", "note", "jabatan", "bankName", "bankAccount", "accountName"],
    CRM_CLIENT: ["namaKlien", "instansi", "pic", "email", "nomorWA", "jenisTraining", "jumlahPeserta", "budget", "lokasi", "tanggalEvent", "status", "catatanFollowUp"],
    INVOICE: ["invoiceNumber", "issueDate", "clientName", "clientAddress", "city", "description", "items", "subtotal", "discount", "tax", "totalAmount", "status", "bankName", "bankAccount", "accountName"],
    FINANCE_TRANSACTION: ["type", "amount", "category", "account", "date", "description", "vendor"],
    USER: ["name", "email", "role", "position", "phone"],
    ABSENSI: ["userId", "tanggal", "jamMasuk", "jamKeluar", "status", "note"],
  };
  return fields[module] || [];
}
