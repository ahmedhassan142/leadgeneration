// lib/outreach/sequence.ts - UPDATED WITH SEQUENCE REPLY MANAGER
import connectToDatabase from '@/lib/db/connect';
import { Outreach } from '@/lib/db/models/Outreach';
import { Sequence } from '@/lib/db/models/Sequence';
import { Lead } from '@/lib/db/models/Lead';
import { followupQueue } from '@/lib/queue/followup-queue';
import { generateColdEmail } from '@/lib/ai/cold-email-generator';
import { generateWarmEmail } from '@/lib/ai/warm-email-generator';
import { logger } from '@/lib/scraper/utils/logger';
import { imapReplyDetector } from '@/lib/email/imap-reply-detector';
import { sequenceReplyManager } from './sequence-replymanager';

console.log('🔥 SEQUENCE MANAGER MODULE LOADED 🔥');

/**
 * Email generator function that selects based on lead quality
 */
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

// Set email generator
followupQueue.setEmailGenerator(generateEmailByQuality);
console.log('✅ Email generator set in queue');

// Start queue
followupQueue.start(5000);
console.log('✅ Queue started');

// Queue event handlers
followupQueue.on('added', (item) => {
  console.log(`📥 Queue: Added ${item.leadName}`);
});

followupQueue.on('processing', (item) => {
  console.log(`⚙️ Queue: Processing ${item.leadName}`);
});

followupQueue.on('processed', (item) => {
  console.log(`✅ Queue: Processed ${item.leadName}`);
});

followupQueue.on('completed', (item) => {
  console.log(`🏁 Queue: Completed ${item.leadName}`);
});

followupQueue.on('failed', (item) => {
  console.log(`❌ Queue: Failed ${item.leadName} after ${item.retryCount} retries`);
});

followupQueue.on('idle', () => {
  console.log(`💤 Queue: Idle - no items to process`);
});

followupQueue.on('empty', () => {
  console.log(`📭 Queue: Empty`);
});

// Start IMAP reply detector
async function startReplyDetector() {
  try {
    await imapReplyDetector.connect();
    imapReplyDetector.start(60000); // Check every minute
    console.log('✅ IMAP reply detector started (checking every minute)');
  } catch (error) {
    console.error('❌ Failed to start IMAP reply detector:', error);
  }
}

startReplyDetector();

// Clean up on exit
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  imapReplyDetector.stop();
  followupQueue.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down...');
  imapReplyDetector.stop();
  followupQueue.stop();
  process.exit(0);
});

