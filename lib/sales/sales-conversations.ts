import { llamaClient, ChatMessage } from '@/lib/ai/llamaClient';

export enum SalesStage {
    INTRODUCTION = 1,
    NEEDS_QUALIFICATION = 2,
    BUILD_RAPPORT = 3,
    DISCOVERY = 4,
    VALUE_PROPOSITION = 5,
    OBJECTION_HANDLING = 6,
    PROPOSAL = 7,
    CLOSE = 8,
    END = 9
}

export const STAGE_NAMES: Record<SalesStage, string> = {
    [SalesStage.INTRODUCTION]: "Introduction",
    [SalesStage.NEEDS_QUALIFICATION]: "Qualifying Needs",
    [SalesStage.BUILD_RAPPORT]: "Building Rapport",
    [SalesStage.DISCOVERY]: "Deep Discovery",
    [SalesStage.VALUE_PROPOSITION]: "Value Proposition",
    [SalesStage.OBJECTION_HANDLING]: "Handling Objections",
    [SalesStage.PROPOSAL]: "Making Proposal",
    [SalesStage.CLOSE]: "Closing",
    [SalesStage.END]: "End"
};

const SALES_SYSTEM_PROMPT = `You are Alex, an experienced, empathetic sales professional. You sell web development and app development services.

SALES APPROACH:
- Be consultative, not pushy
- Use natural speech patterns (pauses, "um", "ah", "let me think...")
- Show genuine curiosity about their business
- Ask open-ended questions
- Listen actively and reference what they said
- Handle objections with empathy
- Be honest about pricing (websites $800-$5000, apps $3000-$15000)

CONVERSATION STYLE:
- Sound like a real human, not a robot
- Use filler words naturally: "um", "ah", "you know", "I see", "got it"
- Pause briefly before answering
- React to what they say with small affirmations ("okay", "uh-huh", "right")
- Be warm and conversational

Keep responses concise (1-3 sentences). Be natural.`;

function addNaturalPauses(text: string): string {
    // Add occasional filler words
    const fillerChance = 0.15;
    const words = text.split(' ');
    
    let result = [];
    for (let i = 0; i < words.length; i++) {
        result.push(words[i]);
        if (Math.random() < fillerChance && i < words.length - 1) {
            const fillers = [', um, ', ', ah, ', ', you know, ', ', like, ', ', so, '];
            result.push(fillers[Math.floor(Math.random() * fillers.length)]);
        }
    }
    
    return result.join(' ');
}

export class SalesConversation {
    private currentStage: SalesStage;
    private history: { role: string; content: string }[];
    private leadName: string;
    private leadId: string;
    private discoveredNeeds: string[] = [];
    private budget: string = "unknown";
    private timeline: string = "unknown";

    constructor(leadId: string, leadName: string) {
        this.leadName = leadName;
        this.leadId = leadId;
        this.currentStage = SalesStage.INTRODUCTION;
        this.history = [];
    }

    getCurrentStage(): SalesStage { return this.currentStage; }
    getStageName(): string { return STAGE_NAMES[this.currentStage]; }
    shouldEndCall(): boolean { return this.currentStage === SalesStage.END; }

    addAIResponse(text: string): void {
        this.history.push({ role: 'assistant', content: text });
    }

    addProspectMessage(text: string): void {
        this.history.push({ role: 'user', content: text });
    }

    private getStagePrompt(): string {
        const historyText = this.history
            .slice(-8)
            .map(h => `${h.role === 'assistant' ? 'Alex' : 'Prospect'}: ${h.content}`)
            .join('\n');
        
        let stageInstructions = '';
        
        switch(this.currentStage) {
            case SalesStage.INTRODUCTION:
                stageInstructions = `INTRO STAGE: Warmly introduce yourself to ${this.leadName}. Say you build websites and apps. Ask if they have a quick minute. Keep it brief and friendly.`;
                break;
            case SalesStage.NEEDS_QUALIFICATION:
                stageInstructions = `QUALIFICATION: Ask what business they're in. Show genuine interest. Use a warm, curious tone.`;
                break;
            case SalesStage.BUILD_RAPPORT:
                stageInstructions = `RAPPORT: Find common ground. Ask about their role, how long they've been in business. Be conversational and friendly. Show you're listening.`;
                break;
            case SalesStage.DISCOVERY:
                stageInstructions = `DISCOVERY: Ask about challenges with their current website/systems. What's not working? What would they change? Be empathetic. Take brief pauses.`;
                break;
            case SalesStage.VALUE_PROPOSITION:
                stageInstructions = `VALUE PROPOSITION: Based on their needs (${this.discoveredNeeds.join(', ') || 'not yet specified'}), explain how you can help. Mention past successes. Be specific but not pushy.`;
                break;
            case SalesStage.OBJECTION_HANDLING:
                stageInstructions = `OBJECTIONS: Address concerns with empathy. Acknowledge their worry. Provide reassurance. Offer case studies or examples if helpful.`;
                break;
            case SalesStage.PROPOSAL:
                stageInstructions = `PROPOSAL: Offer specific solutions. Mention typical pricing for websites ($800-5000) or apps ($3000-15000) based on complexity. Be transparent.`;
                break;
            case SalesStage.CLOSE:
                stageInstructions = `CLOSE: Suggest concrete next step - free consultation, demo, or discovery call. Ask for calendar availability.`;
                break;
        }
        
        return `${SALES_SYSTEM_PROMPT}\n\nCURRENT STAGE: ${stageInstructions}\n\nCONVERSATION SO FAR:\n${historyText}\n\nRespond as Alex naturally:`;
    }

