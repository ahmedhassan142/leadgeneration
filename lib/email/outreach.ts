// lib/email/send.ts
import nodemailer from 'nodemailer';
import { logger } from '@/lib/scraper/utils/logger';
import { generateColdEmail } from '@/lib/ai/cold-email-generator';
import { generateWarmEmail } from '@/lib/ai/warm-email-generator';
import { Lead } from '@/lib/db/models/Lead';
import { Outreach } from '@/lib/db/models/Outreach';

interface EmailOptions {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: any;
  leadId?: string;
  modelUsed?: string;
  emailType?: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER || 'ah770643@gmail.com';
    const pass = process.env.SMTP_PASSWORD || 'YOUR_GMAIL_APP_PASSWORD';

    if (!host || !user || !pass) {
      throw new Error('SMTP configuration missing.');
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 5,
    });

    transporter.verify((error, success) => {
      if (error) {
        logger.error('❌ SMTP connection failed', error);
      } else {
        logger.success('✅ SMTP connection ready');
      }
    });
  }
  return transporter;
}

export async function sendEmail(options: EmailOptions): Promise<EmailResponse> {
  const timer = logger.timer('send-email');
  
  try {
    const transporter = getTransporter();
    const from = options.from || process.env.SMTP_FROM || process.env.SMTP_USER;
    
    const mailOptions = {
      from: `"LeadGen Copilot" <${from}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
      bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text.replace(/\n/g, '<br>'),
      attachments: options.attachments,
      headers: {
        'X-Mailer': 'LeadGen Copilot',
        'List-Unsubscribe': `<mailto:${from}?subject=unsubscribe>`
      }
    };

    logger.info('📧 Sending email', { to: mailOptions.to, subject: mailOptions.subject });

    const info = await transporter.sendMail(mailOptions);
    
    timer.end('Email sent successfully', { to: mailOptions.to, messageId: info.messageId });

    return {
      success: true,
      messageId: info.messageId,
      details: { response: info.response, accepted: info.accepted, rejected: info.rejected }
    };

  } catch (error) {
    logger.error('❌ Failed to send email', error, { to: options.to });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    };
  }
}

/**
 * Generate email based on lead quality and email type
 * This is the core quality-based email generator
 */
async function generateEmailByQuality(
  lead: any, 
  emailType: 'first' | 'followup' | 'followup-2' | 'final',
  previousInteractions?: string
): Promise<any> {
  const isCold = lead.quality === 'cold' || (lead.score && lead.score < 40);
  const isWarm = lead.quality === 'warm' || (lead.score && lead.score >= 40 && lead.score < 70);
  const isHot = lead.quality === 'hot' || (lead.score && lead.score >= 70);

  logger.info(`📊 Lead: ${lead.name}, Quality: ${lead.quality}, Score: ${lead.score}, Email Type: ${emailType}`);

  if (isCold) {
    logger.info(`❄️ Using COLD email generator for ${lead.name} (${emailType})`);
    return await generateColdEmail({
      lead: lead,
      companyName: lead.name,
      website: lead.website,
      source: lead.source,
      score: lead.score,
      recipientName: lead.name,
      emailType: emailType,
      previousInteractions: previousInteractions,
      sequence: 'cold-sequence'
    });
  } 
  else if (isWarm) {
    logger.info(`🌡️ Using WARM email generator for ${lead.name} (${emailType})`);
    return await generateWarmEmail({
      lead: lead,
      companyName: lead.name,
      website: lead.website,
      source: lead.source,
      score: lead.score,
      recipientName: lead.name,
      emailType: emailType,
      previousInteractions: previousInteractions,
      sequence: 'warm-sequence'
    });
  }
  else if (isHot) {
    logger.info(`🔥 HOT lead - skipping automated email for ${lead.name}`);
    return null;
  }
  else {
    // Fallback to cold generator with default type
    logger.warn(`⚠️ Unknown quality: ${lead.quality}, using cold generator`);
    return await generateColdEmail({
      lead: lead,
      companyName: lead.name,
      website: lead.website,
      source: lead.source,
      score: lead.score,
      recipientName: lead.name,
      emailType: emailType,
      previousInteractions: previousInteractions,
      sequence: 'cold-sequence'
    });
  }
}

/**
 * Send FIRST outreach email to a lead (Step 1 of sequence)
 */
export async function sendOutreachEmailToLead(lead: any): Promise<EmailResponse> {
  const timer = logger.timer(`outreach-email-${lead._id}`);
  
  try {
    const emailAddress = lead.email || lead.contactInfo?.email;
    if (!emailAddress) {
      return {
        success: false,
        error: 'No email address found for this lead',
        leadId: lead._id?.toString()
      };
    }

    logger.info(`📧 Generating FIRST OUTREACH email for ${lead.name} (Quality: ${lead.quality})`);

    // Generate first email based on quality
    const emailContent = await generateEmailByQuality(lead, 'first');

    if (!emailContent) {
      // Hot lead - skip automated email
      return {
        success: true,
        messageId: 'skipped-hot-lead',
        leadId: lead._id?.toString(),
        modelUsed: 'skipped',
        emailType: 'first'
      };
    }

    const emailResponse = await sendEmail({
      to: emailAddress,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html
    });

    if (emailResponse.success && lead._id) {
      // Update lead with outreach info
      await Lead.findByIdAndUpdate(lead._id, {
        $set: {
          'outreach.lastEmailSent': new Date(),
          'outreach.emailSubject': emailContent.subject,
          'outreach.emailModel': emailContent.model,
          'outreach.emailType': 'first',
          'outreach.quality': lead.quality,
          'outreach.status': 'contacted',
          'outreach.generatorUsed': lead.quality === 'cold' ? 'cold-generator' : 'warm-generator'
        },
        $push: {
          'outreach.history': {
            type: 'outreach_first',
            sentAt: new Date(),
            subject: emailContent.subject,
            model: emailContent.model,
            messageId: emailResponse.messageId,
            to: emailAddress,
            quality: lead.quality,
            generator: lead.quality === 'cold' ? 'cold-generator' : 'warm-generator'
          }
        },
        status: 'contacted',
        lastContactedAt: new Date()
      });

      // Create outreach record for sequence tracking
      try {
        const outreach = await Outreach.create({
          leadId: lead._id.toString(),
          leadType: 'main',
          leadSnapshot: {
            name: lead.name || 'Unknown',
            website: lead.website,
            email: emailAddress,
            niche: lead.niche,
            location: lead.location,
            quality: lead.quality,
            score: lead.score || 0,
            source: lead.source,
            ai: lead.ai,
            analysis: lead.analysis
          },
          sequenceId: 'test-1min',
          sequenceName: 'TEST SEQUENCE - 1 Minute Intervals',
          totalSteps: 4,
          currentStep: 1,
          status: 'active',
          startedAt: new Date(),
          lastContactedAt: new Date(),
          nextFollowUpAt: new Date(Date.now() + 60 * 1000), // 1 minute for testing
          emails: [{
            to: emailAddress,
            subject: emailContent.subject,
            body: emailContent.text,
            sentAt: new Date(),
            status: 'sent',
            messageId: emailResponse.messageId,
            templateName: 'first-email',
            stepIndex: 1
          }],
          tags: [lead.quality || 'unknown', 'automated', 'first-contact']
        });
        logger.info(`✅ Outreach record created with step 1/4 for ${lead.quality} lead`);
      } catch (outreachError) {
        logger.error('❌ Failed to create outreach record:', outreachError);
      }
    }

    timer.end('✅ Outreach email sent', { to: emailAddress, model: emailContent.model, quality: lead.quality });

    return {
      ...emailResponse,
      leadId: lead._id?.toString(),
      modelUsed: emailContent.model,
      emailType: 'first'
    };

  } catch (error) {
    logger.error('❌ Failed to send outreach email', error, { leadId: lead._id });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      leadId: lead._id?.toString()
    };
  }
}

/**
 * Send follow-up email based on step number (for queue system)
 */
export async function sendFollowUpEmailToLead(
  lead: any,
  step: number,
  previousInteractions?: string
): Promise<EmailResponse> {
  const timer = logger.timer(`followup-email-${lead._id}-step-${step}`);
  
  try {
    const emailAddress = lead.email || lead.contactInfo?.email;
    if (!emailAddress) {
      return {
        success: false,
        error: 'No email address found for this lead',
        leadId: lead._id?.toString()
      };
    }

    // Map step to email type
    let emailType: 'first' | 'followup' | 'followup-2' | 'final';
    if (step === 1) {
      emailType = 'first';
    } else if (step === 2) {
      emailType = 'followup';
    } else if (step === 3) {
      emailType = 'followup-2';
    } else {
      emailType = 'final';
    }

    logger.info(`📧 Generating ${emailType} email (Step ${step}/4) for ${lead.name} (Quality: ${lead.quality})`);

    // Generate email based on quality and type
    const emailContent = await generateEmailByQuality(lead, emailType, previousInteractions);

    if (!emailContent) {
      return {
        success: true,
        messageId: 'skipped-hot-lead',
        leadId: lead._id?.toString(),
        modelUsed: 'skipped',
        emailType
      };
    }

    const emailResponse = await sendEmail({
      to: emailAddress,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html
    });

    if (emailResponse.success && lead._id) {
      // Update lead with follow-up info
      await Lead.findByIdAndUpdate(lead._id, {
        $set: {
          'outreach.lastEmailSent': new Date(),
          'outreach.emailSubject': emailContent.subject,
          'outreach.emailModel': emailContent.model,
          'outreach.emailType': emailType,
          'outreach.currentStep': step
        },
        $push: {
          'outreach.history': {
            type: `followup_${emailType}`,
            sentAt: new Date(),
            subject: emailContent.subject,
            model: emailContent.model,
            messageId: emailResponse.messageId,
            to: emailAddress,
            step: step,
            quality: lead.quality,
            generator: lead.quality === 'cold' ? 'cold-generator' : 'warm-generator'
          }
        }
      });

      // Update outreach record
      await Outreach.findOneAndUpdate(
        { leadId: lead._id.toString() },
        {
          $set: {
            currentStep: step,
            lastContactedAt: new Date(),
            nextFollowUpAt: step < 4 ? new Date(Date.now() + 60 * 1000) : null,
            status: step >= 4 ? 'completed' : 'active'
          },
          $push: {
            emails: {
              to: emailAddress,
              subject: emailContent.subject,
              body: emailContent.text,
              sentAt: new Date(),
              status: 'sent',
              messageId: emailResponse.messageId,
              templateName: `${emailType}-email`,
              stepIndex: step
            }
          }
        }
      );
    }

    timer.end('✅ Follow-up email sent', { to: emailAddress, model: emailContent.model, quality: lead.quality, step });

    return {
      ...emailResponse,
      leadId: lead._id?.toString(),
      modelUsed: emailContent.model,
      emailType
    };

  } catch (error) {
    logger.error('❌ Failed to send follow-up email', error, { leadId: lead._id, step });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      leadId: lead._id?.toString()
    };
  }
}

/**
 * Send batch emails to multiple leads (for queue processing)
 */
export async function sendBatchEmailsToLeads(
  leads: any[],
  emailType: 'first' | 'followup' | 'followup-2' | 'final',
  step?: number
): Promise<{
  total: number;
  successful: number;
  failed: number;
  results: EmailResponse[];
}> {
  logger.info(`📧 Sending batch ${emailType} emails to ${leads.length} leads`);
  
  const results: EmailResponse[] = [];
  const BATCH_SIZE = 3;
  
  for (let i = 0; i < leads.length; i += BATCH_SIZE) {
    const batch = leads.slice(i, i + BATCH_SIZE);
    
    const batchResults = await Promise.all(
      batch.map(async (lead) => {
        if (emailType === 'first') {
          return await sendOutreachEmailToLead(lead);
        } else {
          return await sendFollowUpEmailToLead(lead, step || 2);
        }
      })
    );
    
    results.push(...batchResults);
    
    // Delay between batches
    if (i + BATCH_SIZE < leads.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  logger.success(`✅ Batch complete: ${successful} sent, ${failed} failed`);
  
  return {
    total: leads.length,
    successful,
    failed,
    results
  };
}

/**
 * Legacy function - for backward compatibility
 */
export async function sendColdEmailToLead(lead: any): Promise<EmailResponse> {
  return sendOutreachEmailToLead(lead);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export async function sendBulkEmails(emails: EmailOptions[]): Promise<{
  success: number;
  failed: number;
  results: EmailResponse[];
}> {
  logger.info(`📧 Sending ${emails.length} emails in batch`);
  
  const results = await Promise.allSettled(
    emails.map(email => sendEmail(email))
  );
  
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
   
  logger.success(`✅ Batch complete: ${successful} sent, ${failed} failed`);
  
  return {
    success: successful,
    failed,
    results: results.map(r => 
      r.status === 'fulfilled' ? r.value : { success: false, error: r.reason }
    )
  };
}

export async function sendBatchColdEmails(
  leads: any[],
  options: {
    concurrency?: number;
    delayBetween?: number;
    filterByScore?: boolean;
    minScore?: number;
  } = {}
): Promise<{
  total: number;
  successful: number;
  failed: number;
  results: EmailResponse[];
}> {
  const {
    concurrency = 3,
    delayBetween = 1000,
    filterByScore = false,
    minScore = 30
  } = options;

  let leadsToProcess = leads;
  if (filterByScore) {
    leadsToProcess = leads.filter(lead => 
      (lead.score || lead.leadScore || 0) >= minScore
    );
    logger.info(`🎯 Filtered to ${leadsToProcess.length}/${leads.length} leads with score >= ${minScore}`);
  }

  const results: EmailResponse[] = [];
  const batches = [];

  for (let i = 0; i < leadsToProcess.length; i += concurrency) {
    batches.push(leadsToProcess.slice(i, i + concurrency));
  }

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    logger.info(`📦 Processing batch ${i + 1}/${batches.length} (${batch.length} leads)`);

    const batchResults = await Promise.all(
      batch.map(lead => sendColdEmailToLead(lead))
    );

    results.push(...batchResults);

    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayBetween));
    }
  }

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  logger.success(`✅ Batch cold emails complete: ${successful} sent, ${failed} failed`);

  return {
    total: leadsToProcess.length,
    successful,
    failed,
    results
  };
}

export async function sendOutreachEmail(lead: any, template?: string): Promise<EmailResponse> {
  if (!lead.emails || lead.emails.length === 0) {
    return {
      success: false,
      error: 'No email addresses found for this lead'
    };
  }

  try {
    return await sendColdEmailToLead(lead);
  } catch (error) {
    const subject = lead.outreach?.subject || `Quick question about ${lead.name}`;
    const message = generateDefaultMessage(lead);

    return sendEmail({
      to: lead.emails[0],
      subject,
      text: message,
      html: message.replace(/\n/g, '<br>')
    });
  }
}

function generateDefaultMessage(lead: any): string {
  const issues = lead.ai?.issues || [];
  const mainIssue = issues[0] || 'improve your online presence';
  
  return `Hi there,

I was just checking out ${lead.name}'s website and noticed you could ${mainIssue.toLowerCase()}.

We specialize in helping ${lead.niche || 'businesses'} get more customers online. Would you be open to a quick chat about how we could help?

Happy to share some specific ideas for your site.

Best regards

P.S. You're one of the few businesses ${lead.location ? `in ${lead.location}` : ''} I've reached out to because I see real potential.`;
}

export async function verifyEmailConfig(): Promise<boolean> {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    return true;
  } catch (error) {
    logger.error('Email configuration verification failed', error);
    return false;
  }
}

export async function sendTestEmail(to: string): Promise<EmailResponse> {
  const emailContent = await generateColdEmail({
    lead: null,
    companyName: 'Test Company',
    source: 'test',
    score: 50,
    recipientName: 'Test User',
    emailType: 'first'
  });

  return sendEmail({
    to,
    subject: `[TEST] ${emailContent.subject}`,
    text: emailContent.text,
    html: emailContent.html
  });
}

export async function closeEmailConnection() {
  if (transporter) {
    transporter.close();
    transporter = null;
    logger.info('📧 Email connection closed');
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function getEmailDomain(email: string): string | null {
  if (!validateEmail(email)) return null;
  return email.split('@')[1];
}

export function generateTrackingPixel(emailId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `<img src="${baseUrl}/api/track/open?emailId=${emailId}" width="1" height="1" style="display:none" />`;
}

export function wrapLinkWithTracking(url: string, emailId: string, linkId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/api/track/click?emailId=${emailId}&linkId=${linkId}&url=${encodeURIComponent(url)}`;
}