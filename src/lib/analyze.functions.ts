import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const AnalyzeInput = z.object({
  imageDataUrl: z.string().min(20),
  sequence: z.string().optional(),
  notes: z.string().optional(),
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
    const model = gateway("google/gemini-3-flash-preview");

    const systemPrompt = `You are NeuroVision AI, a research-grade brain MRI analysis assistant.
You are NOT a doctor and your output must not be used for clinical diagnosis.
Analyze the provided MRI image and return a structured JSON assessment.
- classification: one of Glioma, Meningioma, Pituitary Adenoma, Normal, Inconclusive
- confidence: 0-100 (your subjective confidence)
- severity: None | Low | Moderate | High
- location: anatomical region (e.g. "Left temporal lobe")
- size_estimate: e.g. "~2.4cm" or "N/A"
- key_findings: 3-5 short bullet observations
- differential: probability list (0-100) across all 4 tumor classes + Normal, summing roughly to 100
- recommendation: short next-step suggestion
- attention_regions: 1-3 bounding boxes as percentages of image (x,y top-left, w,h). If Normal, return [].
- disclaimer: short reminder this is research-only.
If the image is clearly not a brain MRI, set classification to "Inconclusive" and explain in key_findings.`;

    try {
      const { experimental_output } = await generateText({
        model,
        experimental_output: Output.object({ schema: ResultSchema }),
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this MRI scan. Sequence: ${data.sequence ?? "unspecified"}. ${
                  data.notes ? "Clinician notes: " + data.notes : ""
                }`,
              },
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
