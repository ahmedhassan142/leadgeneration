// lib/ai/warm-email-generator.ts - COMPLETE UPDATED VERSION
import { llamaClient, LlamaModels, ChatMessage } from './llamaClient';
import { logger } from '@/lib/scraper/utils/logger';

interface WarmEmailParams {
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

function formatWebsiteOpportunities(lead: any): string {
  const sections = [];
  const issues = lead?.ai?.issues || [];
  const suggestions = lead?.ai?.suggestions || [];
  const analysis = lead?.analysis || {};
  const leadScoreReasons = lead?.leadScoreReason || [];
  
  sections.push("✨ GROWTH OPPORTUNITIES");
  
  if (issues.length > 0) {
    issues.forEach((issue:any) => {
      let opportunity = issue
        .replace(/Missing/g, 'Add')
        .replace(/No/g, 'Add')
        .replace(/Poor/g, 'Improve')
        .replace(/Slow/g, 'Optimize');
      
      if (issue.includes('SEO')) {
        opportunity += ' → +30% click-through rate';
      } else if (issue.includes('mobile') || issue.includes('responsive')) {
        opportunity += ' → reach 60% more mobile users';
      } else if (issue.includes('live chat')) {
        opportunity += ' → increase conversions by 20%';
      } else if (issue.includes('booking')) {
        opportunity += ' → capture more leads';
      } else if (issue.includes('speed') || issue.includes('load')) {
        opportunity += ' → +15% more conversions';
      }
      
      sections.push(`• ${opportunity}`);
    });
  }
  
  if (leadScoreReasons.length > 0) {
    leadScoreReasons.forEach((reason:any) => {
      if (!issues.some((i:any) => reason.includes(i))) {
        let opportunity = reason
          .replace(/Missing/g, 'Add')
          .replace(/No/g, 'Add')
          .replace(/Poor/g, 'Improve');
        sections.push(`• ${opportunity}`);
      }
    });
  }
  
  if (suggestions.length > 0 && suggestions.length <= 3) {
    sections.push("\n💡 RECOMMENDATIONS");
    suggestions.forEach((suggestion:any) => {
      sections.push(`• ${suggestion}`);
    });
  }
  
  return sections.join('\n');
}

function formatWarmEmail(text: string, recipientName: string, emailType: string): string {
  let formatted = text;
  
  // Remove any timestamp or time patterns
  formatted = formatted.replace(/\b\d{1,2}:\d{2}:\d{2}\s*[AP]M\b,?\s*/gi, '');
  formatted = formatted.replace(/\b\d{1,2}:\d{2}:\d{2}\s*[AP]M\b/gi, '');
  formatted = formatted.replace(/^\d+:\d+:\d+\s+[AP]M,\s*/i, '');
  formatted = formatted.replace(/^\d+:\d+:\d+\s+[AP]M\s*/i, '');
  
  // Ensure proper greeting - use 'there' if name is generic
  let greetingName = recipientName;
  if (greetingName === 'Cold Lead' || greetingName.includes('Cold Lead') || greetingName === 'Warm Lead' || greetingName.includes('Warm Lead')) {
    greetingName = 'there';
  }
  
  if (!formatted.match(/^Hi\s+/i) && !formatted.match(/^Hello\s+/i)) {
    if (greetingName && greetingName !== 'there') {
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
  
  // Fix the closing format - ensure "Best regards," and "Ahmed Hassan" are on separate lines
  formatted = formatted.replace(/Best regards,\s*Ahmed Hassan/gi, 'Best regards,\nAhmed Hassan');
  formatted = formatted.replace(/Best,\s*Ahmed Hassan/gi, 'Best regards,\nAhmed Hassan');
  formatted = formatted.replace(/Best regards,\s*\n\s*Ahmed Hassan/gi, 'Best regards,\nAhmed Hassan');
  formatted = formatted.replace(/Best regards\s+Ahmed Hassan/gi, 'Best regards,\nAhmed Hassan');
  
  // Remove any duplicate Ahmed Hassan
  formatted = formatted.replace(/Ahmed Hassan\s+Ahmed Hassan/gi, 'Ahmed Hassan');
  
  // Add proper closing if missing
  if (!formatted.includes('Best regards')) {
    formatted = formatted.replace(/\s*$/, '\n\nBest regards,\n' + SENDER_NAME);
  }
  
  // Ensure there's exactly one blank line before Best regards
  if (!formatted.match(/\n\nBest regards/)) {
    formatted = formatted.replace(/Best regards/, '\n\nBest regards');
  }
  
  // Ensure Ahmed Hassan is on its own line after Best regards
  formatted = formatted.replace(/Best regards,\s*\n+\s*Ahmed Hassan/g, 'Best regards,\nAhmed Hassan');
  formatted = formatted.replace(/Best regards,\s*(\w)/g, 'Best regards,\n$1');
  
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  
  return formatted.trim();
}

function generateWarmHtml(text: string): string {
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

export async function generateWarmEmail(
  params: WarmEmailParams
): Promise<GeneratedEmail> {
  const lead = params.lead;
  const companyName = lead?.name || params.companyName || 'your business';
  const website = lead?.website || params.website;
  const score = lead?.score || params.score || 0;
  // Don't use 'Warm Lead' as a name - use 'there' for unknown
  let recipientName = lead?.name || params.recipientName || 'there';
  // Skip if recipientName is generic like 'Warm Lead' or 'Cold Lead'
  if (recipientName === 'Warm Lead' || recipientName.includes('Warm Lead') || 
      recipientName === 'Cold Lead' || recipientName.includes('Cold Lead')) {
    recipientName = 'there';
  }
  const emailType = params.emailType;
  
  const issues = lead?.ai?.issues || [];
  const suggestions = lead?.ai?.suggestions || [];
  const designScore = lead?.ai?.designScore || 0;
  const analysis = lead?.analysis || {};
  const leadScoreReasons = lead?.leadScoreReason || [];
  
  const loadTime = analysis.loadTime;
  const mobileFriendly = analysis.mobileFriendly;
  const hasSEO = analysis.hasSEO;
  const speedScore = analysis.speedScore;
  
  const opportunitiesList = [];
  
  issues.forEach((issue:any) => {
    let opportunity = issue
      .replace(/Missing/g, 'Add')
      .replace(/No/g, 'Add')
      .replace(/Poor/g, 'Improve')
      .replace(/Slow/g, 'Optimize');
    
    if (issue.toLowerCase().includes('seo')) {
      opportunity += ' → +30% click-through rate';
    } else if (issue.toLowerCase().includes('mobile') || issue.toLowerCase().includes('responsive')) {
      opportunity += ' → reach 60% more mobile users';
    } else if (issue.toLowerCase().includes('live chat')) {
      opportunity += ' → increase conversions by 20%';
    } else if (issue.toLowerCase().includes('booking')) {
      opportunity += ' → capture more leads';
    } else if (issue.toLowerCase().includes('speed') || issue.toLowerCase().includes('load')) {
      opportunity += ' → +15% more conversions';
    }
    
    opportunitiesList.push(`• ${opportunity}`);
  });
  
  leadScoreReasons.forEach((reason:any) => {
    if (!issues.some((issue:any) => reason.toLowerCase().includes(issue.toLowerCase()))) {
      let opportunity = reason
        .replace(/Missing/g, 'Add')
        .replace(/No/g, 'Add')
        .replace(/Poor/g, 'Improve');
      
      if (reason.toLowerCase().includes('seo')) {
        opportunity += ' → +30% click-through rate';
      } else if (reason.toLowerCase().includes('mobile')) {
        opportunity += ' → reach 60% more mobile users';
      }
      
      opportunitiesList.push(`• ${opportunity}`);
    }
  });
  
  const opportunities = opportunitiesList.slice(0, 5).join('\n');
  const mainOpportunity = issues.length > 0 ? issues[0].replace(/Missing|No|Poor|Slow/g, '').trim() : 'website optimization';
  const mainSuggestion = suggestions.length > 0 ? suggestions[0] : 'enhancing user experience';

  let systemPrompt = '';
  let userPrompt = '';

  if (emailType === 'first') {
    systemPrompt = `You are Ahmed Hassan, a friendly web consultant. Write a collaborative, value-focused first email for WARM leads (score 40-70). Use the actual data provided. Be positive and helpful. Length: 180-220 words.

IMPORTANT RULES:
- NEVER include timestamps or times in the email
- Use "Hi there," if name is not available
- The closing MUST be EXACTLY (on separate lines):
  Best regards,
  Ahmed Hassan
- Do NOT write "Best regards, Ahmed Hassan" on the same line`;
    
    userPrompt = `Write a first contact warm email about ${companyName}.

Website: ${website}
Score: ${score}/100
Design Score: ${designScore}/10
Mobile: ${mobileFriendly === true ? 'Responsive' : mobileFriendly === false ? 'Needs improvement' : 'Not analyzed'}
SEO: ${hasSEO === true ? 'Optimized' : hasSEO === false ? 'Could be better' : 'Not analyzed'}
Load Time: ${loadTime ? `${loadTime}s` : 'Not analyzed'}

Opportunities from actual data:
${opportunities}

Suggestions:
${suggestions.slice(0, 3).map((s:any) => `• ${s}`).join('\n')}

Email structure:
1. Greeting: Use "Hi there,"
2. Warm opening: "I came across ${companyName} and was impressed by..."
3. Share 2-3 opportunities with bullet points (•) from the list above
4. Explain potential benefits with numbers
5. Collaborative offer: "Would you be open to a quick 15-minute chat to discuss?"
6. Closing MUST be EXACTLY:
   Best regards,
   Ahmed Hassan

Use \\n\\n between sections. Be friendly and collaborative. DO NOT include any timestamps.

Return JSON with subject and text.`;
  }
  else if (emailType === 'followup') {
    systemPrompt = `You are Ahmed Hassan. Write a friendly follow-up focusing on ONE specific opportunity from the data. Be helpful, not pushy. Length: 140-170 words.

IMPORTANT RULES:
- NEVER include timestamps or times in the email
- Use "Hi there," if name is not available
- The closing MUST be EXACTLY:
  Best regards,
  Ahmed Hassan`;
    
    userPrompt = `Write a follow-up warm email about ${companyName}.

Main Opportunity: ${mainOpportunity}
Quick Tip: ${mainSuggestion}
Data: ${issues.length > 0 ? issues[0] : 'website improvement'}

Email structure:
1. Greeting: "Hi there,"
2. Friendly check-in: "Following up on my previous email..."
3. Focus on ONE specific opportunity from the data
4. Share a quick tip they can try today
5. Offer to help: "Let me know if you'd like me to share more details"
6. Closing EXACTLY:
   Best regards,
   Ahmed Hassan

Use \\n\\n between sections. DO NOT include any timestamps.

Return JSON with subject and text.`;
  }
  else if (emailType === 'followup-2') {
    systemPrompt = `You are Ahmed Hassan. Share a helpful resource. Be educational. Length: 120-150 words.

IMPORTANT RULES:
- NEVER include timestamps or times in the email
- Use "Hi there," if name is not available
- The closing MUST be EXACTLY:
  Best regards,
  Ahmed Hassan`;
    
    userPrompt = `Write a second follow-up warm email about ${companyName}.

Opportunity: ${mainOpportunity}
Issues from data: ${issues.slice(0, 2).join(', ')}
Tool: ${mobileFriendly === false ? 'Google Mobile-Friendly Test' : 'Google PageSpeed Insights'}

Email structure:
1. Greeting: "Hi there,"
2. Acknowledge following up
3. Share resource based on their specific issues:
   • Free tool: [Tool name] - no cost, takes 2 minutes
   • What it shows: specific fixes for their issues
   • Quick guide to use it
4. Offer to help review findings
5. Closing EXACTLY:
   Best regards,
   Ahmed Hassan

DO NOT include any timestamps.

Return JSON with subject and text.`;
  }
  else {
    systemPrompt = `You are Ahmed Hassan. Write a gracious final follow-up. Keep it 80-100 words.

IMPORTANT RULES:
- NEVER include timestamps or times in the email
- Use "Hi there," if name is not available
- The closing MUST be EXACTLY:
  Best regards,
  Ahmed Hassan`;
    
    userPrompt = `Write a final follow-up warm email about ${companyName}.

Opportunity: ${mainOpportunity}
Issues: ${issues.slice(0, 2).join(', ')}

Email structure:
1. Greeting: "Hi there,"
2. Acknowledge this is the last email
3. Briefly mention the specific opportunity from their data
4. Gracious closing: "Wishing you and ${companyName} continued success"
5. Leave door open: "If you ever want to chat, feel free to reach out"
6. Closing EXACTLY:
   Best regards,
   Ahmed Hassan

Keep it warm, positive, and professional. DO NOT include any timestamps.

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
      maxTokens: emailType === 'first' ? 1000 : emailType === 'final' ? 500 : 750,
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
    
    const finalText = formatWarmEmail(text, recipientName, emailType);
    const html = generateWarmHtml(finalText);
    
    let subject = result.subject || '';
    if (!subject) {
      if (emailType === 'first') subject = `Ideas to enhance ${companyName}`;
      else if (emailType === 'followup') subject = `Following up: ${mainOpportunity.substring(0, 40)}`;
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
    logger.error(`Failed to generate ${emailType} warm email:`, error);
    throw new Error(`Warm email generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}