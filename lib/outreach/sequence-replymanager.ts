// lib/outreach/sequence-reply-manager.ts - UPDATED FOR NEW SEQUENCE MODEL
import { Sequence } from '@/lib/db/models/Sequence';
import { Outreach } from '@/lib/db/models/Outreach';
import { Lead } from '@/lib/db/models/Lead';
import { EmailHistory } from '@/lib/db/models/EmailHistory';
import { logger } from '@/lib/scraper/utils/logger';
import { followupQueue } from '@/lib/queue/followup-queue';

export class SequenceReplyManager {
  
  /**
   * Add a reply to sequence and stop the outreach
   */
  async addReply(
    sequenceId: string,
    leadId: string,
    leadName: string,
    leadEmail: string,
    step: number,
    originalMessageId: string,
    replyContent: string,
    fromEmail: string,
    receivedAt: Date,
    replySubject?: string
  ): Promise<boolean> {
    try {
      const stepName = this.getStepName(step);
      const stepKey = `step${step}` as keyof typeof Sequence.prototype.stats.totalRepliesByStep;
      
      // 1. Update Sequence with reply (using new structure)
      const update: any = {
        $inc: {
          'stats.totalReplied': 1,
          [`stats.totalRepliesByStep.${stepKey}`]: 1
        },
        $push: {
          'stats.replies': {  // ✅ Store in 'replies' array (full details)
            leadId,
            leadName,
            leadEmail,
            step,
            stepName,
            content: replyContent,
            fromEmail,
            receivedAt,
            subject: replySubject || '',
            status: 'received'
          },
          'stats.latestReplies': {  // ✅ Keep 'latestReplies' for quick access
            leadName,
            leadEmail,
            step,
            content: replyContent,
            receivedAt,
            fromEmail
          }
        },
        $set: {
          'stats.lastUsed': new Date()
        }
      };

      await Sequence.updateOne({ id: sequenceId }, update);
      
      // 2. Update Outreach to mark as completed
      const outreach = await Outreach.findOneAndUpdate(
        { 'emails.messageId': originalMessageId },
        {
          $set: {
            status: 'completed',
            completedAt: receivedAt,
            completedReason: `Replied to ${stepName} email`,
            'emails.$.repliedAt': receivedAt,
            'emails.$.replyContent': replyContent,
            'emails.$.replyFrom': fromEmail,
            'emails.$.replySubject': replySubject,
            'emails.$.status': 'replied'
          }
        },
        { new: true }
      );
      
      // 3. Update EmailHistory if exists
      if (originalMessageId) {
        await EmailHistory.findOneAndUpdate(
          { messageId: originalMessageId },
          {
            $set: {
              status: 'replied',
              repliedAt: receivedAt,
              replyContent: replyContent,
              replyFrom: fromEmail,
              replySubject: replySubject
            }
          }
        );
      }
      
      // 4. Remove from follow-up queue
      followupQueue.remove(leadName);
      
      // 5. Update Lead record with reply metadata
      await Lead.findByIdAndUpdate(leadId, {
        $set: {
          status: 'contacted',
          lastContactedAt: receivedAt,
          emailSequenceStatus: 'replied',  // ✅ Update sequence status
          lastEmailSentAt: receivedAt,      // ✅ Update last email time
          'metadata.lastReplyAt': receivedAt,
          'metadata.lastReplyStep': step,
          'metadata.lastReplyType': stepName,
          'metadata.lastReplyFrom': fromEmail,
          'metadata.lastReplyContent': replyContent
        },
        $push: {
          'metadata.replies': {
            timestamp: receivedAt,
            step,
            emailType: stepName,
            content: replyContent,
            from: fromEmail,
            subject: replySubject,
            messageId: originalMessageId
          }
        }
      });
      
      logger.info(`✅ Reply added to sequence ${sequenceId} for lead ${leadName} (Step ${step})`);
      logger.info(`   Reply preview: ${replyContent.substring(0, 100)}...`);
      
      // 6. Recalculate rates
      await this.recalculateRates(sequenceId);
      
      return true;
      
    } catch (error) {
      logger.error('Failed to add reply to sequence:', error);
      return false;
    }
  }
  
