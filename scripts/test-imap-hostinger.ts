// Modified IMAP test using Hostinger IMAP server
// (the original test-imap.ts is hardcoded to imap.gmail.com)
import dotenv from 'dotenv';
import path from 'path';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testHostingerIMAP() {
  console.log('\n📧 HOSTINGER IMAP TEST - FETCH RECENT EMAILS');
  console.log('============================================\n');

  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASSWORD || '';
  const host = 'imap.hostinger.com';

  console.log(`Host: ${host}`);
  console.log(`User: ${user}`);
  console.log(`Password: ${pass ? '***present***' : '***MISSING***'}\n`);

  if (!user || !pass) {
    console.error('❌ SMTP_USER or SMTP_PASSWORD not set in .env.local');
    process.exit(1);
  }

  const client = new ImapFlow({
    host,
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  try {
    await client.connect();
    console.log('✅ Connected to Hostinger IMAP\n');

    const lock = await client.getMailboxLock('INBOX');
    try {
      const mailbox = await client.mailboxOpen('INBOX');
      console.log(`📬 Inbox has ${mailbox.exists} messages\n`);

      const start = Math.max(1, mailbox.exists - 9);
      const end = mailbox.exists;
      console.log(`📧 Fetching messages ${start} to ${end}...\n`);

      let count = 0;
      for await (const message of client.fetch(`${start}:${end}`, {
        envelope: true,
        source: true,
      })) {
        count++;
        if (!message.source) {
          console.log(`[${count}] No source data available`);
          continue;
        }
        const parsed = await simpleParser(message.source);
        const subject = parsed.subject || '(no subject)';
        const from = parsed.from?.text || 'Unknown';
        const date = parsed.date ? new Date(parsed.date) : new Date();
        console.log(`[${count}] ${date.toLocaleString()}`);
        console.log(`    From: ${from}`);
        console.log(`    Subject: ${subject}`);
        const inReplyTo = parsed.headers?.get('in-reply-to');
        if (inReplyTo) {
          console.log(`    ⭐ REPLY to: ${inReplyTo}`);
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
    process.exit(1);
  }
  process.exit(0);
}

testHostingerIMAP();
