// lib/services/outreachService.ts
import connectToDatabase from '@/lib/db/connect';
import { Lead } from '@/lib/db/models/Lead';
import { InboundLead } from '@/lib/db/models/inboundlead';
import { Outreach, IOutreach } from '@/lib/db/models/Outreach';
import { Sequence, ISequence } from '@/lib/db/models/Sequence';
import { emailTemplates } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/send';
import { logger } from '@/lib/scraper/utils/logger';

export interface StartOutreachParams {
  leadId: string;
  leadType: 'main' | 'inbound';
  sequenceId?: string;
  customEmail?: string;
}

export class OutreachService {
  
  // ============================================
  // SEQUENCE MANAGEMENT
  // ============================================
  
  /**
   * Get all active sequences
   */
  async getSequences(quality?: 'hot' | 'warm' | 'cold'): Promise<ISequence[]> {
    await connectToDatabase();
    
    const query: any = { isActive: true };
    if (quality) {
      query.targetQualities = quality;
    }
    
    return await Sequence.find(query).sort({ isDefault: -1, name: 1 });
  }
  
  /**
   * Get default sequence for lead quality
   */
  async getDefaultSequence(quality: string): Promise<ISequence | null> {
    await connectToDatabase();
    
    // Try quality-specific default
    let sequence = await Sequence.findOne({ 
      isActive: true,
      isDefault: true,
      targetQualities: quality
    });
    
    // Fallback to any default
    if (!sequence) {
      sequence = await Sequence.findOne({ isActive: true, isDefault: true });
    }
    
    // Ultimate fallback - standard sequence
    if (!sequence) {
      sequence = await this.createStandardSequence();
    }
    
    return sequence;
  }
  
  /**
   * Create standard sequence (if none exists)
   */
  private async createStandardSequence(): Promise<ISequence> {
    const standardSequence = {
      id: 'standard',
      name: 'Standard Follow-up',
      description: '4-email sequence over 2 weeks',
      targetQualities: ['hot', 'warm', 'cold'],
      isActive: true,
      isDefault: true,
      steps: [
        { day: 0, template: 'intro', delay: 0, maxAttempts: 1 },
        { day: 2, template: 'followup-1', delay: 2, maxAttempts: 2 },
        { day: 5, template: 'followup-2', delay: 3, maxAttempts: 2 },
        { day: 10, template: 'final', delay: 5, maxAttempts: 1 }
      ]
    };
    
    return await Sequence.create(standardSequence);
  }
  
  // ============================================
  // OUTREACH MANAGEMENT
  // ============================================
  
  /**
   * Start outreach for a lead
   */
  async startOutreach(params: StartOutreachParams): Promise<IOutreach | null> {
    try {
      await connectToDatabase();
      
      const { leadId, leadType, sequenceId, customEmail } = params;
      
      // Get lead
      let lead;
      if (leadType === 'main') {
        lead = await Lead.findById(leadId);
      } else {
        lead = await InboundLead.findById(leadId);
      }

      if (!lead) {
        logger.error(`Lead not found: ${leadId}`);
        return null;
      }

      // Get email
      let email = customEmail;
      if (!email) {
        if (leadType === 'main') {
          email = lead.emails?.[0];
        } else {
          email = lead.authorProfile?.includes('@') ? lead.authorProfile : null;
        }
      }

      if (!email) {
        logger.error(`No email found for lead: ${leadId}`);
        return null;
      }

      // Get sequence
      let sequence: ISequence | null = null;
      if (sequenceId) {
        sequence = await Sequence.findOne({ id: sequenceId, isActive: true });
      }
      
      if (!sequence) {
        const quality = lead.quality || lead.metadata?.quality || 'cold';
        sequence = await this.getDefaultSequence(quality);
      }

      if (!sequence) {
        logger.error(`No sequence available for lead: ${leadId}`);
        return null;
      }

      // Create outreach record
      const outreach = await Outreach.create({
        leadId: leadType === 'main' ? leadId : undefined,
        inboundLeadId: leadType === 'inbound' ? leadId : undefined,
        leadType,
        leadSnapshot: {
          name: lead.name || lead.title || 'Unknown',
          website: lead.website || '',
          email,
          phone: lead.phone,
          niche: lead.niche,
          location: lead.location,
          quality: lead.quality || lead.metadata?.quality || 'cold',
          score: lead.score || lead.metadata?.score || 0,
          source: lead.source,
          ai: lead.ai || lead.metadata?.problemAnalysis
        },
        sequenceId: sequence.id,
        sequenceName: sequence.name,
        totalSteps: sequence.steps.length,
        currentStep: 0,
        status: 'active',
        startedAt: new Date(),
        emails: [],
        tags: []
      });

      // Send first email immediately
      await this.sendNextEmail(outreach._id.toString());

      // Update sequence stats
      sequence.stats.totalSent = (sequence.stats.totalSent || 0) + 1;
      sequence.stats.lastUsed = new Date();
      await sequence.save();

      logger.success(`✅ Outreach started for ${lead.name || lead.title}`);
      return outreach;

    } catch (error) {
      logger.error('Failed to start outreach:', error);
      return null;
    }
  }

