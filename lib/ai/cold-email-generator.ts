// lib/ai/cold-email-generator.ts - COMPLETE FINAL FIXED VERSION
import { llamaClient, LlamaModels, ChatMessage } from './llamaClient';
import { logger } from '@/lib/scraper/utils/logger';

interface ColdEmailParams {
  lead?: any;
  companyName?: string;
  website?: string;
  source?: string;
  score?: number;
  leadId?: string;
  recipientName?: string;
  recipientRole?: string;
  emailType: 'first' | 'followup' | 'followup-2' | 'final';
  previousInteractions?: string;
  sequence?: string;
  metadata?: any;
}

interface GeneratedEmail {
  subject: string;
  text: string;
  html: string;
  model: string;
  tokens?: number;
  emailType: string;
  provider?: string;
}

const SENDER_NAME = "Ahmed Hassan";
const SENDER_TITLE = "Founder";

function formatWebsiteAnalysis(lead: any): string {
  const sections = [];
  const loadTime = lead?.analysis?.loadTime;
  const mobileFriendly = lead?.analysis?.mobileFriendly;
  const hasSEO = lead?.analysis?.hasSEO;
  const issues = lead?.ai?.issues || [];
  const leadScoreReasons = lead?.leadScoreReason || [];
  
  if (loadTime) {
    sections.push(`Load Time: ${loadTime}s → ${Math.min(Math.round(loadTime * 7), 35)}% conversion loss`);
  }
  if (mobileFriendly === false) {
    sections.push(`Mobile: Not responsive → 60% traffic loss`);
  }
  if (!hasSEO) {
    sections.push(`SEO: Missing meta descriptions → 30% lower CTR`);
  }
  if (issues.length > 0) {
    sections.push(`Issues: ${issues.slice(0, 3).join(', ')}`);
  }
  if (leadScoreReasons.length > 0) {
    sections.push(`Key Concerns: ${leadScoreReasons.slice(0, 2).join(', ')}`);
  }
  
  return sections.join('\n');
}

function formatProfessionalEmail(text: string, recipientName: string, emailType: string): string {
  let formatted = text;
  
  // Remove any timestamp or time patterns
  formatted = formatted.replace(/\b\d{1,2}:\d{2}:\d{2}\s*[AP]M\b,?\s*/gi, '');
  formatted = formatted.replace(/\b\d{1,2}:\d{2}:\d{2}\s*[AP]M\b/gi, '');
  formatted = formatted.replace(/^\d+:\d+:\d+\s+[AP]M,\s*/i, '');
  formatted = formatted.replace(/^\d+:\d+:\d+\s+[AP]M\s*/i, '');
  
  // Ensure proper greeting
  const greetingName = (recipientName && recipientName !== 'there' && recipientName !== 'Cold Lead' && !recipientName.includes('Cold Lead')) 
    ? recipientName 
    : '';
  
  if (!formatted.match(/^Hi\s+/i) && !formatted.match(/^Hello\s+/i)) {
    if (greetingName) {
      formatted = `Hi ${greetingName},\n\n${formatted}`;
    } else {
      formatted = `Hi there,\n\n${formatted}`;
    }
  }
  
  const sentences = formatted.split(/(?<=[.!?])\s+(?=[A-Z])/);
  const paragraphs = [];
  let currentPara = [];
  
  for (let i = 0; i < sentences.length; i++) {
    let sentence = sentences[i].trim();
    if (!sentence) continue;
    
    if (sentence.match(/^[•\-*]\s/) || sentence.match(/^\d+\./)) {
      if (currentPara.length > 0) {
        paragraphs.push(currentPara.join(' '));
        currentPara = [];
      }
      paragraphs.push(sentence);
      continue;
    }
    
    currentPara.push(sentence);
    
    if (currentPara.length >= 2 || i === sentences.length - 1) {
      paragraphs.push(currentPara.join(' '));
      currentPara = [];
    }
  }
  
  let result = [];
  for (let i = 0; i < paragraphs.length; i++) {
    let para = paragraphs[i];
    
    if (para.includes('•') || para.includes('-') || para.includes('*')) {
      const lines = para.split('\n');
      const bulletItems = lines.filter(l => l.match(/^[•\-*]\s/));
      const introText = lines.filter(l => !l.match(/^[•\-*]\s/)).join(' ');
      
      if (introText.trim()) {
        result.push(introText.trim());
      }
      
      for (let item of bulletItems) {
        const cleanItem = item.replace(/^[•\-*]\s*/, '');
        result.push(`• ${cleanItem}`);
      }
    }
    else if (para.match(/\d+\./)) {
      const lines = para.split('\n');
      const numberedItems = lines.filter(l => l.match(/^\d+\./));
      const introText = lines.filter(l => !l.match(/^\d+\./)).join(' ');
      
      if (introText.trim()) {
        result.push(introText.trim());
      }
      
      for (let item of numberedItems) {
        result.push(item.trim());
      }
    }
    else {
      result.push(para);
    }
  }
  
  formatted = result.join('\n\n');
  
  // CRITICAL FIX: Handle closing format - "Best regards," on one line, "Ahmed Hassan" on next line
  // First, remove any duplicate Ahmed Hassan
  formatted = formatted.replace(/Ahmed Hassan\s+Ahmed Hassan/gi, 'Ahmed Hassan');
  
  // Fix various malformed closing patterns - THIS IS THE KEY FIX
  // Convert "Best regards, Ahmed Hassan" (same line) to "Best regards,\nAhmed Hassan" (two lines)
  formatted = formatted.replace(/Best regards,\s*Ahmed Hassan/gi, 'Best regards,\nAhmed Hassan');
  formatted = formatted.replace(/Best regards\s+Ahmed Hassan/gi, 'Best regards,\nAhmed Hassan');
  formatted = formatted.replace(/Best,\s*Ahmed Hassan/gi, 'Best regards,\nAhmed Hassan');
  formatted = formatted.replace(/Best regards,\s*\n\s*Ahmed Hassan/gi, 'Best regards,\nAhmed Hassan');
  
  // Remove any trailing "Best regards," without content or with extra name
  if (formatted.match(/Best regards,\s*Ahmed Hassan\s*$/)) {
    formatted = formatted.replace(/Best regards,\s*Ahmed Hassan\s*$/, 'Best regards,\nAhmed Hassan');
  }
  
  // Add proper closing if missing
  if (!formatted.includes('Best regards')) {
    formatted = formatted.replace(/\s*$/, '\n\nBest regards,\n' + SENDER_NAME);
  }
  
  // Ensure there's exactly one blank line before Best regards
  if (!formatted.match(/\n\nBest regards/)) {
    formatted = formatted.replace(/Best regards/, '\n\nBest regards');
  }
  
  // Final cleanup - ensure the closing is exactly:
  // Best regards,
  // Ahmed Hassan
  formatted = formatted.replace(/Best regards,\s*\n+\s*Ahmed Hassan/g, 'Best regards,\nAhmed Hassan');
  formatted = formatted.replace(/Best regards,\s*Ahmed Hassan\n?/g, 'Best regards,\nAhmed Hassan\n');
  
  // Remove any duplicate Best regards
  formatted = formatted.replace(/Best regards,\s*\n\s*Best regards,/g, 'Best regards,');
  
  // Ensure Ahmed Hassan is not duplicated
  formatted = formatted.replace(/(Ahmed Hassan)\s+\1/g, '$1');
  
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  formatted = formatted.replace(/business\.com,?\s*/i, '');
  
  return formatted.trim();
}

