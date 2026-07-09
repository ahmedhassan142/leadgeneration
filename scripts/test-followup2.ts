// scripts/test-warm-lead.ts - IDENTICAL FLOW TO COLD TEST
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Lead } from '../lib/db/models/Lead';
import { Outreach } from '../lib/db/models/Outreach';
import { Sequence } from '../lib/db/models/Sequence';
import { sendOutreachEmailToLead } from '../lib/email/outreach';
import { followupQueue } from '../lib/queue/followup-queue';
import { generateWarmEmail } from '../lib/ai/warm-email-generator';
import { generateColdEmail } from '../lib/ai/cold-email-generator';
import { imapReplyDetector } from '../lib/email/imap-reply-detector';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Define email generator for leads
async function generateEmailByQuality(leadData: any, emailType: string, previousInteractions?: string): Promise<any> {
  const lead = await Lead.findById(leadData.leadId).lean();
  
  if (!lead) {
    throw new Error('Lead not found');
  }

  console.log(`📊 Lead quality: ${lead.quality}, Score: ${lead.score}, Email type: ${emailType}`);

  if (lead.quality === 'cold' || (lead.score && lead.score < 40)) {
    console.log(`❄️ Using COLD email generator for ${lead.name}`);
    return await generateColdEmail({
      lead: lead,
      companyName: lead.name,
      website: lead.website,
      source: lead.source,
      score: lead.score,
      recipientName: lead.name,
      emailType: emailType as any,
      previousInteractions: previousInteractions,
      sequence: 'cold-sequence'
    });
  } 
  else if (lead.quality === 'warm' || (lead.score && lead.score >= 40 && lead.score < 70)) {
    console.log(`🌡️ Using WARM email generator for ${lead.name}`);
    return await generateWarmEmail({
      lead: lead,
      companyName: lead.name,
      website: lead.website,
      source: lead.source,
      score: lead.score,
      recipientName: lead.name,
      emailType: emailType as any,
      previousInteractions: previousInteractions,
      sequence: 'warm-sequence'
    });
  }
  else {
    console.log(`🔥 HOT lead - skipping automated email for ${lead.name}`);
    return null;
  }
}

