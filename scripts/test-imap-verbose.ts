import dotenv from 'dotenv';
import path from 'path';
import { ImapFlow } from 'imapflow';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASSWORD || '';
  console.log('Connecting to imap.hostinger.com:993 as', user);
  const client = new ImapFlow({
    host: 'imap.hostinger.com',
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: (entry: any) => {
      // print raw IMAP protocol lines for debugging
      if (entry && (entry.type === 'sent' || entry.type === 'received')) {
        console.log(`[${entry.type}] ${entry.msg || ''}`.substring(0, 240));
      }
    },
  });
  try {
    await client.connect();
    console.log('✅ Connected');
    const lock = await client.getMailboxLock('INBOX');
    try {
      const status = await client.status('INBOX', { messages: true, unseen: true });
      console.log('Inbox status:', status);
    } finally {
      lock.release();
    }
    await client.close();
    console.log('✅ Done');
  } catch (err: any) {
    console.error('❌ Failed:', err?.message || err);
    if (err?.response) console.error('Response:', err.response);
    process.exit(1);
  }
}
main();
