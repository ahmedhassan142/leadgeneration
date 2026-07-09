// Test the Groq AI client directly to verify the API key works
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { llamaClient, LlamaModels, ChatMessage } from '../lib/ai/llamaClient';

async function testGroq() {
  console.log('=== Testing Groq AI Client ===\n');
  console.log('API Key present:', !!process.env.GROQ_API_KEY);
  console.log('Using model:', LlamaModels.LLAMA_3_3_70B);
  console.log('');

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are a helpful assistant. Reply in JSON with fields {subject, text}.',
    },
    {
      role: 'user',
      content:
        'Write a one-sentence greeting to a lead named Ahmed about his real estate website.',
    },
  ];

  try {
    const response = await llamaClient.chatCompletion(messages, {
      model: LlamaModels.LLAMA_3_3_70B,
      temperature: 0.7,
      maxTokens: 200,
      responseFormat: { type: 'json_object' },
    });

    console.log('✅ Groq API call succeeded!');
    console.log('Model used:', (response as any).model);
    console.log('Response:', response.choices[0].message.content);
  } catch (error) {
    console.log('❌ Groq API call failed:', error);
  }
}

testGroq().catch(console.error);
