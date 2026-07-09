// app/api/outreach/webhook/route.ts - UPDATED TO WORK WITH YOUR MODEL
import { NextResponse } from 'next/server';
import { Outreach } from '@/lib/db/models/Outreach';
import { logger } from '@/lib/scraper/utils/logger';
import mongoose from 'mongoose';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messageId, event, timestamp, from, subject, to } = body;

    logger.info('📨 Webhook received', { messageId, event, from, to });

    if (!messageId || !event) {
      return NextResponse.json(
        { error: 'Missing required fields: messageId and event are required' },
        { status: 400 }
      );
    }

    // Find the outreach by messageId in the emails array
    const outreach = await Outreach.findOne({
      'emails.messageId': messageId
    });

    if (!outreach) {
      logger.warn('⚠️ Outreach not found for messageId:', messageId);
      
      // Try searching by email address as fallback
      if (to || from) {
        const emailToSearch = to || from;
        const fallbackOutreach = await Outreach.findOne({
          'leadSnapshot.email': emailToSearch
        }).sort({ createdAt: -1 });

        if (fallbackOutreach) {
          logger.info('✅ Found outreach by email fallback');
          
          // Create a new email entry in this outreach
          fallbackOutreach.emails.push({
            to: to || 'unknown',
            subject: subject || 'Reply received',
            body: 'Email reply detected via webhook',
            sentAt: new Date(timestamp || Date.now()),
            status: event === 'replied' ? 'replied' : 'sent',
            messageId: messageId || `manual-${Date.now()}`,
            templateName: 'incoming-reply',
            stepIndex: fallbackOutreach.currentStep
          });

          if (event === 'replied') {
            fallbackOutreach.status = 'completed';
            fallbackOutreach.completedAt = new Date(timestamp || Date.now());
            fallbackOutreach.notes = `Reply received from ${from || 'unknown'}: ${subject || 'No subject'}`;
          }

          await fallbackOutreach.save();
          
          return NextResponse.json({ 
            success: true, 
            message: 'Outreach updated via fallback',
            outreachId: fallbackOutreach._id 
          });
        }
      }

      return NextResponse.json(
        { error: 'Outreach not found', messageId },
        { status: 404 }
      );
    }

    // Find the specific email in the emails array
    const emailIndex = outreach.emails.findIndex((e:any)=> e.messageId === messageId);
    
    if (emailIndex === -1) {
      logger.warn('⚠️ Email not found in outreach, but outreach exists');
      
      // Add as new email if not found
      outreach.emails.push({
        to: to || outreach.leadSnapshot.email,
        subject: subject || 'Reply received',
        body: 'Email reply detected via webhook',
        sentAt: new Date(timestamp || Date.now()),
        status: event === 'replied' ? 'replied' : 'sent',
        messageId: messageId,
        templateName: 'incoming-reply',
        stepIndex: outreach.currentStep
      });

      if (event === 'replied') {
        outreach.status = 'completed';
        outreach.completedAt = new Date(timestamp || Date.now());
        outreach.notes = `Reply received from ${from || 'unknown'}: ${subject || 'No subject'}`;
      }

      await outreach.save();
      
      return NextResponse.json({ 
        success: true, 
        message: 'Email added to outreach',
        outreachId: outreach._id 
      });
    }

    // Update based on event type
    const updateField: any = {};
    
    switch (event) {
      case 'opened':
        updateField[`emails.${emailIndex}.openedAt`] = new Date(timestamp || Date.now());
        updateField[`emails.${emailIndex}.status`] = 'opened';
        logger.info('✅ Email opened tracked', { messageId });
        break;

      case 'clicked':
        updateField[`emails.${emailIndex}.clickedAt`] = new Date(timestamp || Date.now());
        updateField[`emails.${emailIndex}.status`] = 'clicked';
        logger.info('✅ Link clicked tracked', { messageId });
        break;

      case 'replied':
        updateField[`emails.${emailIndex}.repliedAt`] = new Date(timestamp || Date.now());
        updateField[`emails.${emailIndex}.status`] = 'replied';
        updateField.status = 'completed';
        updateField.completedAt = new Date(timestamp || Date.now());
        
        // Add reply details to notes
        const replyNote = `Reply received from ${from || 'unknown'}: ${subject || 'No subject'}`;
        
        // Check if we need to append or create notes
        if (outreach.notes) {
          updateField.notes = `${outreach.notes}\n${replyNote}`;
        } else {
          updateField.notes = replyNote;
        }
        
        logger.info('✅ Reply tracked', { messageId, from, subject });
        break;

      case 'bounced':
        updateField[`emails.${emailIndex}.status`] = 'bounced';
        updateField[`emails.${emailIndex}.error`] = 'Email bounced';
        updateField.status = 'paused';
        logger.warn('⚠️ Email bounced', { messageId });
        break;

      default:
        logger.warn('Unknown event type:', event);
        return NextResponse.json(
          { error: 'Unknown event type' },
          { status: 400 }
        );
    }

    // Apply updates
    await Outreach.findByIdAndUpdate(outreach._id, {
      $set: updateField
    });

    logger.info('✅ Webhook processed successfully', { 
      messageId, 
      event, 
      outreachId: outreach._id 
    });

    return NextResponse.json({ 
      success: true,
      outreachId: outreach._id,
      event,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('❌ Webhook error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'Outreach webhook endpoint',
    usage: 'POST to this endpoint with { messageId, event, timestamp, from, subject, to }',
    supportedEvents: ['opened', 'clicked', 'replied', 'bounced'],
    example: {
      messageId: '<abc123@mail.gmail.com>',
      event: 'replied',
      timestamp: '2026-03-20T10:30:00Z',
      from: 'ah770643@gmail.com',
      to: 'lead@example.com',
      subject: 'Re: Your email'
    }
  });
}