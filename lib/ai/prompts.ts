// lib/ai/prompts.ts
export const AI_PROMPTS = {
  websiteAnalysis: `You are a professional web design consultant. Analyze this website screenshot and provide a detailed evaluation.

Rate the website on these criteria (1-10):
- Visual appeal and modern design
- User experience and navigation
- Mobile responsiveness
- Color scheme and typography
- Trust signals and professionalism
- Call-to-action clarity
- Loading speed perception
- Content organization

Return a JSON object with:
- designScore: number (overall score 1-10)
- issues: array of specific problems found (max 5)
- suggestions: array of actionable improvements (max 5)

Be specific and constructive in your feedback.`,

  emailGeneration: (lead: any, issues: string[]) => `Write a short, personalized cold email for a ${lead.niche} business.
Website: ${lead.website}
Issues found: ${issues.join(', ')}

The email should:
- Be under 100 words
- Be friendly and professional
- Mention one specific issue you noticed
- Offer a solution
- Include a soft call-to-action

Return only the email body, no subject line.`,

  leadScoring: (lead: any) => `Analyze this lead data and provide a score and recommendations:
Business: ${lead.name}
Niche: ${lead.niche}
Location: ${lead.location}
SEO Status: ${lead.analysis?.hasSEO ? 'Good' : 'Poor'}
Speed Score: ${lead.analysis?.speedScore}/100
CMS: ${lead.analysis?.cms}
Design Score: ${lead.ai?.designScore}/10
Issues: ${lead.ai?.issues?.join(', ')}

Return a JSON with:
- score: number (0-100)
- quality: "cold" | "warm" | "hot"
- reasons: array of main scoring factors
- recommendedAction: string`
};