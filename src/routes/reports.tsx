import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2, Download, FileText, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getReports, deleteReport, clearReports, type SavedReport } from "@/lib/reports-store";
import { toast } from "sonner";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — NeuroVision AI" },
      { name: "description", content: "Browse, search, and export your saved MRI analysis reports." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => { setReports(getReports()); }, []);

  const filtered = reports.filter(r =>
    r.result.classification.toLowerCase().includes(query.toLowerCase()) ||
    r.sequence.toLowerCase().includes(query.toLowerCase()) ||
    r.notes.toLowerCase().includes(query.toLowerCase())
  );

  function remove(id: string) {
    deleteReport(id);
    setReports(getReports());
    toast.success("Report deleted");
  }

  function clearAll() {
    if (!confirm("Delete all reports?")) return;
    clearReports();
    setReports([]);
  }

  function exportAll(type: "json" | "csv") {
    if (reports.length === 0) return toast.error("No reports to export");
    let content = "", mime = "", ext = "";
    if (type === "json") {
      content = JSON.stringify(reports.map(({ imageDataUrl, ...r }) => r), null, 2);
      mime = "application/json"; ext = "json";
    } else {
      const rows = [["Date", "Sequence", "Classification", "Confidence", "Severity", "Location", "Recommendation"]];
      reports.forEach(r => rows.push([
        new Date(r.createdAt).toISOString(), r.sequence,
        r.result.classification, `${r.result.confidence}%`,
        r.result.severity, r.result.location, r.result.recommendation,
      ]));
      content = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      mime = "text/csv"; ext = "csv";
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `neurovision-reports.${ext}`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight"><span className="text-gradient-neural">Saved</span> Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">{reports.length} report{reports.length !== 1 && "s"} saved locally</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="Search…" value={query} onChange={e => setQuery(e.target.value)} className="w-48" />
          <Button variant="outline" size="sm" onClick={() => exportAll("json")}><Download className="mr-1 h-3.5 w-3.5" />JSON</Button>
          <Button variant="outline" size="sm" onClick={() => exportAll("csv")}><Download className="mr-1 h-3.5 w-3.5" />CSV</Button>
          <Button variant="destructive" size="sm" onClick={clearAll} disabled={!reports.length}>Clear all</Button>
        </div>
      </div>

      {reports.length === 0 ? (
        <Card className="glass">
          <CardContent className="py-16 text-center space-y-3">
            <Inbox className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="text-sm font-medium">No reports yet</p>
            <Button asChild className="bg-gradient-neural text-neural-foreground">
              <Link to="/analyze">Run your first analysis</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(r => (
            <Dialog key={r.id}>
              <Card className="glass overflow-hidden group hover:shadow-neural transition">
                <div className="relative aspect-square bg-black/40">
                  <img src={r.imageDataUrl} alt="scan" className="absolute inset-0 h-full w-full object-contain" />
                  <Badge className="absolute top-2 right-2">{r.result.confidence}%</Badge>
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    {r.result.classification}
                    <Badge variant="secondary" className="text-[10px]">{r.sequence}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</p>
                  <p className="text-xs line-clamp-2">{r.result.location}</p>
                  <div className="flex gap-2 pt-2">
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="flex-1"><FileText className="h-3.5 w-3.5 mr-1" />View</Button>
                    </DialogTrigger>
                    <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{r.result.classification} — {new Date(r.createdAt).toLocaleString()}</DialogTitle></DialogHeader>
                <ReportDetail r={r} />
              </DialogContent>
            </Dialog>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportDetail({ r }: { r: SavedReport }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <img src={r.imageDataUrl} alt="scan" className="rounded-lg w-full" />
        <div className="space-y-3 text-sm">
          <Row label="Sequence" value={r.sequence} />
          <Row label="Classification" value={r.result.classification} />
          <Row label="Confidence" value={`${r.result.confidence}%`} />
          <Row label="Severity" value={r.result.severity} />
          <Row label="Location" value={r.result.location} />
          <Row label="Size" value={r.result.size_estimate} />
        </div>
      </div>
      <div>
        <h4 className="text-sm font-semibold mb-2">Key Findings</h4>
        <ul className="space-y-1 text-sm">
          {r.result.key_findings.map((f, i) => <li key={i}>▸ {f}</li>)}
        </ul>
      </div>
      <div>
        <h4 className="text-sm font-semibold mb-2">Recommendation</h4>
        <p className="text-sm">{r.result.recommendation}</p>
      </div>
      {r.notes && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Clinician Notes</h4>
          <p className="text-sm text-muted-foreground">{r.notes}</p>
        </div>
      )}
      <p className="text-xs italic text-muted-foreground border-t border-border/60 pt-3">{r.result.disclaimer}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border/40 pb-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
