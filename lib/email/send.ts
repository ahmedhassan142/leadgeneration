// lib/email/send.ts
import nodemailer from 'nodemailer';
import { logger } from '@/lib/scraper/utils/logger';

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
}

// Create transporter (lazy initialization)
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    const host = process.env.SMTP_HOST||'smtp.hostinger.com';
    const port = parseInt(process.env.SMTP_PORT || '465');
    const user = process.env.SMTP_USER||'ahmed@ahtech.fun';
    const pass = process.env.SMTP_PASSWORD||'@Hmed1254';

    if (!host || !user || !pass) {
      throw new Error('SMTP configuration missing. Check your environment variables.');
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: { user, pass },
      pool: true, // Use connection pool
      maxConnections: 5,
      maxMessages: 40,
      rateDelta: 180000, // 1 second between messages
      rateLimit: 1, // Max 5 emails per second
    });

    // Verify connection
    transporter.verify((error, success) => {
      if (error) {
        logger.error('❌ SMTP connection failed', error);
      } else {
        //@ts-ignore
        logger.success('✅ SMTP connection ready');
      }
    });
  }
  return transporter;
}

// Send a single email
export async function sendEmail(options: EmailOptions): Promise<EmailResponse> {
    //@ts-ignore 
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
    };

    logger.info('📧 Sending email', { 
      to: mailOptions.to, 
      subject: mailOptions.subject 
    });

    const info = await transporter.sendMail(mailOptions);
    
    const duration = timer.end('Email sent successfully', { 
      to: mailOptions.to,
      messageId: info.messageId 
    });

    return {
      success: true,
      messageId: info.messageId,
      details: {
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected,
        duration: `${duration}ms`
      }
    };

  } catch (error) {
    //@ts-ignore 
    logger.error('❌ Failed to send email', error, { to: options.to });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    };
  }
}

// Send multiple emails (batch)
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
   
  //@ts-ignore 
  logger.success(`✅ Batch complete: ${successful} sent, ${failed} failed`);
  
  return {
    success: successful,
    failed,
    results: results.map(r => 
      r.status === 'fulfilled' ? r.value : { success: false, error: r.reason }
    )
  };
}

// Send outreach email to a lead
export async function sendOutreachEmail(lead: any, template?: string): Promise<EmailResponse> {
  if (!lead.emails || lead.emails.length === 0) {
    return {
      success: false,
      error: 'No email addresses found for this lead'
    };
  }

  const subject = lead.outreach?.subject || `Quick question about ${lead.name}`;
  const message = lead.outreach?.message || generateDefaultMessage(lead);

  return sendEmail({
    to: lead.emails[0],
    subject,
    text: message,
    html: message.replace(/\n/g, '<br>')
  });
}

// Generate default email message
function generateDefaultMessage(lead: any): string {
  const issues = lead.ai?.issues || [];
  const mainIssue = issues[0] || 'improve your online presence';
  
  return `Hi there,

I was just checking out ${lead.name}'s website and noticed you could ${mainIssue.toLowerCase()}.

We specialize in helping ${lead.niche} businesses get more customers online. Would you be open to a quick chat about how we could help?

Happy to share some specific ideas for your site.

Best regards

P.S. You're one of the few businesses in ${lead.location} I've reached out to because I see real potential.`;
}

// Verify email configuration
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

// Test email configuration
export async function sendTestEmail(to: string): Promise<EmailResponse> {
  return sendEmail({
    to,
    subject: 'Test Email from LeadGen Copilot',
    text: `This is a test email to verify your email configuration.

If you're receiving this, your SMTP settings are working correctly!

Time: ${new Date().toLocaleString()}

Best regards,
LeadGen Copilot`,
    html: `
      <h2>Test Email</h2>
      <p>This is a test email to verify your email configuration.</p>
      <p>If you're receiving this, your SMTP settings are working correctly!</p>
      <hr>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      <p><em>Best regards,<br>LeadGen Copilot</em></p>
    `
  });
}

// Close SMTP connection
export async function closeEmailConnection() {
  if (transporter) {
    transporter.close();
    transporter = null;
    logger.info('📧 Email connection closed');
  }
}

// Email validation helper
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Extract domain from email
export function getEmailDomain(email: string): string | null {
  if (!validateEmail(email)) return null;
  return email.split('@')[1];
}