function generateProfessionalHtml(text: string): string {
  const paragraphs = text.split(/\n\n+/);
  const htmlParts = [];
  
  for (let p of paragraphs) {
    p = p.trim();
    if (!p) continue;
    
    if (p.match(/^Hi\s+\w+,?$/i)) {
      htmlParts.push(`<p style="margin: 0 0 1.2em 0; line-height: 1.6; text-align: left;">${p}</p>`);
      continue;
    }
    
    if (p.includes('•')) {
      const lines = p.split('\n');
      const bulletItems = lines.filter(l => l.includes('•'));
      const intro = lines.filter(l => !l.includes('•')).join(' ');
      
      if (intro.trim()) {
        htmlParts.push(`<p style="margin: 0 0 1.2em 0; line-height: 1.6; text-align: left;">${intro}</p>`);
      }
      
      htmlParts.push(`<ul style="margin: 0 0 1.2em 0; padding-left: 2em; text-align: left;">`);
      for (let item of bulletItems) {
        const clean = item.replace(/[•\-*]\s*/, '');
        htmlParts.push(`<li style="margin-bottom: 0.5em; line-height: 1.6; text-align: left;">${clean}</li>`);
      }
      htmlParts.push(`</ul>`);
      continue;
    }
    
    if (p.match(/^\d+\./m)) {
      const lines = p.split('\n');
      const numberedItems = lines.filter(l => l.match(/^\d+\./));
      const intro = lines.filter(l => !l.match(/^\d+\./)).join(' ');
      
      if (intro.trim()) {
        htmlParts.push(`<p style="margin: 0 0 1.2em 0; line-height: 1.6; text-align: left;">${intro}</p>`);
      }
      
      htmlParts.push(`<ol style="margin: 0 0 1.2em 0; padding-left: 2em; text-align: left;">`);
      for (let item of numberedItems) {
        const clean = item.replace(/^\d+\.\s*/, '');
        htmlParts.push(`<li style="margin-bottom: 0.5em; line-height: 1.6; text-align: left;">${clean}</li>`);
      }
      htmlParts.push(`</ol>`);
      continue;
    }
    
    htmlParts.push(`<p style="margin: 0 0 1.2em 0; line-height: 1.6; text-align: left;">${p}</p>`);
  }
  
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; color: #1a1a1a; background: #ffffff; padding: 20px; text-align: left;">
    ${htmlParts.join('')}
  </div>`;
}

export async function generateColdEmail(
  params: ColdEmailParams
): Promise<GeneratedEmail> {
  const lead = params.lead;
  const companyName = lead?.name || params.companyName || 'your business';
  const website = lead?.website || params.website;
  const score = lead?.score || params.score || 0;
  // Don't use 'Cold Lead' as a name - use 'there' for unknown
  let recipientName = lead?.name || params.recipientName || 'there';
  // Skip if recipientName is generic like 'Cold Lead'
  if (recipientName === 'Cold Lead' || recipientName.includes('Cold Lead')) {
    recipientName = 'there';
  }
  const emailType = params.emailType;
  
  const loadTime = lead?.analysis?.loadTime;
  const conversionLoss = loadTime ? Math.min(Math.round(loadTime * 7), 35) : 20;
  const mobileFriendly = lead?.analysis?.mobileFriendly;
  const hasSEO = lead?.analysis?.hasSEO;
  const issues = lead?.ai?.issues || [];
  const suggestions = lead?.ai?.suggestions || [];
  const leadScoreReasons = lead?.leadScoreReason || [];
  
  const issuesList = issues.length > 0 ? issues.slice(0, 3) : [
    'Poor website performance',
    'Not optimized for mobile devices',
    'Missing SEO optimization'
  ];
  
  const mainIssue = issues.length > 0 ? issues[0] : 'website performance issues';
  const firstSuggestion = suggestions.length > 0 ? suggestions[0] : 'optimizing your website';

  let systemPrompt = '';
  let userPrompt = '';

  if (emailType === 'first') {
    systemPrompt = `You are Ahmed Hassan, a professional web consultant. Write a detailed, professional first email for COLD leads. Use the actual data provided. Be specific with numbers. Length: 200-250 words.

IMPORTANT RULES:
- NEVER include timestamps or times like "11:06:26 AM" in the email
- NEVER use "Cold Lead" as a name - use "there" if name is not available
- The greeting should be "Hi there," if name is unknown
- The closing MUST be EXACTLY in this format (two separate lines, no extra spaces):
  
  Best regards,
  Ahmed Hassan

- Do NOT write "Best regards, Ahmed Hassan" on the same line
- Do NOT write "Ahmed Hassan" twice
- Always put "Ahmed Hassan" on the NEXT line after "Best regards,"
- The closing should look EXACTLY like this:
  Best regards,
  Ahmed Hassan`;
    
    userPrompt = `Write a first contact email about ${companyName}.

Website: ${website}
Score: ${score}/100 (Needs improvement)
Load Time: ${loadTime ? `${loadTime}s → ${conversionLoss}% conversion loss` : 'Slow loading speed'}
Mobile: ${mobileFriendly === false ? 'Not responsive → losing 60% of mobile traffic' : 'Needs improvement'}
SEO: ${!hasSEO ? 'Missing meta descriptions → 30% lower CTR' : 'Needs optimization'}

Critical Issues from data:
${issuesList.map((issue:any, i:any) => `${i+1}. ${issue}`).join('\n')}

Suggestions:
${suggestions.slice(0, 3).map((s:any) => `• ${s}`).join('\n')}

Email structure:
1. Greeting: "Hi there,"
2. Mention you reviewed their website and found critical issues
3. List 2-3 specific issues with bullet points (•) and impact numbers
4. Explain why this matters for their business
5. Offer a free audit to help fix these issues
6. Closing MUST be EXACTLY (on two separate lines):
   Best regards,
   Ahmed Hassan

Use \\n\\n between sections. DO NOT include any timestamps.
IMPORTANT: Write "Best regards," then a newline, then "Ahmed Hassan" - NEVER on the same line.

Return JSON with subject and text.`;
  }
  else if (emailType === 'followup') {
    systemPrompt = `You are Ahmed Hassan. Write a follow-up that adds new value. Use the actual data. Be helpful and specific. Length: 150-180 words.

IMPORTANT RULES:
- NEVER include timestamps or times in the email
- Use "Hi there," if name is unknown
- The closing MUST be EXACTLY (on two separate lines):
  Best regards,
  Ahmed Hassan
- Do NOT write "Best regards, Ahmed Hassan" on the same line
- Do NOT write "Ahmed Hassan" twice
- The closing should look EXACTLY like this:
  Best regards,
  Ahmed Hassan`;
    
    userPrompt = `Write a follow-up email about ${companyName}.

Website: ${website}
Main Issue: ${mainIssue}
Impact: ${conversionLoss}% conversion loss
Quick Fix: ${firstSuggestion}
Additional Issues: ${issues.slice(1, 2).join(', ') || 'website performance'}

Email structure:
1. Greeting: "Hi there,"
2. Reference previous email briefly
3. Focus on ONE specific issue with new insights
4. Share a quick tip they can implement today
5. Offer to help with a free audit
6. Closing EXACTLY (on two separate lines):
   Best regards,
   Ahmed Hassan

Use \\n\\n between sections. DO NOT include any timestamps.
IMPORTANT: Write "Best regards," then a newline, then "Ahmed Hassan" - NEVER on the same line.

Return JSON with subject and text.`;
  }
  else if (emailType === 'followup-2') {
    systemPrompt = `You are Ahmed Hassan. Write an educational follow-up sharing a useful resource. Be genuinely helpful. Length: 120-150 words.

IMPORTANT RULES:
- NEVER include timestamps or times in the email
- Use "Hi there," if name is unknown
- The closing MUST be EXACTLY (on two separate lines):
  Best regards,
  Ahmed Hassan
- Do NOT write "Best regards, Ahmed Hassan" on the same line
- Do NOT write "Ahmed Hassan" twice
- The closing should look EXACTLY like this:
  Best regards,
  Ahmed Hassan`;
    
    userPrompt = `Write a second follow-up email about ${companyName}.

Website: ${website}
Issue: ${mainIssue}
Impact: ${conversionLoss}% conversion loss
Tool: ${mobileFriendly === false ? 'Google Mobile-Friendly Test' : 'Google PageSpeed Insights'}

Email structure:
1. Greeting: "Hi there,"
2. Acknowledge following up
3. Share a specific tool based on their issue:
   • Step 1: Go to [tool name]
   • Step 2: Enter your website URL
   • Step 3: Review the recommendations
4. Offer to help interpret the results
5. Closing EXACTLY (on two separate lines):
   Best regards,
   Ahmed Hassan

DO NOT include any timestamps.
IMPORTANT: Write "Best regards," then a newline, then "Ahmed Hassan" - NEVER on the same line.

Return JSON with subject and text.`;
  }
  else {
    systemPrompt = `You are Ahmed Hassan. Write a short, respectful final follow-up. No pressure. Length: 80-100 words.

IMPORTANT RULES:
- NEVER include timestamps or times in the email
- Use "Hi there," if name is unknown
- The closing MUST be EXACTLY (on two separate lines):
  Best regards,
  Ahmed Hassan
- Do NOT write "Best regards, Ahmed Hassan" on the same line
- Do NOT write "Ahmed Hassan" twice
- The closing should look EXACTLY like this:
  Best regards,
  Ahmed Hassan`;
    
    userPrompt = `Write a final follow-up email about ${companyName}.

Issue: ${mainIssue}
Impact: ${conversionLoss}% conversion loss

Email structure:
1. Greeting: "Hi there,"
2. Acknowledge this is the last email
3. Briefly mention the main issue (one sentence)
4. Leave door open: "If you ever want to discuss this, feel free to reach out"
5. Closing EXACTLY (on two separate lines):
   Best regards,
   Ahmed Hassan

Keep it warm, short, and professional. DO NOT include any timestamps.
IMPORTANT: Write "Best regards," then a newline, then "Ahmed Hassan" - NEVER on the same line.

Return JSON with subject and text.`;
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  try {
    const response = await llamaClient.chatCompletion(messages, {
      model: LlamaModels.LLAMA_3_3_70B,
      temperature: 0.75,
      maxTokens: emailType === 'first' ? 1100 : emailType === 'final' ? 500 : 800,
      responseFormat: { type: 'json_object' }
    });

    const aiText = response.choices[0].message.content;
    let result: any;
    
    try {
      let clean = aiText.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = JSON.parse(clean);
      }
    } catch (e) {
      throw new Error('Invalid JSON response');
    }
    
    let text = result.text || result.body || '';
    
    const finalText = formatProfessionalEmail(text, recipientName, emailType);
    const html = generateProfessionalHtml(finalText);
    
    let subject = result.subject || '';
    if (!subject) {
      if (emailType === 'first') subject = `Website optimization for ${companyName}`;
      else if (emailType === 'followup') subject = `Following up: ${mainIssue.substring(0, 40)}`;
      else if (emailType === 'followup-2') subject = `Quick resource for your website`;
      else subject = `One last thought`;
    }
    
    return {
      subject: subject,
      text: finalText,
      html: html,
      model: LlamaModels.LLAMA_3_3_70B,
      emailType,
      provider: 'groq'
    };
    
  } catch (error) {
    logger.error(`Failed to generate ${emailType} email:`, error);
    throw new Error(`Email generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}