  /**
   * Get all replies for a sequence (using new replies array)
   */
  async getRepliesForSequence(sequenceId: string, limit: number = 50) {
    try {
      const sequence = await Sequence.findOne({ id: sequenceId });
      if (!sequence) return [];
      
      // Use the new 'replies' array for full details
      const replies = sequence.stats?.replies || [];
      
      return replies
        .sort((a: any, b: any) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
        .slice(0, limit);
      
    } catch (error) {
      logger.error('Failed to get replies for sequence:', error);
      return [];
    }
  }
  
  /**
   * Get replies for a specific lead
   */
  async getRepliesForLead(leadId: string) {
    try {
      const sequences = await Sequence.find({
        'stats.replies.leadId': leadId
      }).lean();
      
      const replies: any[] = [];
      
      for (const seq of sequences) {
        const leadReplies = (seq.stats?.replies || [])
          .filter((r: any) => r.leadId === leadId)
          .map((r: any) => ({
            sequenceId: seq.id,
            sequenceName: seq.name,
            step: r.step,
            stepName: r.stepName,
            content: r.content,
            fromEmail: r.fromEmail,
            receivedAt: r.receivedAt,
            subject: r.subject,
            status: r.status
          }));
        
        replies.push(...leadReplies);
      }
      
      return replies.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
      
    } catch (error) {
      logger.error('Failed to get replies for lead:', error);
      return [];
    }
  }
  
  /**
   * Get all replies across all sequences
   */
  async getAllReplies(limit: number = 100) {
    try {
      const sequences = await Sequence.find({ 
        'stats.replies.0': { $exists: true } 
      }).lean();
      
      let allReplies: any[] = [];
      
      for (const seq of sequences) {
        const replies = (seq.stats?.replies || []).map((r: any) => ({
          leadId: r.leadId,
          leadName: r.leadName,
          leadEmail: r.leadEmail,
          step: r.step,
          stepName: r.stepName,
          content: r.content,
          fromEmail: r.fromEmail,
          receivedAt: r.receivedAt,
          subject: r.subject,
          sequenceId: seq.id,
          sequenceName: seq.name
        }));
        
        allReplies.push(...replies);
      }
      
      return allReplies
        .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
        .slice(0, limit);
      
    } catch (error) {
      logger.error('Failed to get all replies:', error);
      return [];
    }
  }
  
  /**
   * Get reply statistics with improved accuracy
   */
  async getReplyStats() {
    try {
      const sequences = await Sequence.find({}).lean();
      
      let totalReplies = 0;
      let totalSent = 0;
      const repliesByStep = {
        step1: 0,
        step2: 0,
        step3: 0,
        step4: 0
      };
      const recentReplies: any[] = [];
      
      for (const seq of sequences) {
        totalReplies += seq.stats?.totalReplied || 0;
        totalSent += seq.stats?.totalSent || 0;
        repliesByStep.step1 += seq.stats?.totalRepliesByStep?.step1 || 0;
        repliesByStep.step2 += seq.stats?.totalRepliesByStep?.step2 || 0;
        repliesByStep.step3 += seq.stats?.totalRepliesByStep?.step3 || 0;
        repliesByStep.step4 += seq.stats?.totalRepliesByStep?.step4 || 0;
        
        // Get recent replies from the full replies array
        const recent = (seq.stats?.replies || [])
          .sort((a: any, b: any) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
          .slice(0, 5)
          .map((r: any) => ({
            leadName: r.leadName,
            leadEmail: r.leadEmail,
            step: r.step,
            stepName: r.stepName,
            content: r.content.substring(0, 150),
            fromEmail: r.fromEmail,
            receivedAt: r.receivedAt,
            subject: r.subject,
            sequenceId: seq.id,
            sequenceName: seq.name
          }));
        
        recentReplies.push(...recent);
      }
      
      // Calculate overall conversion rate
      const overallConversionRate = totalSent > 0 ? (totalReplies / totalSent) * 100 : 0;
      
      return {
        totalReplies,
        totalSent,
        overallConversionRate: overallConversionRate.toFixed(2),
        repliesByStep: [
          { step: 1, stepName: 'First Email', count: repliesByStep.step1, percentage: totalReplies > 0 ? ((repliesByStep.step1 / totalReplies) * 100).toFixed(1) : '0' },
          { step: 2, stepName: 'Follow-up 1', count: repliesByStep.step2, percentage: totalReplies > 0 ? ((repliesByStep.step2 / totalReplies) * 100).toFixed(1) : '0' },
          { step: 3, stepName: 'Follow-up 2', count: repliesByStep.step3, percentage: totalReplies > 0 ? ((repliesByStep.step3 / totalReplies) * 100).toFixed(1) : '0' },
          { step: 4, stepName: 'Final Email', count: repliesByStep.step4, percentage: totalReplies > 0 ? ((repliesByStep.step4 / totalReplies) * 100).toFixed(1) : '0' }
        ],
        recentReplies: recentReplies
          .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
          .slice(0, 10)
      };
      
    } catch (error) {
      logger.error('Failed to get reply stats:', error);
      return {
        totalReplies: 0,
        totalSent: 0,
        overallConversionRate: '0',
        repliesByStep: [],
        recentReplies: []
      };
    }
  }
  
  /**
   * Check if a lead has already replied to any email
   */
  async hasLeadReplied(leadId: string): Promise<boolean> {
    try {
      const sequences = await Sequence.find({
        'stats.replies.leadId': leadId
      }).limit(1);
      
      return sequences.length > 0;
    } catch (error) {
      logger.error('Failed to check if lead replied:', error);
      return false;
    }
  }
  
  /**
   * Get reply by original message ID
   */
  async getReplyByMessageId(messageId: string) {
    try {
      const sequences = await Sequence.find({
        'stats.replies.messageId': messageId
      }).lean();
      
      for (const seq of sequences) {
        const reply = (seq.stats?.replies || []).find((r: any) => r.messageId === messageId);
        if (reply) {
          return {
            ...reply,
            sequenceId: seq.id,
            sequenceName: seq.name
          };
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to get reply by message ID:', error);
      return null;
    }
  }
  
  /**
   * Recalculate conversion and reply rates
   */
  async recalculateRates(sequenceId: string) {
    try {
      const sequence = await Sequence.findOne({ id: sequenceId });
      if (!sequence) return;
      
      const totalOutreaches = await Outreach.countDocuments({ sequenceId });
      const totalReplied = sequence.stats?.totalReplied || 0;
      
      const conversionRate = totalOutreaches > 0 
        ? (totalReplied / totalOutreaches) * 100 
        : 0;
      
      await Sequence.updateOne(
        { id: sequenceId },
        {
          $set: {
            'stats.conversionRate': conversionRate
          }
        }
      );
      
    } catch (error) {
      logger.error('Failed to recalculate rates:', error);
    }
  }
  
  /**
   * Delete a reply (admin function)
   */
  async deleteReply(sequenceId: string, replyId: string) {
    try {
      const result = await Sequence.updateOne(
        { id: sequenceId },
        {
          $pull: {
            'stats.replies': { _id: replyId },
            'stats.latestReplies': { _id: replyId }
          },
          $inc: {
            'stats.totalReplied': -1
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        await this.recalculateRates(sequenceId);
        logger.info(`✅ Reply deleted from sequence ${sequenceId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Failed to delete reply:', error);
      return false;
    }
  }
  
  private getStepName(step: number): string {
    switch(step) {
      case 1: return 'first';
      case 2: return 'followup-1';
      case 3: return 'followup-2';
      case 4: return 'final';
      default: return 'unknown';
    }
  }
}

export const sequenceReplyManager = new SequenceReplyManager();