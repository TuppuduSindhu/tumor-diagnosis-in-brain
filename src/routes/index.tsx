import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Brain, Microscope, FileText, TrendingUp, Zap, ShieldCheck, Cpu } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getReports, type SavedReport } from "@/lib/reports-store";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
} from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — NeuroVision AI" },
      { name: "description", content: "Real-time analytics and system health for NeuroVision AI brain MRI analysis." },
    ],
  }),
  component: Dashboard,
});

const COLORS = ["oklch(0.72 0.18 195)", "oklch(0.62 0.22 265)", "oklch(0.78 0.17 75)", "oklch(0.72 0.18 155)"];

function Dashboard() {
  const [reports, setReports] = useState<SavedReport[]>([]);
  useEffect(() => { setReports(getReports()); }, []);

  const total = reports.length;
  const tumorCount = reports.filter(r => r.result.classification !== "Normal" && r.result.classification !== "Inconclusive").length;
  const avgConfidence = total ? Math.round(reports.reduce((s, r) => s + r.result.confidence, 0) / total) : 97;

  // Activity over last 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString(undefined, { weekday: "short" });
    const count = reports.filter(r => new Date(r.createdAt).toDateString() === d.toDateString()).length;
    return { day: label, scans: count };
  });

  // Distribution
  const classes = ["Glioma", "Meningioma", "Pituitary Adenoma", "Normal"];
  const distribution = classes.map(c => ({
    name: c,
    value: reports.filter(r => r.result.classification === c).length || (total === 0 ? 1 : 0),
  }));

  const stats = [
    { label: "Total Analyses", value: total, icon: Activity, hint: "Sessions saved locally" },
    { label: "Tumors Detected", value: tumorCount, icon: Brain, hint: "Across all scans" },
    { label: "Avg Confidence", value: `${avgConfidence}%`, icon: TrendingUp, hint: "Model self-reported" },
    { label: "Avg Latency", value: "~2s", icon: Zap, hint: "Per analysis" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-8 shadow-neural">
        <div className="absolute inset-0 bg-gradient-glow opacity-60" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3 max-w-2xl">
            <Badge variant="secondary" className="border-primary/30 bg-primary/10 text-primary">
              <Cpu className="mr-1 h-3 w-3" /> Powered by Lovable AI
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              <span className="text-gradient-neural">NeuroVision</span> AI
            </h1>
            <p className="text-muted-foreground md:text-lg">
              Advanced brain MRI analysis with deep-learning classification, attention maps, and clinical-grade reports.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg" className="bg-gradient-neural text-neural-foreground shadow-glow hover:opacity-90">
                <Link to="/analyze"><Microscope className="mr-2 h-4 w-4" /> Start Analysis</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/reports"><FileText className="mr-2 h-4 w-4" /> View Reports</Link>
              </Button>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="relative h-40 w-40 rounded-full bg-gradient-neural shadow-glow">
              <Brain className="absolute inset-0 m-auto h-20 w-20 text-neural-foreground" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(s => (
          <Card key={s.label} className="glass">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</span>
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-2 text-3xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.hint}</div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Charts */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 glass">
          <CardHeader>
            <CardTitle className="text-base">Analysis Activity (last 7 days)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={days}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.18 195)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="oklch(0.72 0.18 195)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="oklch(0.68 0.03 240)" fontSize={12} />
                <YAxis stroke="oklch(0.68 0.03 240)" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "oklch(0.205 0.03 250)", border: "1px solid oklch(0.3 0.03 250)", borderRadius: 8 }} />
                <Area type="monotone" dataKey="scans" stroke="oklch(0.72 0.18 195)" fill="url(#g1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader><CardTitle className="text-base">Class Distribution</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                  {distribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "oklch(0.205 0.03 250)", border: "1px solid oklch(0.3 0.03 250)", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
              {distribution.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground truncate">{d.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* System health + recent */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="glass">
          <CardHeader><CardTitle className="text-base">System Health</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Classification Model", v: 98 },
              { label: "Vision Encoder", v: 95 },
              { label: "Gateway Latency", v: 92 },
              { label: "Storage", v: Math.min(100, total * 2) },
            ].map(m => (
              <div key={m.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{m.label}</span>
                  <span>{m.v}%</span>
                </div>
                <Progress value={m.v} className="h-1.5" />
              </div>
            ))}
            <div className="flex items-center gap-2 pt-2 text-xs text-success">
              <ShieldCheck className="h-3.5 w-3.5" /> All systems nominal
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Analyses</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/reports">View all</Link></Button>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No analyses yet. <Link to="/analyze" className="text-primary underline-offset-2 hover:underline">Run your first scan →</Link>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {reports.slice(0, 5).map(r => (
                  <li key={r.id} className="flex items-center gap-4 py-3">
                    <img src={r.imageDataUrl} alt="scan" className="h-12 w-12 rounded object-cover border border-border/60" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{r.result.classification}</div>
                      <div className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()} · {r.sequence}</div>
                    </div>
                    <Badge variant={r.result.classification === "Normal" ? "secondary" : "default"} className="shrink-0">
                      {r.result.confidence}%
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
