// SMTP test - send a test email through Hostinger
import dotenv from 'dotenv';
import path from 'path';
import nodemailer from 'nodemailer';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testSMTP() {
  console.log('\n📧 HOSTINGER SMTP TEST');
  console.log('======================\n');

  const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASSWORD || '';
  const fromEmail = process.env.SMTP_FROM_EMAIL || user;

  console.log(`Host: ${host}`);
  console.log(`Port: ${port}`);
  console.log(`User: ${user}`);
  console.log(`From: ${fromEmail}`);
  console.log(`Password: ${pass ? '***present***' : '***MISSING***'}\n`);

  if (!user || !pass) {
    console.error('❌ SMTP_USER or SMTP_PASSWORD not set');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  // Verify connection first
  console.log('1) Verifying SMTP connection...');
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified\n');
  } catch (err: any) {
    console.error('❌ SMTP verify failed:', err.message);
    process.exit(1);
  }

  // Try sending a real email to itself (round-trip test)
  console.log('2) Sending test email to self:', user);
  try {
    const info = await transporter.sendMail({
      from: `"Lead Gen Test" <${fromEmail}>`,
      to: user,
      subject: `[Lead Gen Test] SMTP works ${new Date().toISOString()}`,
      text: `Hello,\n\nThis is a test email from the leadgeneration platform.\nIf you received this, SMTP is working correctly.\n\nTimestamp: ${new Date().toISOString()}`,
      html: `<p>Hello,</p><p>This is a test email from the <b>leadgeneration</b> platform.</p><p>If you received this, SMTP is working correctly.</p><p>Timestamp: ${new Date().toISOString()}</p>`,
    });
    console.log('✅ Email sent!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('   Accepted:', info.accepted);
  } catch (err: any) {
    console.error('❌ Send failed:', err.message);
    process.exit(1);
  }

  transporter.close();
  process.exit(0);
}

testSMTP();