  /**
   * Send next email in sequence
   */
  async sendNextEmail(outreachId: string): Promise<boolean> {
    try {
      await connectToDatabase();
      
      const outreach = await Outreach.findById(outreachId);
      if (!outreach) {
        logger.error(`Outreach not found: ${outreachId}`);
        return false;
      }

      if (outreach.status !== 'active') {
        logger.warn(`Outreach ${outreachId} is not active`);
        return false;
      }

      const sequence = await Sequence.findOne({ id: outreach.sequenceId });
      if (!sequence) {
        logger.error(`Sequence ${outreach.sequenceId} not found`);
        outreach.status = 'failed';
        await outreach.save();
        return false;
      }

      const currentStep = outreach.currentStep;
      if (currentStep >= outreach.totalSteps) {
        outreach.status = 'completed';
        outreach.completedAt = new Date();
        await outreach.save();
        logger.success(`✅ Outreach ${outreachId} completed`);
        return false;
      }

      const step = sequence.steps[currentStep];
      const previousEmail = outreach.emails[outreach.emails.length - 1];

      // Generate email content
      const emailContent = emailTemplates.generateForSequence(
        outreach.leadSnapshot,
        step.template,
        previousEmail?.sentAt
      );

      // Send email
      const result = await sendEmail({
        to: outreach.leadSnapshot.email,
        subject: emailContent.subject,
        text: emailContent.body,
        html: emailContent.body.replace(/\n/g, '<br>')
      });

      if (!result.success) {
        logger.error(`Failed to send email: ${result.error}`);
        
        // Update step attempts
        const stepData = outreach.emails.filter((e:any) => e.stepIndex === currentStep);
        if (stepData.length >= (step.maxAttempts || 1)) {
          // Max attempts reached, move to next step
          outreach.currentStep = currentStep + 1;
          if (outreach.currentStep >= outreach.totalSteps) {
            outreach.status = 'failed';
          }
        }
        
        await outreach.save();
        return false;
      }

      // Update outreach
      outreach.emails.push({
        to: outreach.leadSnapshot.email,
        subject: emailContent.subject,
        body: emailContent.body,
        sentAt: new Date(),
        status: 'sent',
        messageId: result.messageId,
        templateName: step.template,
        stepIndex: currentStep
      });

      // Move to next step
      outreach.currentStep = currentStep + 1;
      outreach.lastContactedAt = new Date();

      // Schedule next follow-up
      if (outreach.currentStep < outreach.totalSteps) {
        const nextStep = sequence.steps[outreach.currentStep];
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + nextStep.delay);
        outreach.nextFollowUpAt = nextDate;
      } else {
        outreach.status = 'completed';
        outreach.completedAt = new Date();
        outreach.nextFollowUpAt = undefined;
      }

      await outreach.save();
      
      logger.success(`✅ Email ${currentStep + 1}/${outreach.totalSteps} sent for ${outreachId}`);
      return true;

    } catch (error) {
      logger.error('Failed to send next email:', error);
      return false;
    }
  }

  /**
   * Process all pending follow-ups (called by cron)
   */
  async processFollowUps(): Promise<number> {
    try {
      await connectToDatabase();
      
      const now = new Date();
      const dueOutreach = await Outreach.find({
        status: 'active',
        nextFollowUpAt: { $lte: now }
      }).sort({ nextFollowUpAt: 1 });

      logger.info(`📨 Found ${dueOutreach.length} follow-ups due`);

      let processedCount = 0;
      for (const outreach of dueOutreach) {
        const success = await this.sendNextEmail(outreach._id.toString());
        if (success) processedCount++;
      }

      logger.success(`✅ Processed ${processedCount}/${dueOutreach.length} follow-ups`);
      return processedCount;

    } catch (error) {
      logger.error('Failed to process follow-ups:', error);
      return 0;
    }
  }

  /**
   * Update email status (webhook)
   */
  async updateEmailStatus(messageId: string, event: string, timestamp: Date): Promise<boolean> {
    try {
      await connectToDatabase();
      
      const outreach = await Outreach.findOne({
        'emails.messageId': messageId
      });

      if (!outreach) {
        logger.warn(`No outreach found for messageId: ${messageId}`);
        return false;
      }

      const email = outreach.emails.find((e:any) => e.messageId === messageId);
      if (!email) return false;

      // Update based on event
      switch (event) {
        case 'opened':
          email.openedAt = timestamp;
          email.status = 'opened';
          break;
        case 'clicked':
          email.clickedAt = timestamp;
          email.status = 'clicked';
          break;
        case 'replied':
          email.repliedAt = timestamp;
          email.status = 'replied';
          outreach.status = 'completed';
          outreach.completedAt = timestamp;
          outreach.nextFollowUpAt = undefined;
          break;
        case 'bounced':
          email.status = 'bounced';
          email.error = 'Email bounced';
          break;
      }

      await outreach.save();
      
      logger.info(`📧 Email ${messageId} marked as ${event}`);
      return true;

    } catch (error) {
      logger.error('Failed to update email status:', error);
      return false;
    }
  }

  /**
   * Pause outreach
   */
  async pauseOutreach(outreachId: string): Promise<boolean> {
    try {
      await connectToDatabase();
      
      await Outreach.findByIdAndUpdate(outreachId, {
        status: 'paused',
        nextFollowUpAt: undefined
      });
      
      logger.info(`⏸️ Outreach ${outreachId} paused`);
      return true;

    } catch (error) {
      logger.error('Failed to pause outreach:', error);
      return false;
    }
  }

  /**
   * Resume outreach
   */
  async resumeOutreach(outreachId: string): Promise<boolean> {
    try {
      await connectToDatabase();
      
      const outreach = await Outreach.findById(outreachId);
      if (!outreach) return false;

      const sequence = await Sequence.findOne({ id: outreach.sequenceId });
      if (!sequence) return false;

      if (outreach.currentStep < outreach.totalSteps) {
        const nextStep = sequence.steps[outreach.currentStep];
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + nextStep.delay);
        
        outreach.status = 'active';
        outreach.nextFollowUpAt = nextDate;
        await outreach.save();
      }

      logger.info(`▶️ Outreach ${outreachId} resumed`);
      return true;

    } catch (error) {
      logger.error('Failed to resume outreach:', error);
      return false;
    }
  }

  /**
   * Get outreach status
   */
  async getOutreachStatus(outreachId: string): Promise<IOutreach | null> {
    try {
      await connectToDatabase();
      return await Outreach.findById(outreachId);
    } catch (error) {
      logger.error('Failed to get outreach status:', error);
      return null;
    }
  }

  /**
   * Get outreach for a lead
   */
  async getOutreachForLead(leadId: string, leadType: 'main' | 'inbound'): Promise<IOutreach | null> {
    try {
      await connectToDatabase();
      
      const query = leadType === 'main' 
        ? { leadId }
        : { inboundLeadId: leadId };
      
      return await Outreach.findOne(query).sort({ startedAt: -1 });
    } catch (error) {
      logger.error('Failed to get outreach for lead:', error);
      return null;
    }
  }

  /**
   * Get all active outreach
   */
  async getActiveOutreach(): Promise<IOutreach[]> {
    try {
      await connectToDatabase();
      return await Outreach.find({ 
        status: 'active',
        nextFollowUpAt: { $exists: true }
      }).sort({ nextFollowUpAt: 1 });
    } catch (error) {
      logger.error('Failed to get active outreach:', error);
      return [];
    }
  }

  /**
   * Get outreach stats
   */
  async getOutreachStats() {
    try {
      await connectToDatabase();
      
      const [total, active, completed, replied] = await Promise.all([
        Outreach.countDocuments(),
        Outreach.countDocuments({ status: 'active' }),
        Outreach.countDocuments({ status: 'completed' }),
        Outreach.countDocuments({ 'emails.repliedAt': { $exists: true } })
      ]);

      const bySequence = await Outreach.aggregate([
        { $group: { _id: '$sequenceId', count: { $sum: 1 } } }
      ]);

      return {
        total,
        active,
        completed,
        replied,
        replyRate: total > 0 ? (replied / total) * 100 : 0,
        bySequence
      };

    } catch (error) {
      logger.error('Failed to get outreach stats:', error);
      return null;
    }
  }
}

// Export singleton
export const outreachService = new OutreachService();