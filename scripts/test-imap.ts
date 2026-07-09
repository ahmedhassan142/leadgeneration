// scripts/test-imap-simple.ts
import dotenv from 'dotenv';
import path from 'path';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testIMAPSimple() {
  console.log('\n📧 SIMPLE IMAP TEST - FETCH RECENT EMAILS');
  console.log('==========================================\n');

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASSWORD || '',
    },
    logger: false,
  });

  try {
    await client.connect();
    console.log('✅ Connected to IMAP\n');

    const lock = await client.getMailboxLock('INBOX');
    try {
      // Open mailbox and get count
      const mailbox = await client.mailboxOpen('INBOX');
      console.log(`📬 Inbox has ${mailbox.exists} messages\n`);

      // Get last 10 messages
      const start = Math.max(1, mailbox.exists - 9);
      const end = mailbox.exists;
      
      console.log(`📧 Fetching messages ${start} to ${end}...\n`);
      
      let count = 0;
      for await (const message of client.fetch(`${start}:${end}`, { 
        envelope: true,
        source: true
      })) {
        count++;
        
        // Check if source exists
        if (!message.source) {
          console.log(`[${count}] No source data available`);
          continue;
        }
        
        // Parse the email
        const parsed = await simpleParser(message.source);
        
        const subject = parsed.subject || '(no subject)';
        const from = parsed.from?.text || 'Unknown';
        const date = parsed.date ? new Date(parsed.date) : new Date();
        
        console.log(`[${count}] ${date.toLocaleString()}`);
        console.log(`    From: ${from}`);
        console.log(`    Subject: ${subject}`);
        
        // Check if it's a reply
        const inReplyTo = parsed.headers?.get('in-reply-to');
        if (inReplyTo) {
          console.log(`    ⭐ This is a REPLY to: ${inReplyTo}`);
          const content = parsed.text || parsed.html || '';
          console.log(`    Content: ${content.substring(0, 150)}...`);
        }
        console.log();
      }
      
      console.log(`✅ Fetched ${count} messages`);

    } finally {
      lock.release();
    }

    await client.close();
    console.log('✅ Done');

  } catch (error: any) {
    console.error('❌ Error:', error.message || error);
  }
}

testIMAPSimple();