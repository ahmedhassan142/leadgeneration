// lib/queue/followup-queue.ts - UPDATED FOR NEW MODELS
import { EventEmitter } from 'events';
import { Outreach } from '@/lib/db/models/Outreach';
import { Sequence } from '@/lib/db/models/Sequence';
import { Lead } from '@/lib/db/models/Lead';
import { EmailHistory } from '@/lib/db/models/EmailHistory';
import { sendEmail } from '@/lib/email/send';
import { logger } from '@/lib/scraper/utils/logger';

type EmailGeneratorFunction = (leadData: any, emailType: string, previousInteractions?: string) => Promise<any>;

interface QueueItem {
  id: string;
  outreachId: string;
  leadId: string;
  leadName: string;
  step: number;
  totalSteps: number;
  nextFollowUpAt: Date;
  lastContactedAt: Date;
  retryCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

// Default follow-up timing (will be overridden by sequence config)
const DEFAULT_FOLLOW_UP_TIMING = {
  STEP_1_TO_2_DAYS: 3,
  STEP_2_TO_3_DAYS: 4,
  STEP_3_TO_4_DAYS: 5,
  MIN_HOURS_BETWEEN_EMAILS: 24,
};

export class FollowupQueue extends EventEmitter {
  private queue: QueueItem[] = [];
  private processing = false;
  private interval: NodeJS.Timeout | null = null;
  private maxRetries = 3;
  private retryDelay = 30 * 60 * 1000; // 30 minutes between retries
  private emailGenerator: EmailGeneratorFunction | null = null;

  constructor() {
    super();
    console.log('📦 Follow-up Queue initialized');
  }

  setEmailGenerator(generator: EmailGeneratorFunction) {
    this.emailGenerator = generator;
    console.log('✅ Email generator set in queue');
  }

  /**
   * Get follow-up timing from sequence (dynamic)
   */
  private getFollowUpTiming(sequence: any, currentStep: number): number {
    // Use sequence config if available
    if (sequence?.followUpConfig) {
      if (currentStep === 1) return sequence.followUpConfig.step1To2Days;
      if (currentStep === 2) return sequence.followUpConfig.step2To3Days;
      if (currentStep === 3) return sequence.followUpConfig.step3To4Days;
    }
    
    // Fallback to defaults
    if (currentStep === 1) return DEFAULT_FOLLOW_UP_TIMING.STEP_1_TO_2_DAYS;
    if (currentStep === 2) return DEFAULT_FOLLOW_UP_TIMING.STEP_2_TO_3_DAYS;
    return DEFAULT_FOLLOW_UP_TIMING.STEP_3_TO_4_DAYS;
  }

  async addToQueue(outreach: any, sequence: any) {
    // Check if lead has already replied
    const hasReplied = outreach.emails?.some((e: any) => e.repliedAt);
    if (hasReplied) {
      console.log(`⏭️ ${outreach.leadSnapshot.name} already replied, skipping queue`);
      return;
    }

    // Check if lead is already in queue
    const existing = this.queue.find(q => q.outreachId === outreach._id.toString());
    if (existing) {
      console.log(`⏭️ ${outreach.leadSnapshot.name} already in queue`);
      return;
    }

    // Check if lead has email sequence status as 'replied' or 'converted'
    const lead = await Lead.findById(outreach.leadId);
    if (lead && (lead.emailSequenceStatus === 'replied' || lead.emailSequenceStatus === 'converted')) {
      console.log(`⏭️ ${outreach.leadSnapshot.name} already ${lead.emailSequenceStatus}, skipping queue`);
      return;
    }

    // Verify if follow-up is actually due using sequence timing
    const lastEmailDate = outreach.lastContactedAt;
    if (lastEmailDate) {
      const daysSinceLastEmail = (Date.now() - new Date(lastEmailDate).getTime()) / (1000 * 60 * 60 * 24);
      const requiredDays = this.getFollowUpTiming(sequence, outreach.currentStep);
      
      if (daysSinceLastEmail < requiredDays) {
        const daysRemaining = Math.ceil(requiredDays - daysSinceLastEmail);
        console.log(`⏸️ ${outreach.leadSnapshot.name} - Follow-up not due yet. Last email: ${daysSinceLastEmail.toFixed(1)} days ago. Need ${requiredDays} days. Next in ${daysRemaining} days.`);
        
        // Update nextFollowUpAt in database
        const newNextDate = new Date(lastEmailDate);
        newNextDate.setDate(newNextDate.getDate() + requiredDays);
        
        await Outreach.findByIdAndUpdate(outreach._id, {
          nextFollowUpAt: newNextDate
        });
        
        return;
      }
    }

    const queueItem: QueueItem = {
      id: `${Date.now()}-${outreach._id}`,
      outreachId: outreach._id.toString(),
      leadId: outreach.leadId,
      leadName: outreach.leadSnapshot.name,
      step: outreach.currentStep,
      totalSteps: sequence.steps.length,
      nextFollowUpAt: outreach.nextFollowUpAt,
      lastContactedAt: outreach.lastContactedAt,
      retryCount: 0,
      status: 'pending'
    };

    this.queue.push(queueItem);
    this.emit('added', queueItem);
    console.log(`📥 Added to queue: ${outreach.leadSnapshot.name} (Step ${outreach.currentStep}/${sequence.steps.length})`);
    console.log(`   📅 Next follow-up scheduled: ${outreach.nextFollowUpAt?.toLocaleDateString() || 'Not scheduled'}`);

    if (!this.processing) {
      this.processQueue();
    }
  }

