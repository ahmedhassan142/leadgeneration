// app/api/outreach/send/route.ts
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/connect';
import { Lead } from '@/lib/db/models/Lead';
import { InboundLead } from '@/lib/db/models/inboundlead';
import { sendEmail } from '@/lib/email/send';
import { logger } from '@/lib/scraper/utils/logger';
import { emailTemplates } from '@/lib/email/templates';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    
    const { leadId, leadType, template, customMessage } = await request.json();

    // Find lead based on type
    let lead;
    if (leadType === 'main') {
      lead = await Lead.findById(leadId);
    } else {
      lead = await InboundLead.findById(leadId);
    }

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Get email address
    const email = lead.emails?.[0] || (lead as any).authorProfile?.includes('@') ? (lead as any).authorProfile : null;
    if (!email) {
      return NextResponse.json({ error: 'No email found' }, { status: 400 });
    }

    // Generate email content
    const { subject, body } = emailTemplates.generateForSequence(
      lead,
      template || 'intro'
    );

    // Send email
    const result = await sendEmail({
      to: email,
      subject,
      text: body,
      html: body.replace(/\n/g, '<br>')
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    // Update lead outreach data
    const outreachEmail = {
      to: email,
      subject,
      body,
      sentAt: new Date(),
      status: 'sent',
      messageId: result.messageId
    };

    if (leadType === 'main') {
      await Lead.findByIdAndUpdate(leadId, {
        $push: { 'outreach.emails': outreachEmail },
        $set: {
          'outreach.enabled': true,
          'outreach.lastContacted': new Date(),
          status: 'contacted'
        }
      });
    } else {
      await InboundLead.findByIdAndUpdate(leadId, {
        $push: { 'outreach.emails': outreachEmail },
        $set: {
          'outreach.enabled': true,
          'outreach.lastContacted': new Date(),
          status: 'contacted'
        }
      });
    }

    // Schedule follow-up
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 2); // 2 days later

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      nextFollowUp: followUpDate,
      lead: leadType === 'main' ? 'main' : 'inbound'
    });

  } catch (error) {
    logger.error('Failed to send outreach email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}