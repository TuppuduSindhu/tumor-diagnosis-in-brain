import { createFileRoute } from "@tanstack/react-router";
import { Brain, Microscope, ShieldCheck, Zap, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — NeuroVision AI" },
      { name: "description", content: "About the NeuroVision AI brain tumor analysis platform." },
    ],
  }),
  component: AboutPage,
});

const features = [
  { icon: Brain, title: "Multi-class Classification", desc: "Glioma, Meningioma, Pituitary Adenoma, Normal." },
  { icon: Microscope, title: "Attention Localization", desc: "Bounding-box overlay showing AI regions of interest." },
  { icon: Zap, title: "Real-time Analysis", desc: "Sub-second to few-second response via Lovable AI Gateway." },
  { icon: ShieldCheck, title: "Local Reports", desc: "All reports stored in your browser — nothing leaves your device unless analyzing." },
];

const team = [
  { name: "Akhil Chandra Tammisetti", role: "Lead AI Engineer & Architecture" },
  { name: "Bhanu Vardhan Medapalli", role: "Deep Learning Research & Optimization" },
  { name: "Sri Lavanya Tamatapu", role: "Computer Vision & Interface Design" },
  { name: "Sindhu Tuppdu", role: "Medical AI Research & Data Science" },
];

function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl p-6 space-y-8">
      <header className="text-center space-y-3">
        <Badge className="bg-primary/10 text-primary border-primary/30">TumorTrackers Research Group</Badge>
        <h1 className="text-4xl font-bold">About <span className="text-gradient-neural">NeuroVision AI</span></h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          A research-grade platform for automated brain tumor detection and classification powered by multimodal AI.
        </p>
      </header>

      <Card className="glass border-warning/40">
        <CardContent className="p-5 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-warning">Research use only</p>
            <p className="text-muted-foreground mt-1">
              NeuroVision AI is intended for education and research. It is <strong>not</strong> FDA-approved and must not be used for clinical diagnosis or treatment decisions.
            </p>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2">
        {features.map(f => (
          <Card key={f.title} className="glass">
            <CardContent className="p-5 flex gap-4">
              <div className="h-10 w-10 rounded-lg bg-gradient-neural shadow-glow flex items-center justify-center shrink-0">
                <f.icon className="h-5 w-5 text-neural-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="glass">
        <CardHeader><CardTitle>Team</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {team.map(m => (
            <div key={m.name} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
              <div className="h-10 w-10 rounded-full bg-gradient-neural flex items-center justify-center text-neural-foreground font-semibold">
                {m.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
              </div>
              <div>
                <div className="text-sm font-medium">{m.name}</div>
                <div className="text-xs text-muted-foreground">{m.role}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
