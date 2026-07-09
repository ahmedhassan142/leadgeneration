// scripts/test-followuplead.ts - FIXED VERSION
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Lead } from '../lib/db/models/Lead';
import { Outreach } from '../lib/db/models/Outreach';
import { sendColdEmailToLead } from '../lib/email/outreach';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function createTestLeadWithFollowup() {
  console.log('\n📧 CREATING TEST LEAD WITH 1-MINUTE FOLLOW-UP SEQUENCE');
  console.log('=====================================================\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Create a test lead
    console.log('📝 Step 1: Creating test lead...');
    const testLead = await Lead.create({
      name: `Test User - ${new Date().toLocaleTimeString()}`,
      website: 'https://test-business.com',
      niche: 'real-estate',
      location: 'Austin, TX',
      source: 'scrapingdog',
      emails: ['ah770643@gmail.com'],
      
      websiteExists: true,
      statusCode: 200,
      
      analysis: {
        hasSEO: true,
        speedScore: 75,
        cms: 'WordPress',
        mobileFriendly: true,
        title: 'Test Business',
        description: 'Test Description',
        hasH1: true,
        hasAltTags: true,
        loadTime: 1.2
      },
      
      ai: {
        designScore: 65,
        issues: ['Test issue'],
        suggestions: ['Test suggestion'],
        analyzedAt: new Date()
      },
      
      callNeeded: false,
      score: 35,
      quality: 'cold',
      status: 'raw'
    });

    console.log(`✅ Lead created with ID: ${testLead._id}`);
    console.log(`   Email: ${testLead.emails[0]}\n`);

    // Step 2: Send cold email with test sequence
    console.log('📤 Step 2: Sending first email with test sequence...');
    
    const leadForEmail = {
      _id: testLead._id,
      name: testLead.name,
      email: testLead.emails[0],
      website: testLead.website,
      source: testLead.source,
      score: testLead.score,
      quality: testLead.quality
    };

    const result = await sendColdEmailToLead(leadForEmail);

    if (result.success) {
      console.log('✅ First email sent successfully!');
      console.log(`   Message ID: ${result.messageId}\n`);

      // Step 3: Update the outreach to use our test sequence
      console.log('🔄 Step 3: Updating outreach to use test sequence...');
      
      // Calculate next follow-up: 1 minute from now
      const now = new Date();
      const nextFollowUp = new Date(now.getTime() + 60 * 1000); // +1 minute
      
      console.log(`   Current time: ${now.toLocaleTimeString()}`);
      console.log(`   Next follow-up: ${nextFollowUp.toLocaleTimeString()}`);
      
      // ✅ IMPORTANT: Update the outreach with correct step and nextFollowUp
      const outreach = await Outreach.findOneAndUpdate(
        { leadId: testLead._id.toString() },
        { 
          sequenceId: 'test-1min',
          sequenceName: 'TEST SEQUENCE - 1 Minute Intervals',
          totalSteps: 4,
          currentStep: 1,  // Start at step 1 (first email already sent)
          nextFollowUpAt: nextFollowUp,
          status: 'active'
        },
        { new: true, upsert: false }
      );

      if (outreach) {
        console.log('✅ Outreach updated:');
        console.log(`   Sequence: ${outreach.sequenceName}`);
        console.log(`   Current Step: ${outreach.currentStep}/${outreach.totalSteps}`);
        console.log(`   Next Follow-up: ${outreach.nextFollowUpAt?.toLocaleTimeString()}`);
        console.log(`   Status: ${outreach.status}`);
        console.log(`   Emails sent: ${outreach.emails.length}\n`);
      } else {
        console.log('❌ Outreach not found!');
      }

      // Step 4: Show timeline
      const t1 = new Date(now.getTime() + 1 * 60 * 1000);
      const t2 = new Date(now.getTime() + 2 * 60 * 1000);
      const t3 = new Date(now.getTime() + 3 * 60 * 1000);
      
      console.log('⏰ TIMELINE:');
      console.log(`   Now (${now.toLocaleTimeString()}): First email sent (Step 1/4)`);
      console.log(`   +1 minute (${t1.toLocaleTimeString()}): First follow-up (Step 2/4)`);
      console.log(`   +2 minutes (${t2.toLocaleTimeString()}): Second follow-up (Step 3/4)`);
      console.log(`   +3 minutes (${t3.toLocaleTimeString()}): Final follow-up (Step 4/4)`);
      console.log(`   After final: Sequence complete\n`);

      console.log('📋 Next steps:');
      console.log('   1. Wait 1 minute');
      console.log('   2. Run: npm run monitor');
      console.log('   3. Check your inbox\n');

    } else {
      console.log('❌ Failed to send email:', result.error);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createTestLeadWithFollowup();