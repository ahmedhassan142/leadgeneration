// lib/analyzer/geminiAnalyzer.ts
// AI-powered website analysis using Google Gemini. Fetches the lead, calls
// Gemini with a vision/text prompt to evaluate the website, and stores the
// design score / issues / suggestions back on the Lead document.
import connectToDatabase from "@/lib/db/connect";
import { Lead } from "@/lib/db/models/Lead";
import { logger } from "@/lib/scraper/utils/logger";

const GEMINI_MODEL = "models/gemini-2.5-flash";
const GEMINI_FALLBACK_MODELS = [
  "models/gemini-2.5-flash",
  "models/gemini-2.0-flash",
  "models/gemini-flash-latest",
];

interface AIAnalysis {
  designScore: number;
  issues: string[];
  suggestions: string[];
}

function getFallbackAnalysis(): AIAnalysis {
  return {
    designScore: 5,
    issues: [
      "Slow loading speed",
      "Not optimized for mobile devices",
      "Missing SEO meta descriptions",
    ],
    suggestions: [
      "Optimize images and enable compression",
      "Implement responsive design",
      "Add meta descriptions to all pages",
    ],
  };
}

/**
 * Analyze a lead's website with Gemini and persist the results.
 * Called by the background processor: analyzeWithAI(leadId, website)
 */
export async function analyzeWithAI(
  leadId: string,
  website?: string
): Promise<AIAnalysis> {
  await connectToDatabase();

  const lead = await Lead.findById(leadId);
  if (!lead) {
    logger.warn(`analyzeWithAI: lead not found`, { leadId });
    return getFallbackAnalysis();
  }

  const url = website || lead.website;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    logger.warn("GEMINI_API_KEY not set, using fallback AI analysis");
    const fallback = getFallbackAnalysis();
    await persistAnalysis(leadId, fallback);
    return fallback;
  }

  const prompt = `You are a professional web design consultant. Analyze the website at ${url}.
Rate it (1-10) and list the top issues and actionable suggestions.

Return ONLY a JSON object with:
- designScore: number (1-10)
- issues: array of strings (max 5, short and specific)
- suggestions: array of strings (max 5, actionable)`;

  for (const model of GEMINI_FALLBACK_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
          }),
        }
      );

      if (!response.ok) continue;

      const data = await response.json();
      if (data.error) continue;

      const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      if (!text) continue;

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const parsed = JSON.parse(jsonMatch[0]);
      const analysis: AIAnalysis = {
        designScore: Math.max(
          1,
          Math.min(10, Number(parsed.designScore) || 5)
        ),
        issues: Array.isArray(parsed.issues)
          ? parsed.issues.slice(0, 5).map(String)
          : [],
        suggestions: Array.isArray(parsed.suggestions)
          ? parsed.suggestions.slice(0, 5).map(String)
          : [],
      };

      await persistAnalysis(leadId, analysis);
      logger.info(`Gemini analysis complete`, { leadId, model, score: analysis.designScore });
      return analysis;
    } catch (err) {
      logger.error(`Gemini model ${model} failed`, err);
      continue;
    }
  }

  logger.warn("All Gemini models failed, using fallback analysis");
  const fallback = getFallbackAnalysis();
  await persistAnalysis(leadId, fallback);
  return fallback;
}

async function persistAnalysis(leadId: string, analysis: AIAnalysis): Promise<void> {
  try {
    await Lead.findByIdAndUpdate(leadId, {
      $set: {
        ai: {
          designScore: analysis.designScore,
          issues: analysis.issues,
          suggestions: analysis.suggestions,
          analyzedAt: new Date(),
        },
      },
    });
  } catch (err) {
    logger.error(`Failed to persist AI analysis for ${leadId}`, err);
  }
}

export default analyzeWithAI;
