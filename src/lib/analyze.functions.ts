import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
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

    const systemPrompt = `You are NeuroVision AI, an expert neuroradiology vision assistant specializing in brain MRI tumor classification.

Your task: Look at the provided brain MRI image and classify it into EXACTLY ONE of these categories:
1. "Glioma" — irregular, infiltrative mass usually in cerebral hemispheres (often temporal/frontal lobe), heterogeneous signal, surrounding edema, may show necrosis. Most common in white matter.
2. "Meningioma" — well-circumscribed, extra-axial mass attached to dura/meninges, often along falx, convexity, or skull base. Homogeneous, often with dural tail.
3. "Pituitary Adenoma" — mass arising from the sella turcica (pituitary fossa) at the base of the brain, midline, may extend suprasellar.
4. "Normal" — no tumor, mass, or abnormal lesion visible. Symmetric ventricles, no midline shift, no abnormal signal.
5. "Inconclusive" — image is not a brain MRI, too low quality, or features don't match any category clearly.

CLASSIFICATION RULES (follow strictly):
- Examine the image carefully BEFORE deciding. Look at location, shape, borders, and signal characteristics.
- Location is the strongest clue: sellar = pituitary, dural-based = meningioma, intra-axial parenchymal = glioma.
- Do NOT default to "Normal" or "Inconclusive" if a mass is visible. Pick the most likely tumor type.
- Do NOT default to "Glioma". Only choose it if the mass is clearly intra-axial in brain parenchyma.
- If you see a clear mass but cannot decide between types, pick the most probable one and lower confidence.
- "Normal" requires NO visible mass, NO asymmetry, NO abnormal bright/dark regions beyond normal anatomy.

OUTPUT (return JSON matching the schema):
- classification: your single best answer
- confidence: 60-95 if clearly visible, 40-60 if uncertain, below 40 if very unsure
- severity: None (normal), Low (small/incidental), Moderate (significant mass), High (large/with mass effect)
- location: specific anatomical region (e.g. "Right frontal lobe", "Sella turcica", "Left cerebellopontine angle")
- size_estimate: approximate diameter (e.g. "~2.5 cm") or "N/A" if normal
- key_findings: 3-5 short observations (what you actually see — signal, edema, mass effect, midline shift, etc.)
- differential: probability (0-100) for ALL 5 classes (Glioma, Meningioma, Pituitary Adenoma, Normal, Inconclusive). Sum ≈ 100. The chosen class should have the highest value.
- recommendation: short next-step (e.g. "Neurosurgical consultation and contrast-enhanced MRI")
- attention_regions: 1-3 bounding boxes around the lesion as percentages of image width/height (x,y = top-left corner). If Normal, return [].
- disclaimer: "Research/educational use only — not a clinical diagnosis."

If the image is clearly not a brain MRI (photo, document, non-brain scan), set classification to "Inconclusive" and explain in key_findings.`;

    try {
      const { experimental_output } = await generateText({
        model,
        experimental_output: Output.object({ schema: ResultSchema }),
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Classify this brain MRI scan. Examine it carefully and identify the tumor type (or Normal)." },
              { type: "image", image: data.imageDataUrl },
            ],
          },
        ],
      });

      return { ok: true as const, result: experimental_output };
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
