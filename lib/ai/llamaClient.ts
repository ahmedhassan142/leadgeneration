// lib/ai/llamaClient.ts
// Thin wrapper around the Groq SDK that exposes the interface the rest of the
// codebase expects (llamaClient.chatCompletion / llamaClient.chat, LlamaModels,
// ChatMessage). Groq hosts Meta's Llama models, hence the "llama" naming.
import Groq from "groq-sdk";
import { logger } from "@/lib/scraper/utils/logger";

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  responseFormat?: { type: "json_object" | "text" };
  stop?: string | string[];
}

export const LlamaModels = {
  LLAMA_3_3_70B: "llama-3.3-70b-versatile",
  LLAMA_3_1_8B: "llama-3.1-8b-instant",
  LLAMA_3_70B: "llama3-70b-8192",
  LLAMA_3_8B: "llama3-8b-8192",
} as const;

function getClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey) {
    logger.warn(
      "GROQ_API_KEY is not set. AI features will return fallback responses."
    );
    return null;
  }
  return new Groq({ apiKey });
}

class LlamaClient {
  /**
   * OpenAI-style chat completion. Returns an object shaped like the OpenAI
   * response so existing callers (response.choices[0].message.content) work.
   */
  async chatCompletion(messages: ChatMessage[], options: ChatCompletionOptions = {}) {
    const client = getClient();
    const model = options.model || LlamaModels.LLAMA_3_3_70B;

    if (!client) {
      return this.fallbackCompletion(messages, options);
    }

    try {
      const params: any = {
        model,
        messages: messages as any,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1024,
      };
      if (options.topP !== undefined) params.top_p = options.topP;
      if (options.responseFormat) params.response_format = options.responseFormat as any;
      if (options.stop !== undefined) params.stop = options.stop;

      const response = await client.chat.completions.create(params);
      return response as any;
    } catch (error) {
      logger.error("Groq chatCompletion failed:", error);
      return this.fallbackCompletion(messages, options);
    }
  }

  /**
   * Simpler chat helper used by sales-conversations.ts.
   * Signature: chat(prompt, systemPrompt?, options?)
   */
  async chat(
    prompt: string,
    systemPrompt?: string,
    options: ChatCompletionOptions = {}
  ): Promise<any> {
    const messages: ChatMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });
    return this.chatCompletion(messages, options);
  }

  private fallbackCompletion(messages: ChatMessage[], options: ChatCompletionOptions): any {
    const isJson = options.responseFormat?.type === "json_object";
    const content = isJson
      ? JSON.stringify({
          subject: "Following up",
          text:
            "Hi there,\n\nI wanted to follow up regarding your website. We noticed a few opportunities for improvement and would love to help.\n\nBest regards,\nAhmed Hassan",
        })
      : "I understand. Could you tell me a bit more about that?";

    return {
      id: "fallback-" + Date.now(),
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: options.model || LlamaModels.LLAMA_3_3_70B,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content },
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
  }
}

export const llamaClient = new LlamaClient();

export default llamaClient;
