// lib/services/ai.ts - COMPLETE FIXED with Gemini 2.5 Flash
import dotenv from 'dotenv'
import path from 'path';

// Load .env.local
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
}

// 🔥 LATEST GEMINI MODELS (from your API response)
const GEMINI_MODELS = [
  'models/gemini-2.5-flash',           // Latest stable - October 2025
  'models/gemini-2.5-pro',              // Latest pro
  'models/gemini-2.0-flash',            // Fallback
  'models/gemini-flash-latest',         // Latest flash alias
];

// Default model to use
const DEFAULT_MODEL = 'models/gemini-2.5-flash';

export async function generateScript(lead: any) {
  const prompt = `You are an AI sales assistant calling ${lead.name} who is interested in ${lead.niche}.

Generate a short, natural conversation script:

1. Warm greeting: "Hello [name], this is an automated call from our team..."
2. Ask about their interest in ${lead.niche}
3. Ask 2-3 qualifying questions about:
   - Their current situation/needs
   - Budget range (low/medium/high)
   - Timeline (immediate/1-3 months/3+ months)
4. End politely: "Thank you for your time. Goodbye!"

Keep it conversational, friendly, and under 1 minute.
Return ONLY the script text, no explanations.`;

  // Try each model until one works
  for (const model of GEMINI_MODELS) {
    try {
      console.log(`🤖 Trying Gemini model: ${model}...`);
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 500,
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ Model ${model} failed with status ${response.status}`);
        continue;
      }

      const data = await response.json();
      
      if (data.error) {
        console.log(`❌ Model ${model} error:`, data.error);
        continue;
      }

      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        console.log(`❌ Model ${model} unexpected response`);
        continue;
      }

      const script = data.candidates[0].content.parts[0].text;
      console.log(`✅ Script generated with ${model}`);
      return script;
      
    } catch (error) {
      console.log(`❌ Model ${model} exception:`, error);
      continue;
    }
  }

  // If all models fail, use fallback
  console.log('⚠️ All Gemini models failed, using fallback script');
  return getFallbackScript(lead);
}

export async function scoreLead(transcript: string, lead: any) {
  const prompt = `You are an AI sales analyst. Analyze this sales call transcript and score the lead.

Lead: ${lead.name}
Niche: ${lead.niche}
Transcript: "${transcript}"

Score the lead 0-100 based on:
- Interest Level (0-40): How enthusiastic/engaged they sound
- Budget Fit (0-30): Do they have appropriate budget
- Timeline (0-20): How soon they want to start
- Authority (0-10): Decision-making power

Return a valid JSON object with exactly these fields:
{
  "score": number between 0-100,
  "summary": "brief 1-line summary of the call",
  "sentiment": "positive" or "neutral" or "negative",
  "keyPoints": ["point1", "point2", "point3"],
  "nextSteps": "suggested next action"
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${DEFAULT_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 300,
          }
        })
      }
    );

    const data = await response.json();
    
    if (data.error) {
      console.error('Gemini API error:', data.error);
      return getFallbackScore();
    }

    const text = data.candidates[0].content.parts[0].text;
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return getFallbackScore();
  } catch (error) {
    console.error('Error scoring lead:', error);
    return getFallbackScore();
  }
}

export async function generateFollowUp(lead: any, score: any) {
  const prompt = `Generate a brief, friendly follow-up message for ${lead.name} (interested in ${lead.niche}).

Call Summary: ${score.summary}
Score: ${score.score}/100
Sentiment: ${score.sentiment}

The message should:
1. Be personalized based on the call
2. Address their interest
3. Suggest next steps
4. Be under 50 words

Return ONLY the message text, no explanations.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${DEFAULT_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 100,
          }
        })
      }
    );

    const data = await response.json();
    
    if (data.error) {
      console.error('Gemini API error:', data.error);
      return `Thank you for your time. We'll follow up with more information about ${lead.niche}.`;
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error generating follow-up:', error);
    return `Thank you for your time. We'll follow up soon.`;
  }
}

export async function analyzeSentiment(text: string) {
  const prompt = `Analyze the sentiment of this text. Return ONLY one word: positive, neutral, or negative.

Text: "${text}"

Sentiment:`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${DEFAULT_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 10,
          }
        })
      }
    );

    const data = await response.json();
    
    if (data.error) {
      return 'neutral';
    }

    const sentiment = data.candidates[0].content.parts[0].text.toLowerCase().trim();
    
    if (sentiment.includes('positive')) return 'positive';
    if (sentiment.includes('negative')) return 'negative';
    return 'neutral';
  } catch (error) {
    return 'neutral';
  }
}

export async function extractKeyInfo(transcript: string) {
  const prompt = `Extract key information from this sales call transcript.

Transcript: "${transcript}"

Return a valid JSON object with:
{
  "budget": "low/medium/high or unknown",
  "timeline": "immediate/1-3 months/3+ months/unknown",
  "authority": "decision-maker/influencer/unknown",
  "painPoints": ["point1", "point2"],
  "interest": "high/medium/low"
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${DEFAULT_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 200,
          }
        })
      }
    );

    const data = await response.json();
    
    if (data.error) {
      return getFallbackKeyInfo();
    }

    const text = data.candidates[0].content.parts[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return getFallbackKeyInfo();
  } catch (error) {
    return getFallbackKeyInfo();
  }
}

// Helper functions
function getFallbackScript(lead: any): string {
  return `Hello ${lead.name}, this is an automated call regarding your interest in ${lead.niche}. I wanted to ask a few quick questions. What is your current situation regarding this? What budget range are you considering? And what timeline are you looking at? Thank you for your time.`;
}

function getFallbackScore() {
  return {
    score: 50,
    summary: "Call completed successfully",
    sentiment: "neutral",
    keyPoints: ["Lead responded", "Need more info"],
    nextSteps: "Follow up with more details"
  };
}

function getFallbackKeyInfo() {
  return {
    budget: 'unknown',
    timeline: 'unknown',
    authority: 'unknown',
    painPoints: [],
    interest: 'medium'
  };
}