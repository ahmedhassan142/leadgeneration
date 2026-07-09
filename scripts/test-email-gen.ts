// End-to-end test: generate a cold email for a real lead using the Groq client
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import connectToDatabase from '../lib/db/connect';
import { Lead } from '../lib/db/models/Lead';
import { generateColdEmail } from '../lib/ai/cold-email-generator';
import { generateWarmEmail } from '../lib/ai/warm-email-generator';

async function testEmailGeneration() {
  console.log('=== AI Email Generation Test ===\n');
  await connectToDatabase();

  // Find a warm lead with a website
  const lead = await Lead.findOne({
    website: { $regex: '^https?://', $not: /no-website/ },
    quality: 'warm',
  });

  if (!lead) {
    console.log('❌ No suitable lead found');
    return;
  }

  console.log('📧 Generating email for lead:');
  console.log('   Name:    ', lead.name);
  console.log('   Website: ', lead.website);
  console.log('   Score:   ', lead.score, '(' + lead.quality + ')');
  console.log('   Issues:  ', (lead.ai?.issues || []).length, 'found');
  console.log('');

  console.log('--- Cold Email (first contact) ---');
  try {
    const coldEmail = await generateColdEmail({
      emailType: 'first',
      lead,
      companyName: lead.name,
      website: lead.website,
      source: lead.source,
      score: lead.score,
      recipientName: lead.name,
    });
    console.log('Subject:', coldEmail.subject);
    console.log('');
    console.log('Body:');
    console.log(coldEmail.text);
    console.log('');
    console.log('Provider:', coldEmail.provider, '| Model:', coldEmail.model);
  } catch (e: any) {
    console.log('❌ Cold email failed:', e.message);
  }

  console.log('\n--- Warm Email (first contact) ---');
  try {
    const warmEmail = await generateWarmEmail({
      emailType: 'first',
      lead,
      companyName: lead.name,
      website: lead.website,
      source: lead.source,
      score: lead.score,
      recipientName: lead.name,
    });
    console.log('Subject:', warmEmail.subject);
    console.log('');
    console.log('Body:');
    console.log(warmEmail.text);
  } catch (e: any) {
    console.log('❌ Warm email failed:', e.message);
  }

  process.exit(0);
}

testEmailGeneration().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