    async generateResponse(userInput: string): Promise<string> {
        // Add delay to simulate thinking
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1000));
        
        const prompt = this.getStagePrompt();
        
        try {
            const response = await llamaClient.chat(prompt, undefined, {
                model: 'llama-3.3-70b-versatile',
                temperature: 0.85,
                maxTokens: 200
            });
            
            let aiResponse = response.choices[0].message.content;
            
            // Clean up response
            aiResponse = aiResponse
                .replace(/^Alex:\s*/i, '')
                .replace(/^"/, '')
                .replace(/"$/, '')
                .trim();
            
            // Add natural pauses and filler words
            aiResponse = addNaturalPauses(aiResponse);
            
            this.addAIResponse(aiResponse);
            this.updateStage(userInput);
            this.extractInfo(userInput);
            
            return aiResponse;
            
        } catch (error) {
            console.error('AI Error:', error);
            // Fallback responses
            const fallbacks = [
                "Um, let me think about that for a second...",
                "Ah, I see. Could you tell me a bit more about that?",
                "Got it. So what's been the biggest challenge with that?",
                "Hmm, interesting. How long have you been dealing with that?"
            ];
            const fallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
            this.addAIResponse(fallback);
            return fallback;
        }
    }

    private extractInfo(userInput: string): void {
        const input_lower = userInput.toLowerCase();
        
        // Extract needs
        const need_keywords = ['struggling', 'problem', 'challenge', 'issue', 'need', 'want', 'looking for'];
        for (const keyword of need_keywords) {
            if (input_lower.includes(keyword)) {
                const sentences = userInput.split(/[.!?]+/);
                for (const sentence of sentences) {
                    if (sentence.toLowerCase().includes(keyword) && sentence.length > 10) {
                        this.discoveredNeeds.push(sentence.trim());
                        if (this.discoveredNeeds.length > 5) this.discoveredNeeds.shift();
                        break;
                    }
                }
            }
        }
        
        // Extract budget
        if (input_lower.match(/\$\d+|\d+\s*dollars|\d+\s*k/)) {
            this.budget = userInput;
        }
        
        // Extract timeline
        if (input_lower.match(/week|month|day|tomorrow|soon|asap/)) {
            this.timeline = userInput;
        }
    }

    private updateStage(userInput: string): void {
        const input = userInput.toLowerCase();
        
        switch(this.currentStage) {
            case SalesStage.INTRODUCTION:
                if (input.length > 2 && !input.match(/no|not interested|busy/)) {
                    this.currentStage = SalesStage.NEEDS_QUALIFICATION;
                }
                break;
                
            case SalesStage.NEEDS_QUALIFICATION:
                if (input.length > 5 || this.discoveredNeeds.length > 0) {
                    this.currentStage = SalesStage.BUILD_RAPPORT;
                }
                break;
                
            case SalesStage.BUILD_RAPPORT:
                if (this.history.length > 4) {
                    this.currentStage = SalesStage.DISCOVERY;
                }
                break;
                
            case SalesStage.DISCOVERY:
                if (this.discoveredNeeds.length > 0 || input.length > 15) {
                    this.currentStage = SalesStage.VALUE_PROPOSITION;
                }
                break;
                
            case SalesStage.VALUE_PROPOSITION:
                this.currentStage = SalesStage.OBJECTION_HANDLING;
                break;
                
            case SalesStage.OBJECTION_HANDLING:
                if (input.match(/understand|makes sense|ok|good|price|cost/)) {
                    this.currentStage = SalesStage.PROPOSAL;
                }
                break;
                
            case SalesStage.PROPOSAL:
                if (input.match(/yes|sure|tell me more|ok|sounds good|interested/)) {
                    this.currentStage = SalesStage.CLOSE;
                }
                break;
                
            case SalesStage.CLOSE:
                if (input.match(/yes|sure|ok|let's do it|schedule|calendar|available/)) {
                    this.currentStage = SalesStage.END;
                } else if (input.match(/no|not now|maybe later/)) {
                    this.currentStage = SalesStage.END;
                }
                break;
        }
    }
}