import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Upload, Loader2, Sparkles, AlertTriangle, CheckCircle2, Image as ImgIcon, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { analyzeMri } from "@/lib/analyze.functions";
import { saveReport, type AnalysisResult } from "@/lib/reports-store";

export const Route = createFileRoute("/analyze")({
  head: () => ({
    meta: [
      { title: "Analyze MRI — NeuroVision AI" },
      { name: "description", content: "Upload a brain MRI and get AI-driven tumor classification, attention map, and report." },
    ],
  }),
  component: AnalyzePage,
});

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function AnalyzePage() {
  const analyze = useServerFn(analyzeMri);
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(f: File | undefined) {
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) { toast.error("Image too large (max 8 MB)"); return; }
    const url = await fileToDataUrl(f);
    setImage(url);
    setResult(null);
  }

  async function run() {
    if (!image) { toast.error("Upload an MRI image first"); return; }
    setLoading(true); setResult(null);
    try {
      const res = await analyze({ data: { imageDataUrl: image } });
      if (!res.ok) { toast.error(res.error); return; }
      setResult(res.result);
      saveReport({
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        sequence: "",
        notes: "",
        imageDataUrl: image,
        result: res.result,
      });
      toast.success("Analysis complete & saved to Reports");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-gradient-neural">MRI</span> Analysis
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Upload a brain MRI scan for AI-powered classification and localization.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: input */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="glass">
            <CardHeader><CardTitle className="text-base">1. Upload Scan</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
                className="relative cursor-pointer rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 text-center hover:border-primary/60 hover:bg-muted/50 transition"
              >
                {image ? (
                  <div className="relative">
                    <img src={image} alt="scan" className="mx-auto max-h-64 rounded-lg object-contain" />
                    <Button
                      size="icon" variant="secondary"
                      className="absolute top-1 right-1 h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); setImage(null); setResult(null); }}
                    ><X className="h-3 w-3" /></Button>
                  </div>
                ) : (
                  <div className="py-8 space-y-2">
                    <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                    <p className="text-sm font-medium">Click or drag MRI image here</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG · max 8 MB</p>
                  </div>
                )}
                <input
                  ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? undefined)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader><CardTitle className="text-base">2. Scan Parameters</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">MRI Sequence</Label>
                <Select value={sequence} onValueChange={setSequence}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="T1">T1-weighted</SelectItem>
                    <SelectItem value="T2">T2-weighted</SelectItem>
                    <SelectItem value="FLAIR">FLAIR</SelectItem>
                    <SelectItem value="T1+contrast">T1 + Contrast</SelectItem>
                    <SelectItem value="DWI">DWI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Clinician Notes (optional)</Label>
                <Textarea
                  value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Patient symptoms, history, region of interest…"
                  rows={3} className="mt-1.5"
                />
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={run} disabled={!image || loading} size="lg"
            className="w-full bg-gradient-neural text-neural-foreground shadow-glow hover:opacity-90"
          >
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing…</> : <><Sparkles className="mr-2 h-4 w-4" /> Run AI Analysis</>}
          </Button>
        </div>

        {/* Right: results */}
        <div className="lg:col-span-3">
          {loading ? <LoadingState /> : result ? <ResultView image={image!} result={result} /> : <EmptyState />}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="glass h-full min-h-[400px] flex items-center justify-center">
      <CardContent className="text-center space-y-2">
        <ImgIcon className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="text-sm font-medium">No analysis yet</p>
        <p className="text-xs text-muted-foreground">Upload an MRI scan and click Run AI Analysis</p>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  const steps = ["Preprocessing image", "Extracting features", "Running classification", "Localizing regions", "Generating report"];
  return (
    <Card className="glass h-full min-h-[400px]">
      <CardContent className="flex flex-col items-center justify-center h-full space-y-6 p-8">
        <div className="relative">
          <div className="h-20 w-20 rounded-full bg-gradient-neural shadow-glow animate-pulse" />
          <Loader2 className="absolute inset-0 m-auto h-10 w-10 animate-spin text-neural-foreground" />
        </div>
        <div className="space-y-1.5 text-sm text-center">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
              {s}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ResultView({ image, result }: { image: string; result: AnalysisResult }) {
  const isNormal = result.classification === "Normal";
  const isInconclusive = result.classification === "Inconclusive";
  const severityColor = {
    None: "bg-success/20 text-success border-success/30",
    Low: "bg-warning/20 text-warning border-warning/30",
    Moderate: "bg-warning/20 text-warning border-warning/30",
    High: "bg-destructive/20 text-destructive border-destructive/30",
  }[result.severity];

  function download(type: "json" | "csv") {
    let content = "", mime = "", ext = "";
    if (type === "json") {
      content = JSON.stringify(result, null, 2); mime = "application/json"; ext = "json";
    } else {
      const rows = [
        ["Field", "Value"],
        ["Classification", result.classification],
        ["Confidence", `${result.confidence}%`],
        ["Severity", result.severity],
        ["Location", result.location],
        ["Size", result.size_estimate],
        ["Recommendation", result.recommendation],
        ...result.key_findings.map((f, i) => [`Finding ${i + 1}`, f]),
      ];
      content = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      mime = "text/csv"; ext = "csv";
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `neurovision-report.${ext}`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Verdict */}
      <Card className="glass overflow-hidden">
        <div className="bg-gradient-neural h-1" />
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
                {isNormal ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <AlertTriangle className="h-3.5 w-3.5 text-warning" />}
                Classification
              </div>
              <h2 className="text-3xl font-bold">{result.classification}</h2>
              <p className="text-sm text-muted-foreground mt-1">{result.location} · {result.size_estimate}</p>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Confidence</div>
              <div className="text-3xl font-bold text-gradient-neural">{result.confidence}%</div>
              <Badge className={`mt-1 border ${severityColor}`}>{result.severity} severity</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Image + attention map */}
      <Card className="glass">
        <CardHeader><CardTitle className="text-base">Tumor Localization (Attention Map)</CardTitle></CardHeader>
        <CardContent>
          <div className="relative inline-block max-w-full">
            <img src={image} alt="MRI scan" className="rounded-lg max-h-96 object-contain block" />
            {!isNormal && !isInconclusive && result.attention_regions.map((r, i) => (
              <div
                key={i}
                className="absolute border-2 border-primary rounded shadow-glow animate-pulse"
                style={{
                  left: `${r.x}%`, top: `${r.y}%`,
                  width: `${r.w}%`, height: `${r.h}%`,
                  background: "oklch(0.72 0.18 195 / 0.15)",
                }}
              >
                <span className="absolute -top-5 left-0 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded whitespace-nowrap">
                  {r.label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Differential */}
      <Card className="glass">
        <CardHeader><CardTitle className="text-base">Differential Probabilities</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {result.differential.sort((a, b) => b.probability - a.probability).map(d => (
            <div key={d.label}>
              <div className="flex justify-between text-xs mb-1">
                <span>{d.label}</span>
                <span className="text-muted-foreground">{d.probability.toFixed(1)}%</span>
              </div>
              <Progress value={d.probability} className="h-1.5" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Findings + recommendation */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass">
          <CardHeader><CardTitle className="text-base">Key Findings</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {result.key_findings.map((f, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary mt-1">▸</span><span>{f}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader><CardTitle className="text-base">Recommendation</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm">{result.recommendation}</p>
          </CardContent>
        </Card>
      </div>

      {/* Export */}
      <Card className="glass">
        <CardContent className="p-4 flex flex-wrap gap-2 items-center justify-between">
          <p className="text-xs text-muted-foreground italic">{result.disclaimer}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => download("json")}>Export JSON</Button>
            <Button size="sm" variant="outline" onClick={() => download("csv")}>Export CSV</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