export const sequenceManager = {
  async processPendingFollowUps() {
    await connectToDatabase();

    const dueOutreaches = await Outreach.find({
      status: 'active',
      nextFollowUpAt: { $lte: new Date() }
    }).sort({ nextFollowUpAt: 1 });

    console.log(`📨 Found ${dueOutreaches.length} follow-ups due`);

    if (dueOutreaches.length === 0) {
      return 0;
    }

    let addedToQueue = 0;

    for (const outreach of dueOutreaches) {
      const status = followupQueue.getStatus();
      const alreadyInQueue = status.items.some(item => item.leadName === outreach.leadSnapshot.name);
      
      if (alreadyInQueue) {
        console.log(`⏭️ ${outreach.leadSnapshot.name} already in queue, skipping`);
        continue;
      }

      const sequence = await Sequence.findOne({ id: outreach.sequenceId });
      if (!sequence) continue;

      if (outreach.currentStep > sequence.steps.length) {
        console.log(`✅ ${outreach.leadSnapshot.name} already completed, marking as completed`);
        await Outreach.findByIdAndUpdate(outreach._id, {
          status: 'completed',
          completedAt: new Date()
        });
        continue;
      }

      const stepAlreadySent = outreach.emails.some((e:any) => e.stepIndex === outreach.currentStep);
      if (stepAlreadySent) {
        console.log(`⚠️ Step ${outreach.currentStep} already sent for ${outreach.leadSnapshot.name}, moving to next step...`);
        
        const nextStep = outreach.currentStep + 1;
        const isComplete = nextStep > sequence.steps.length;
        const nextFollowUp = isComplete ? null : new Date(Date.now() + 60 * 1000);
        
        await Outreach.findByIdAndUpdate(outreach._id, {
          currentStep: nextStep,
          nextFollowUpAt: nextFollowUp,
          status: isComplete ? 'completed' : 'active',
          ...(isComplete && { completedAt: new Date() })
        });
        
        console.log(`   ✅ Auto-advanced to Step ${nextStep}/${sequence.steps.length}`);
        console.log(`   ⏰ Next follow-up in 1 minute`);
        continue;
      }

      await followupQueue.addToQueue(outreach, sequence);
      addedToQueue++;
    }

    console.log(`📥 Added ${addedToQueue} follow-ups to queue`);
    return addedToQueue;
  },

  async getQueueStatus() {
    return followupQueue.getStatus();
  },

  async clearQueue() {
    followupQueue.clear();
    return { success: true, message: 'Queue cleared' };
  },

  async stopQueue() {
    followupQueue.stop();
    imapReplyDetector.stop();
    return { success: true, message: 'Queue stopped' };
  },

  async startQueue() {
    followupQueue.start(5000);
    await imapReplyDetector.connect();
    imapReplyDetector.start(60000);
    return { success: true, message: 'Queue started' };
  },

  async processSingleFollowUp(leadId: string) {
    await connectToDatabase();

    const outreach = await Outreach.findOne({
      leadId: leadId,
      status: 'active',
      nextFollowUpAt: { $lte: new Date() }
    });

    if (!outreach) {
      console.log(`❌ No due follow-up found for lead ${leadId}`);
      return 0;
    }

    const sequence = await Sequence.findOne({ id: outreach.sequenceId });
    if (!sequence) return 0;

    if (outreach.currentStep > sequence.steps.length) {
      await Outreach.findByIdAndUpdate(outreach._id, {
        status: 'completed',
        completedAt: new Date()
      });
      return 0;
    }

    const stepAlreadySent = outreach.emails.some((e:any) => e.stepIndex === outreach.currentStep);
    if (stepAlreadySent) {
      console.log(`⚠️ Step ${outreach.currentStep} already sent, moving to next step...`);
      const nextStep = outreach.currentStep + 1;
      const isComplete = nextStep > sequence.steps.length;
      const nextFollowUp = isComplete ? null : new Date(Date.now() + 60 * 1000);
      
      await Outreach.findByIdAndUpdate(outreach._id, {
        currentStep: nextStep,
        nextFollowUpAt: nextFollowUp,
        status: isComplete ? 'completed' : 'active'
      });
      return 1;
    }

    await followupQueue.addToQueue(outreach, sequence);
    return 1;
  },

  generateEmailForLead: generateEmailByQuality,

  /**
   * Handle reply detection from IMAP detector
   * Uses centralized SequenceReplyManager to store replies in Sequence model
   */
  async handleReply(messageId: string, replyContent: string, fromEmail: string, receivedAt: Date, replySubject?: string) {
    await connectToDatabase();

    logger.info(`💬 REPLY DETECTED for message: ${messageId}`);
    logger.info(`   From: ${fromEmail}`);
    logger.info(`   Subject: ${replySubject || 'No subject'}`);
    logger.info(`   Content: ${replyContent.substring(0, 200)}...`);

    // Find the original email that was replied to
    const outreach = await Outreach.findOne({
      'emails.messageId': messageId
    });

    if (!outreach) {
      logger.warn(`⚠️ No outreach found for messageId: ${messageId}`);
      return false;
    }

    // Find which email this reply belongs to
    const email = outreach.emails.find((e:any) => e.messageId === messageId);
    if (!email) {
      logger.warn(`⚠️ Email not found in outreach for messageId: ${messageId}`);
      return false;
    }

    const stepNumber = email.stepIndex;
    const stepType = stepNumber === 1 ? 'first' : stepNumber === 2 ? 'followup-1' : stepNumber === 3 ? 'followup-2' : 'final';

    logger.info(`📧 Reply to ${stepType} email (Step ${stepNumber}) for lead: ${outreach.leadSnapshot.name}`);

    // Use SequenceReplyManager to handle the reply (centralized storage)
    const result = await sequenceReplyManager.addReply(
      outreach.sequenceId,
      outreach.leadId,
      outreach.leadSnapshot.name,
      outreach.leadSnapshot.email,
      stepNumber,
      messageId,
      replyContent,
      fromEmail,
      receivedAt,
      replySubject
    );

    if (result) {
      // Update outreach record with basic reply info (timestamp only)
      const emailIndex = outreach.emails.findIndex((e:any) => e.messageId === messageId);
      await Outreach.findByIdAndUpdate(outreach._id, {
        $set: {
          [`emails.${emailIndex}.repliedAt`]: receivedAt,
          [`emails.${emailIndex}.status`]: 'replied',
          status: 'completed',
          completedAt: receivedAt,
          completedReason: `Replied to ${stepType} email`
        }
      });

      // Remove from queue
      followupQueue.remove(outreach.leadSnapshot.name);
      
      logger.info(`✅✅✅ SEQUENCE STOPPED for ${outreach.leadSnapshot.name}`);
      logger.info(`   Reply stored in sequence: ${outreach.sequenceId}`);
    }

    return result;
  },

  // Legacy method for backward compatibility
  async handleWebhook(messageId: string, event: string, timestamp: Date, replyContent?: string, fromEmail?: string) {
    if (event === 'replied') {
      return this.handleReply(messageId, replyContent || '', fromEmail || '', timestamp);
    }
    
    // Handle other events (opened, clicked, etc.)
    await connectToDatabase();

    const outreach = await Outreach.findOne({
      'emails.messageId': messageId
    });

    if (!outreach) return false;

    const emailIndex = outreach.emails.findIndex((e:any) => e.messageId === messageId);
    if (emailIndex === -1) return false;

    const updateField: any = {};
    
    switch (event) {
      case 'opened':
        updateField[`emails.${emailIndex}.openedAt`] = timestamp;
        updateField[`emails.${emailIndex}.status`] = 'opened';
        logger.info(`👁️ Email opened: ${outreach.leadSnapshot.name}`);
        break;
      case 'clicked':
        updateField[`emails.${emailIndex}.clickedAt`] = timestamp;
        updateField[`emails.${emailIndex}.status`] = 'clicked';
        logger.info(`🔗 Link clicked: ${outreach.leadSnapshot.name}`);
        break;
    }

    await Outreach.findByIdAndUpdate(outreach._id, { $set: updateField });
    return true;
  },

  async getActiveSequences() {
    await connectToDatabase();
    
    const activeOutreaches = await Outreach.find({
      status: 'active'
    }).sort({ nextFollowUpAt: 1 });
    
    return activeOutreaches.map(o => ({
      leadName: o.leadSnapshot.name,
      leadEmail: o.leadSnapshot.email,
      currentStep: o.currentStep,
      totalSteps: o.totalSteps,
      nextFollowUp: o.nextFollowUpAt,
      lastContacted: o.lastContactedAt,
      emailsSent: o.emails.length
    }));
  },

  async getLeadSequenceHistory(leadId: string) {
    await connectToDatabase();
    
    const outreach = await Outreach.findOne({ leadId });
    if (!outreach) return null;
    
    // Get full reply content from sequence
    const sequence = await Sequence.findOne({ id: outreach.sequenceId });
    const sequenceReplies = sequence?.stats?.replies?.filter((r:any) => r.leadId === leadId) || [];
    
    return {
      lead: {
        name: outreach.leadSnapshot.name,
        email: outreach.leadSnapshot.email,
        website: outreach.leadSnapshot.website,
        quality: outreach.leadSnapshot.quality,
        score: outreach.leadSnapshot.score
      },
      sequence: {
        name: outreach.sequenceName,
        totalSteps: outreach.totalSteps,
        completedSteps: outreach.currentStep - 1,
        status: outreach.status,
        startedAt: outreach.startedAt,
        completedAt: outreach.completedAt,
        completedReason: outreach.completedReason
      },
      emails: outreach.emails.map((e:any) => ({
        step: e.stepIndex,
        sentAt: e.sentAt,
        subject: e.subject,
        status: e.status,
        openedAt: e.openedAt,
        clickedAt: e.clickedAt,
        repliedAt: e.repliedAt
      })),
      replies: sequenceReplies.map((r:any) => ({
        step: r.step,
        emailType: r.stepName,
        content: r.content,
        fromEmail: r.fromEmail,
        receivedAt: r.receivedAt,
        subject: r.subject
      }))
    };
  },

  async getRepliesForLead(leadId: string) {
    // Get replies from Sequence model (centralized)
    const sequences = await Sequence.find({
      'stats.replies.leadId': leadId
    }).lean();
    
    const allReplies: any[] = [];
    
    for (const seq of sequences) {
      const replies = (seq.stats?.replies || [])
        .filter((r:any) => r.leadId === leadId)
        .map((r:any) => ({
          sequenceId: seq.id,
          sequenceName: seq.name,
          step: r.step,
          emailType: r.stepName,
          content: r.content,
          fromEmail: r.fromEmail,
          receivedAt: r.receivedAt,
          subject: r.subject,
          status: r.status
        }));
      
      allReplies.push(...replies);
    }
    
    return allReplies.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
  },

  async getAllReplies(limit: number = 100) {
    // Use SequenceReplyManager to get all replies
    return await sequenceReplyManager.getAllReplies(limit);
  },

  async getReplyStats() {
    // Use SequenceReplyManager to get reply statistics
    return await sequenceReplyManager.getReplyStats();
  }
};