async function testWarmLead() {
  console.log('\n🌡️ TESTING WARM LEAD FOLLOW-UP SYSTEM (1-MINUTE GAPS)');
  console.log('======================================================\n');

  console.log('🔍 CHECKING IMAP CONFIGURATION:');
  console.log('═'.repeat(50));
  console.log(`   SMTP_USER: ${process.env.SMTP_USER ? '✅ Set' : '❌ NOT SET'}`);
  console.log(`   SMTP_PASSWORD: ${process.env.SMTP_PASSWORD ? '✅ Set (length: ' + process.env.SMTP_PASSWORD.length + ')' : '❌ NOT SET'}`);
  console.log('   IMAP Host: imap.gmail.com:993');
  console.log('═'.repeat(50) + '\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB\n');

    console.log('🔍 Testing IMAP connection...');
    const imapConnected = await imapReplyDetector.connect();
    
    if (imapConnected) {
      console.log('✅ IMAP connection successful! Reply detection will work.\n');
    } else {
      console.log('❌ IMAP connection FAILED! Reply detection will NOT work.\n');
    }

    followupQueue.setEmailGenerator(generateEmailByQuality);
    console.log('✅ Email generator set in queue\n');

    // STEP 1: Create sequence with correct stats structure (SAME AS COLD TEST)
    console.log('📝 STEP 1: Creating test sequence...');
    await Sequence.findOneAndUpdate(
      { id: 'test-1min-warm' },
      {
        id: 'test-1min-warm',
        name: 'TEST SEQUENCE - 1 Minute Intervals (WARM)',
        description: 'Test sequence for warm leads with 1-minute intervals',
        targetQualities: ['warm'],
        steps: [
          { day: 0, template: 'first', subject: 'First Email', delay: 0, maxAttempts: 1 },
          { day: 1, template: 'followup-1', subject: 'Follow-up #1', delay: 1, maxAttempts: 1 },
          { day: 2, template: 'followup-2', subject: 'Follow-up #2', delay: 1, maxAttempts: 1 },
          { day: 3, template: 'final', subject: 'Final Follow-up', delay: 1, maxAttempts: 1 }
        ],
        totalSteps: 4,
        totalDays: 3,
        isActive: true,
        isDefault: true,
        stats: {
          totalSent: 0,
          totalOpened: 0,
          totalReplied: 0,
          totalRepliesByStep: {
            step1: 0,
            step2: 0,
            step3: 0,
            step4: 0
          },
          latestReplies: [],  // 👈 Same as cold test
          conversionRate: 0,
          lastUsed: new Date()
        }
      },
      { upsert: true }
    );
    console.log('✅ Sequence ready with stats structure\n');

    // STEP 2: Create WARM test lead
    console.log('📝 STEP 2: Creating WARM test lead with analysis data...');
    const now = new Date();
    const timestamp = now.toLocaleTimeString();
    
    const lead = await Lead.create({
      name: `Warm Lead - ${timestamp}`,
      website: 'https://warm-business.com',
      niche: 'real-estate',
      location: 'San Francisco, CA',
      source: 'scrapingdog',
      emails: ['ah770643@gmail.com'],
      
      websiteExists: true,
      websiteCheckDate: new Date(),
      statusCode: 200,
      
      analysis: {
        hasSEO: true,
        speedScore: 72,
        cms: 'WordPress',
        mobileFriendly: true,
        title: 'Warm Business - Real Estate Solutions',
        description: 'Innovative real estate solutions for modern businesses',
        hasH1: true,
        hasAltTags: true,
        loadTime: 2.1
      },
      
      ai: {
        designScore: 78,
        issues: [
          'Header could use more contrast for better visibility',
          'Some sections could benefit from additional spacing',
          'Testimonials section could be more prominent'
        ],
        suggestions: [
          'Increase header contrast for better readability',
          'Add more padding between sections',
          'Enhance testimonials with customer photos',
          'Add a live chat feature for instant support'
        ],
        analyzedAt: new Date()
      },
      
      callNeeded: true,
      callStatus: 'pending',
      callPriority: 'medium',
      callLogs: [],
      
      score: 55,
      quality: 'warm',
      leadScoreReason: [
        'Good SEO foundation',
        'Mobile responsive design',
        'Decent speed score (72)',
        'Missing live chat feature',
        'Could improve design contrast'
      ],
      autoHotLead: false,
      
      status: 'analyzed',
      exportedToSheets: false,
      estuarySyncStatus: 'pending',
      
      metadata: {
        testRun: true,
        testType: 'warm-lead',
        createdAt: new Date(),
        sourceDetails: {
          scrapedAt: new Date(),
          scrapeMethod: 'scrapingdog'
        }
      }
    });

    console.log(`✅ WARM lead created with ID: ${lead._id}`);
    console.log(`   Name: ${lead.name}`);
    console.log(`   Email: ${lead.emails[0]}`);
    console.log(`   Website: ${lead.website}`);
    console.log(`   Score: ${lead.score} (WARM LEAD)`);
    console.log(`   Quality: ${lead.quality}`);
    console.log(`   Niche: ${lead.niche}`);
    console.log(`   Design Score: ${lead.ai?.designScore}/100`);
    console.log(`   Issues: ${lead.ai?.issues?.length} issues found`);
    console.log(`   Suggestions: ${lead.ai?.suggestions?.length} suggestions\n`);

    // STEP 3: Send first email
    console.log('📧 STEP 3: Sending FIRST outreach email to WARM lead...');
    const emailResult = await sendOutreachEmailToLead({
      _id: lead._id,
      name: lead.name,
      email: lead.emails[0],
      website: lead.website,
      source: lead.source,
      score: lead.score,
      quality: lead.quality,
      metadata: lead.metadata,
      analysis: lead.analysis,
      ai: lead.ai
    });
    
    if (!emailResult.success) {
      console.log('❌ Failed to send first email:', emailResult.error);
      return;
    }
    
    console.log('✅ First outreach email sent to WARM lead!\n');

    // STEP 4: Setup outreach
    console.log('📝 STEP 4: Setting up outreach...');
    const nextFollowUp = new Date(now.getTime() + 60 * 1000);
    
    const outreach = await Outreach.findOneAndUpdate(
      { leadId: lead._id.toString() },
      {
        leadId: lead._id.toString(),
        leadType: 'main',
        leadSnapshot: {
          name: lead.name,
          email: lead.emails[0],
          website: lead.website,
          source: lead.source,
          score: lead.score,
          quality: lead.quality,
          niche: lead.niche,
          location: lead.location,
          ai: {
            issues: lead.ai?.issues || [],
            designScore: lead.ai?.designScore || 0,
            suggestions: lead.ai?.suggestions || []
          },
          analysis: {
            speedScore: lead.analysis?.speedScore || 0,
            mobileFriendly: lead.analysis?.mobileFriendly || false,
            hasSEO: lead.analysis?.hasSEO || false,
            loadTime: lead.analysis?.loadTime || 0
          }
        },
        sequenceId: 'test-1min-warm',
        sequenceName: 'TEST SEQUENCE - 1 Minute Intervals (WARM)',
        totalSteps: 4,
        currentStep: 1,
        status: 'active',
        startedAt: now,
        lastContactedAt: now,
        nextFollowUpAt: nextFollowUp,
        tags: ['test', 'real-estate', 'warm'],
        notes: `WARM test lead created at ${timestamp}`
      },
      { upsert: true, new: true }
    );
    
    console.log(`✅ Outreach setup: Step 1/4`);
    console.log(`   Next follow-up: ${nextFollowUp.toLocaleTimeString()}\n`);

    // STEP 5: Timeline
    const t1 = new Date(now.getTime() + 1 * 60 * 1000);
    const t2 = new Date(now.getTime() + 2 * 60 * 1000);
    const t3 = new Date(now.getTime() + 3 * 60 * 1000);
    
    console.log('⏰ TIMELINE FOR WARM LEAD:');
    console.log(`   ${now.toLocaleTimeString()} - First email (Step 1/4)`);
    console.log(`   ${t1.toLocaleTimeString()} - Follow-up #1 (Step 2/4)`);
    console.log(`   ${t2.toLocaleTimeString()} - Follow-up #2 (Step 3/4)`);
    console.log(`   ${t3.toLocaleTimeString()} - Final follow-up (Step 4/4)\n`);

    // STEP 6: Display lead data summary
    console.log('📊 WARM LEAD DATA SUMMARY:');
    console.log('═'.repeat(50));
    console.log(`   Quality: ${lead.quality.toUpperCase()} (Score: ${lead.score})`);
    console.log('');
    console.log(`   Opportunities for Improvement:`);
    lead.ai?.issues?.forEach((issue: string, i: number) => {
      console.log(`   ${i + 1}. ${issue}`);
    });
    console.log('═'.repeat(50));

    // STEP 7: Start IMAP reply detector (SAME AS COLD TEST)
    if (imapConnected) {
      console.log('\n🚀 Starting IMAP reply detector...');
      imapReplyDetector.start(30000);
      console.log('✅ IMAP reply detector started (checking every 30 seconds)');
    } else {
      console.log('\n⚠️ Skipping IMAP reply detector due to connection failure');
    }

    // STEP 8: Start queue (SAME AS COLD TEST)
    console.log('\n🚀 Starting queue processor...\n');
    followupQueue.start(5000);
    
    let lastStep = 1;
    let completed = false;
    let replyDetected = false;
    
    const interval = setInterval(async () => {
      const currentOutreach = await Outreach.findOne({ leadId: lead._id.toString() });
      if (!currentOutreach) return;
      
      const hasReply = currentOutreach.emails.some((e: any) => e.repliedAt);
      if (hasReply && !replyDetected) {
        replyDetected = true;
        console.log('\n🎉🎉🎉 REPLY DETECTED! Sequence stopped automatically! 🎉🎉🎉\n');
      }
      
      if (currentOutreach.currentStep !== lastStep) {
        console.log(`\n📊 ${new Date().toLocaleTimeString()} - Step ${currentOutreach.currentStep}/${currentOutreach.totalSteps}`);
        lastStep = currentOutreach.currentStep;
      }
      
      if (currentOutreach.status === 'completed' && !completed) {
        console.log('\n✅✅✅ WARM LEAD SEQUENCE COMPLETE!');
        console.log('\n📊 Checking sequence stats...');
        
        const sequence = await Sequence.findOne({ id: 'test-1min-warm' });
        if (sequence) {
          console.log(`   Sequence: ${sequence.name}`);
          console.log(`   Total Replied: ${sequence.stats.totalReplied}`);
          console.log(`   Replies by Step:`, sequence.stats.totalRepliesByStep);
          
          if (sequence.stats.latestReplies && sequence.stats.latestReplies.length > 0) {
            console.log(`\n📝 Latest Replies:`);
            sequence.stats.latestReplies.forEach((reply: any, idx: number) => {
              console.log(`   ${idx + 1}. From: ${reply.fromEmail}`);
              console.log(`      Content: ${reply.content?.substring(0, 100)}...`);
              console.log(`      Step: ${reply.step}`);
            });
          }
        }
        
        completed = true;
        clearInterval(interval);
        followupQueue.stop();
        imapReplyDetector.stop();
        
        const finalOutreach = await Outreach.findOne({ leadId: lead._id.toString() });
        if (finalOutreach) {
          console.log('\n📊 FINAL STATS:');
          console.log(`   Total emails sent: ${finalOutreach.emails.length}`);
          console.log(`   Status: ${finalOutreach.status}`);
          console.log(`   Reply detected: ${replyDetected ? '✅ YES' : '❌ NO'}`);
        }
        setTimeout(() => process.exit(0), 3000);
      }
      
      const dueOutreaches = await Outreach.find({
        status: 'active',
        nextFollowUpAt: { $lte: new Date() }
      });
      
      if (dueOutreaches.length > 0) {
        for (const o of dueOutreaches) {
          const sequence = await Sequence.findOne({ id: o.sequenceId });
          if (sequence) {
            const alreadyInQueue = followupQueue.getStatus().items.some(
              (item: any) => item.leadName === o.leadSnapshot.name
            );
            if (!alreadyInQueue) {
              await followupQueue.addToQueue(o, sequence);
              console.log(`   ➕ Added to queue: ${o.leadSnapshot.name} (Step ${o.currentStep}/${o.totalSteps})`);
            }
          }
        }
      }
      
    }, 5000);
    
    process.on('SIGINT', async () => {
      console.log('\n\n⏹️ Stopping...');
      clearInterval(interval);
      followupQueue.stop();
      imapReplyDetector.stop();
      await mongoose.disconnect();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testWarmLead();