  private calculateNextFollowUp(currentStep: number, totalSteps: number, lastContactedAt: Date, sequence?: any): Date | null {
    if (currentStep >= totalSteps) return null;
    
    const daysToAdd = this.getFollowUpTiming(sequence, currentStep);
    
    const nextDate = new Date(lastContactedAt);
    nextDate.setDate(nextDate.getDate() + daysToAdd);
    
    // Set to business hours if configured (10 AM)
    if (sequence?.followUpConfig?.businessHoursOnly !== false) {
      const sendHour = sequence?.followUpConfig?.sendTimeHour || 10;
      nextDate.setHours(sendHour, 0, 0, 0);
    }
    
    return nextDate;
  }

  private async processQueue() {
    if (this.processing) return;
    if (this.queue.length === 0) {
      this.emit('empty');
      return;
    }

    this.processing = true;
    console.log(`\n🔄 Processing queue... ${this.queue.length} items pending`);

    while (this.queue.length > 0) {
      const item = this.queue[0];
      
      // Get sequence for timing
      const freshOutreachCheck = await Outreach.findById(item.outreachId);
      const sequence = freshOutreachCheck ? await Sequence.findOne({ id: freshOutreachCheck.sequenceId }) : null;
      const requiredDays = this.getFollowUpTiming(sequence, item.step);
      
      // Check if follow-up is due based on lastContactedAt
      if (item.lastContactedAt) {
        const daysSinceLastEmail = (Date.now() - new Date(item.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceLastEmail < requiredDays) {
          const daysRemaining = Math.ceil(requiredDays - daysSinceLastEmail);
          console.log(`⏸️ ${item.leadName} - Follow-up not due yet. Last email: ${daysSinceLastEmail.toFixed(1)} days ago. Need ${requiredDays} days. Next in ${daysRemaining} days.`);
          
          // Update nextFollowUpAt in database
          if (freshOutreachCheck) {
            const newNextDate = new Date(item.lastContactedAt);
            newNextDate.setDate(newNextDate.getDate() + requiredDays);
            await Outreach.findByIdAndUpdate(item.outreachId, { nextFollowUpAt: newNextDate });
          }
          
          this.queue.push(this.queue.shift()!);
          continue;
        }
      }
      
      // Also check nextFollowUpAt from database
      if (item.nextFollowUpAt && new Date(item.nextFollowUpAt) > new Date()) {
        const hoursRemaining = Math.ceil((new Date(item.nextFollowUpAt).getTime() - new Date().getTime()) / (1000 * 60 * 60));
        console.log(`⏸️ ${item.leadName} - Next follow-up scheduled in ${hoursRemaining} hours`);
        this.queue.push(this.queue.shift()!);
        continue;
      }

      item.status = 'processing';
      this.emit('processing', item);

      try {
        const freshOutreach = await Outreach.findById(item.outreachId);
        if (!freshOutreach) {
          throw new Error('Outreach not found');
        }

        // Check if lead has already replied
        const hasReplied = freshOutreach.emails?.some((e: any) => e.repliedAt);
        if (hasReplied) {
          console.log(`✅ ${item.leadName} has already replied, removing from queue`);
          await this.markSequenceCompleted(item, 'replied');
          this.queue.shift();
          this.emit('completed', item);
          continue;
        }

        // Check if lead is converted
        const lead = await Lead.findById(item.leadId);
        if (lead && (lead.status === 'converted' || lead.emailSequenceStatus === 'converted')) {
          console.log(`✅ ${item.leadName} already converted, removing from queue`);
          await this.markSequenceCompleted(item, 'converted');
          this.queue.shift();
          this.emit('completed', item);
          continue;
        }

        if (freshOutreach.status === 'completed') {
          console.log(`✅ ${item.leadName} already completed, removing from queue`);
          this.queue.shift();
          this.emit('completed', item);
          continue;
        }

        const sequence = await Sequence.findOne({ id: freshOutreach.sequenceId });
        if (!sequence) {
          throw new Error('Sequence not found');
        }

        if (freshOutreach.currentStep > sequence.steps.length) {
          console.log(`✅ ${item.leadName} sequence complete`);
          await this.markSequenceCompleted(item, 'sequence_ended');
          this.queue.shift();
          this.emit('completed', item);
          continue;
        }

        const stepAlreadySent = freshOutreach.emails.some((e: any) => e.stepIndex === freshOutreach.currentStep);
        if (stepAlreadySent) {
          console.log(`⚠️ Step ${freshOutreach.currentStep} already sent for ${item.leadName}, moving to next step...`);
          
          const nextStep = freshOutreach.currentStep + 1;
          const isComplete = nextStep > sequence.steps.length;
          const nextFollowUp = isComplete ? null : this.calculateNextFollowUp(nextStep, sequence.steps.length, new Date(), sequence);
          
          await Outreach.findByIdAndUpdate(freshOutreach._id, {
            currentStep: nextStep,
            nextFollowUpAt: nextFollowUp,
            status: isComplete ? 'completed' : 'active'
          });
          
          this.queue.shift();
          if (nextFollowUp) {
            console.log(`   ✅ Auto-advanced to Step ${nextStep}/${sequence.steps.length}`);
            console.log(`   📅 Next follow-up scheduled: ${nextFollowUp.toLocaleDateString()}`);
          } else {
            console.log(`   🏁 Sequence complete!`);
          }
          continue;
        }

        const stepIndex = freshOutreach.currentStep - 1;
        const currentStep = sequence.steps[stepIndex];
        
        let emailType: 'first' | 'followup' | 'followup-2' | 'final';
        
        if (freshOutreach.currentStep === 1) {
          emailType = 'first';
        } else if (freshOutreach.currentStep === 2) {
          emailType = 'followup';
        } else if (freshOutreach.currentStep === 3) {
          emailType = 'followup-2';
        } else {
          emailType = 'final';
        }

        console.log(`\n📧 Generating ${emailType} email for ${item.leadName}`);

        if (!this.emailGenerator) {
          throw new Error('Email generator not configured');
        }

        const emailContent = await this.emailGenerator(
          freshOutreach,
          emailType,
          freshOutreach.emails.map((e: any) => e.subject).join(', ')
        );
        
        if (!emailContent) {
          console.log(`🔥 HOT lead detected - skipping`);
          this.queue.shift();
          continue;
        }

        console.log(`✅ Generated ${emailType} email: "${emailContent.subject}"`);

        const emailResult = await sendEmail({
          to: freshOutreach.leadSnapshot.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          from: process.env.SMTP_FROM_EMAIL
        });

        if (!emailResult.success) {
          throw new Error(emailResult.error);
        }

        const now = new Date();
        const nextStep = freshOutreach.currentStep + 1;
        const isComplete = nextStep > sequence.steps.length;
        const nextFollowUp = isComplete ? null : this.calculateNextFollowUp(nextStep, sequence.steps.length, now, sequence);

        // Update Outreach
        await Outreach.findByIdAndUpdate(freshOutreach._id, {
          currentStep: nextStep,
          lastContactedAt: now,
          nextFollowUpAt: nextFollowUp,
          status: isComplete ? 'completed' : 'active',
          lastEmailSentAt: now,
          lastEmailStep: freshOutreach.currentStep,
          lastEmailType: emailType,
          ...(isComplete && { completedAt: now }),
          $push: {
            emails: {
              to: freshOutreach.leadSnapshot.email,
              subject: emailContent.subject,
              body: emailContent.text,
              sentAt: now,
              status: 'sent',
              messageId: emailResult.messageId,
              templateName: currentStep.template,
              stepIndex: freshOutreach.currentStep
            }
          }
        });

        // Update Lead
        await Lead.findByIdAndUpdate(item.leadId, {
          lastEmailSentAt: now,
          lastEmailType: emailType,
          lastEmailSubject: emailContent.subject,
          totalEmailsSent: (lead?.totalEmailsSent || 0) + 1,
          lastEmailStep: freshOutreach.currentStep,
          currentSequenceId: sequence.id,
          emailSequenceStatus: isComplete ? 'completed' : 'active',
          status: 'contacted'
        });

        // Create Email History record
        await EmailHistory.create({
          leadId: item.leadId,
          outreachId: freshOutreach._id.toString(),
          sequenceId: sequence.id,
          to: freshOutreach.leadSnapshot.email,
          from: process.env.SMTP_FROM_EMAIL,
          subject: emailContent.subject,
          body: emailContent.text,
          sentAt: now,
          emailType,
          stepNumber: freshOutreach.currentStep,
          messageId: emailResult.messageId,
          status: 'sent'
        });

        // Update Sequence stats
        await Sequence.updateOne(
          { id: sequence.id },
          {
            $inc: {
              'stats.totalSent': 1
            },
            $set: {
              'stats.lastUsed': now
            }
          }
        );

        console.log(`✅ Email sent to ${item.leadName}! Next step: ${nextStep}/${sequence.steps.length}`);
        if (nextFollowUp) {
          console.log(`   📅 Next follow-up scheduled: ${nextFollowUp.toLocaleDateString()} at ${nextFollowUp.toLocaleTimeString()}`);
        } else {
          console.log(`   🏁 Sequence complete!`);
        }

        this.queue.shift();
        this.emit('processed', item);

        // Wait between sending emails (respect rate limits)
        await new Promise(resolve => setTimeout(resolve, 4000));

      } catch (error: any) {
        console.error(`❌ Failed to process ${item.leadName}:`, error.message);
        
        item.retryCount++;
        item.status = 'pending';
        item.error = error.message;

        if (item.retryCount >= this.maxRetries) {
          console.log(`❌ Max retries reached for ${item.leadName}, marking as failed`);
          await Outreach.findByIdAndUpdate(item.outreachId, {
            status: 'failed',
            notes: `Failed after ${this.maxRetries} retries: ${error.message}`
          });
          this.queue.shift();
          this.emit('failed', item);
        } else {
          console.log(`🔄 Retry ${item.retryCount}/${this.maxRetries} for ${item.leadName} in ${this.retryDelay / 1000 / 60} minutes`);
          this.queue.push(this.queue.shift()!);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    }

    this.processing = false;
    this.emit('idle');
    console.log('\n✅ Queue processing complete\n');
  }

  /**
   * Mark sequence as completed with reason
   */
  private async markSequenceCompleted(item: QueueItem, reason: string) {
    await Outreach.findByIdAndUpdate(item.outreachId, {
      status: 'completed',
      completedAt: new Date(),
      completedReason: reason
    });
    
    await Lead.findByIdAndUpdate(item.leadId, {
      emailSequenceStatus: reason === 'replied' ? 'replied' : 'completed'
    });
  }

  start(intervalMs: number = 3600000) { // Check every hour
    if (this.interval) {
      console.log('Queue already running');
      return;
    }

    console.log(`🚀 Starting queue processor (checking every ${intervalMs / 1000 / 60} minutes)`);
    this.interval = setInterval(() => {
      if (!this.processing && this.queue.length > 0) {
        this.processQueue();
      }
    }, intervalMs);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('⏹️ Queue processor stopped');
    }
  }

  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      items: this.queue.map(item => ({
        leadName: item.leadName,
        step: `${item.step}/${item.totalSteps}`,
        status: item.status,
        retryCount: item.retryCount,
        lastContactedAt: item.lastContactedAt,
        nextDue: item.nextFollowUpAt
      }))
    };
  }

  clear() {
    this.queue = [];
    console.log('🗑️ Queue cleared');
  }

  remove(leadName: string) {
    const index = this.queue.findIndex(item => item.leadName === leadName);
    if (index !== -1) {
      const removed = this.queue.splice(index, 1)[0];
      console.log(`🗑️ Removed ${removed.leadName} from queue (reply received)`);
      return true;
    }
    return false;
  }
}

export const followupQueue = new FollowupQueue();