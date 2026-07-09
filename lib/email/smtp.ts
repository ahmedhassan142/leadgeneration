// lib/email/smtp.ts
import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

export function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 5
    });
  }
  return transporter;
}

export async function verifyConnection() {
  const transporter = getTransporter();
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('SMTP connection failed:', error);
    return false;
  }
}

export function closeConnection() {
  if (transporter) {
    transporter.close();
    transporter = null;
  }
}