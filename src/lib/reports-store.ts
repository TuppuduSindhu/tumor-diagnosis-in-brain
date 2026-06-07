export type TumorClass = "Glioma" | "Meningioma" | "Pituitary Adenoma" | "Normal" | "Inconclusive";

export interface AnalysisResult {
  classification: TumorClass;
  confidence: number;
  severity: "None" | "Low" | "Moderate" | "High";
  location: string;
  size_estimate: string;
  key_findings: string[];
  differential: { label: string; probability: number }[];
  recommendation: string;
  attention_regions: { x: number; y: number; w: number; h: number; label: string }[];
  disclaimer: string;
}

export interface SavedReport {
  id: string;
  createdAt: string;
  sequence: string;
  notes: string;
  imageDataUrl: string;
  result: AnalysisResult;
}

const KEY = "neurovision_reports_v1";

export function getReports(): SavedReport[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveReport(r: SavedReport) {
  const all = getReports();
  all.unshift(r);
  // cap to 50 to avoid storage bloat
  localStorage.setItem(KEY, JSON.stringify(all.slice(0, 50)));
}

export function deleteReport(id: string) {
  const all = getReports().filter((r) => r.id !== id);
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function clearReports() {
  localStorage.removeItem(KEY);
}
