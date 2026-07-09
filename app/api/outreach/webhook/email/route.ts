// app/api/webhook/email/route.ts (or pages/api/webhook/email.ts)
import { NextRequest, NextResponse } from 'next/server';
import { sequenceManager } from '@/lib/outreach/sequence';
import { logger } from '@/lib/scraper/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    logger.info('📨 Webhook received:', { 
      event: body.event, 
      messageId: body.messageId,
      timestamp: body.timestamp 
    });
    
    // Handle different webhook providers (SendGrid, Resend, etc.)
    let messageId = '';
    let event = '';
    let timestamp = new Date();
    let replyContent = '';
    
    // SendGrid format
    if (body.email && body.event) {
      messageId = body.email?.message_id || body.messageId;
      event = body.event;
      timestamp = new Date(body.timestamp);
      replyContent = body.email?.text || body.email?.subject;
    }
    // Resend format
    else if (body.type) {
      messageId = body.data?.message_id || body.id;
      event = body.type;
      timestamp = new Date(body.created_at);
      replyContent = body.data?.text || body.data?.subject;
    }
    // Generic format
    else {
      messageId = body.messageId;
      event = body.event;
      timestamp = new Date(body.timestamp || Date.now());
      replyContent = body.content;
    }
    
    const result = await sequenceManager.handleWebhook(
      messageId,
      event,
      timestamp,
      replyContent
    );
    
    if (result) {
      logger.info(`✅ Webhook processed: ${event} for ${messageId}`);
      return NextResponse.json({ success: true });
    } else {
      logger.warn(`⚠️ Webhook not processed: ${messageId}`);
      return NextResponse.json({ success: false }, { status: 404 });
    }
    
  } catch (error) {
    logger.error('❌ Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}