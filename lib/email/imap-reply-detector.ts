// lib/email/imap-reply-detector.ts - USING SIMPLE FETCH APPROACH
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { logger } from '@/lib/scraper/utils/logger';
import { sequenceManager } from '@/lib/outreach/sequence';
import { Outreach } from '@/lib/db/models/Outreach';

export class IMAPReplyDetector {
  private client: any;
  private interval: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private isConnected = false;

  async connect() {
    if (this.isConnecting) return false;
    if (this.isConnected && this.client?.connected) return true;

    this.isConnecting = true;
    
    try {
      const user = process.env.SMTP_USER || "ah770643@gmail.com";
      const pass = process.env.SMTP_PASSWORD || "YOUR_GMAIL_APP_PASSWORD";

      if (!user || !pass) {
        console.error('❌ SMTP_USER or SMTP_PASSWORD not set');
        this.isConnecting = false;
        return false;
      }

      console.log(`📧 Connecting to IMAP with user: ${user}`);
      
      this.client = new ImapFlow({
        host: 'imap.gmail.com',
        port: 993,
        secure: true,
        auth: { user, pass },
        logger: false,
      });

      await this.client.connect();
      console.log('✅ IMAP connected to imap.gmail.com:993');
      this.isConnected = true;
      this.isConnecting = false;
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to IMAP:', error);
      this.isConnected = false;
      this.isConnecting = false;
      return false;
    }
  }

  async checkForReplies() {
    try {
      if (!this.isConnected || !this.client?.connected) {
        const connected = await this.connect();
        if (!connected) return;
      }

      const activeOutreaches = await Outreach.find({
        status: 'active',
        'emails.sentAt': { $exists: true },
        'emails.repliedAt': { $exists: false }
      }).lean();

      if (activeOutreaches.length === 0) return;

      console.log(`🔍 Checking ${activeOutreaches.length} active sequences for replies...`);

      const lock = await this.client.getMailboxLock('INBOX');
      try {
        // Get the last 20 messages from inbox
        const mailbox = await this.client.mailboxOpen('INBOX');
        const start = Math.max(1, mailbox.exists - 19);
        const end = mailbox.exists;
        
        console.log(`📧 Fetching messages ${start} to ${end} from inbox...`);
        
        // Fetch recent messages
        const messages = [];
        for await (const message of this.client.fetch(`${start}:${end}`, { 
          envelope: true,
          source: true
        })) {
          messages.push(message);
        }
        
        console.log(`📧 Fetched ${messages.length} recent messages`);
        
        // Process each message to find replies
        for (const message of messages) {
          if (!message.source) continue;
          
          const parsed = await simpleParser(message.source);
          
          // Check if this is a reply
          const inReplyTo = parsed.headers?.get('in-reply-to');
          if (!inReplyTo) continue;
          
          console.log(`\n📧 Found reply: "${parsed.subject}"`);
          console.log(`   In-Reply-To: ${inReplyTo}`);
          
          // Look for this reply in active outreaches
          for (const outreach of activeOutreaches) {
            for (const sentEmail of outreach.emails) {
              if (sentEmail.repliedAt) continue;
              
              // Check if the reply matches any sent email
              const bracketedMessageId = sentEmail.messageId.includes('<') 
                ? sentEmail.messageId 
                : `<${sentEmail.messageId}>`;
              
              if (inReplyTo === bracketedMessageId || inReplyTo === sentEmail.messageId) {
                console.log(`\n✅ MATCH FOUND!`);
                console.log(`   Original email: "${sentEmail.subject}" (Step ${sentEmail.stepIndex})`);
                console.log(`   Original MessageId: ${sentEmail.messageId}`);
                console.log(`   Reply In-Reply-To: ${inReplyTo}`);
                
                const replyContent = parsed.text || parsed.html || 'No content available';
                const fromEmail = parsed.from?.text || 'Unknown';
                const replySubject = parsed.subject || `Re: ${sentEmail.subject}`;
                
                console.log('\n' + '='.repeat(70));
                console.log(`💬 REPLY DETECTED!`);
                console.log(`   Lead: ${outreach.leadSnapshot.name}`);
                console.log(`   From: ${fromEmail}`);
                console.log(`   Reply: ${replyContent.substring(0, 200)}...`);
                console.log('='.repeat(70) + '\n');

                await sequenceManager.handleReply(
                  sentEmail.messageId,
                  replyContent,
                  fromEmail,
                  new Date(),
                  replySubject
                );

                try {
                  await this.client.messageMove(message.uid, '[Gmail]/Archive');
                  console.log(`   📁 Moved reply to archive`);
                } catch (moveError) {}
                
                return; // Stop after finding first reply
              }
            }
          }
        }
        
        console.log('   No matching replies found in recent messages');
        
      } finally {
        lock.release();
      }
    } catch (error: any) {
      console.error('Error checking replies:', error);
      if (error.message?.includes('connection') || error.code === 'ECONNRESET') {
        this.isConnected = false;
      }
    }
  }

  start(intervalMs: number = 60000) {
    if (this.interval) return;
    
    console.log(`📧 Starting IMAP reply detector (checking every ${intervalMs / 1000} seconds)`);
    
    this.connect().then(connected => {
      if (connected) {
        console.log('✅ IMAP detector ready');
        setTimeout(() => this.checkForReplies(), 5000);
      }
    });
    
    this.interval = setInterval(async () => {
      await this.checkForReplies();
    }, intervalMs);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.client) {
      this.client.close();
      this.isConnected = false;
    }
    console.log('📧 IMAP reply detector stopped');
  }
}

export const imapReplyDetector = new IMAPReplyDetector();