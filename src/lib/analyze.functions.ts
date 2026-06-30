import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const AnalyzeInput = z.object({
  imageDataUrl: z.string().min(20),
});

const ResultSchema = z.object({
  classification: z.enum(["Glioma", "Meningioma", "Pituitary Adenoma", "Normal", "Inconclusive"]),
  confidence: z.number().min(0).max(100),
  severity: z.enum(["None", "Low", "Moderate", "High"]),
  location: z.string(),
  size_estimate: z.string(),
  key_findings: z.array(z.string()),
  differential: z.array(z.object({ label: z.string(), probability: z.number() })),
  recommendation: z.string(),
  attention_regions: z.array(
    z.object({
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
      w: z.number().min(0).max(100),
      h: z.number().min(0).max(100),
      label: z.string(),
    })
  ),
  disclaimer: z.string(),
});

export const analyzeMri = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-pro-preview");

    const systemPrompt = `You are NeuroVision AI, an expert neuroradiology vision assistant for brain MRI tumor classification.

Classify the MRI into EXACTLY ONE of: "Glioma", "Meningioma", "Pituitary Adenoma", "Normal", "Inconclusive".

Guidance:
- Glioma: irregular intra-axial mass in brain parenchyma (often frontal/temporal), heterogeneous, edema.
- Meningioma: well-circumscribed extra-axial dural-based mass, often with dural tail.
- Pituitary Adenoma: mass in sella turcica / pituitary fossa, midline base of brain.
- Normal: no visible mass, symmetric anatomy.
- Inconclusive: not a brain MRI or too unclear.

Rules:
- If a mass is visible, pick the most likely tumor type — do NOT default to Normal/Inconclusive.
- Confidence: 60-95 if clearly visible, 40-60 uncertain.
- differential: probabilities (0-100) for all 5 classes, summing ~100, chosen class highest.
- attention_regions: 1-3 boxes as % of image (x,y top-left, w,h). Empty [] if Normal.
- Output STRICT JSON only, no markdown, no commentary. Match this exact shape:

{
  "classification": "Glioma|Meningioma|Pituitary Adenoma|Normal|Inconclusive",
  "confidence": 0-100,
  "severity": "None|Low|Moderate|High",
  "location": "string",
  "size_estimate": "string",
  "key_findings": ["string", ...],
  "differential": [{"label":"Glioma","probability":0-100}, ...5 entries],
  "recommendation": "string",
  "attention_regions": [{"x":0-100,"y":0-100,"w":0-100,"h":0-100,"label":"string"}],
  "disclaimer": "Research/educational use only — not a clinical diagnosis."
}`;

    try {
      const { text } = await generateText({
        model,
        maxOutputTokens: 4096,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Classify this brain MRI scan. Return strict JSON only." },
              { type: "image", image: data.imageDataUrl },
            ],
          },
        ],
      });

      // Extract JSON from response (handle code fences if present)
      let jsonStr = text.trim();
      const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) jsonStr = fenceMatch[1].trim();
      const firstBrace = jsonStr.indexOf("{");
      const lastBrace = jsonStr.lastIndexOf("}");
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        return { ok: false as const, error: "Model returned non-JSON. Try again with a clearer MRI image." };
      }

      const validated = ResultSchema.safeParse(parsed);
      if (!validated.success) {
        return { ok: false as const, error: "Model output did not match expected schema. Try again." };
      }

      return { ok: true as const, result: validated.data };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("429")) {
        return { ok: false as const, error: "Rate limit reached. Please try again in a moment." };
      }
      if (msg.includes("402")) {
        return { ok: false as const, error: "AI credits exhausted. Please add credits to continue." };
      }
      return { ok: false as const, error: msg };
    }
  });

