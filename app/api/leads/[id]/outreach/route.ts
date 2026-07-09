// app/api/leads/[id]/outreach/route.ts
import { NextResponse } from 'next/server';
import  connectToDatabase  from '@/lib/db/connect';
import { Lead } from '@/lib/db/models/Lead';
import { sendEmail } from '@/lib/email/send';
import { generateOutreachEmail } from '@/lib/email/templates';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    const lead = await Lead.findById(params.id);
    
    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }
    
    // Generate email if not exists
    if (!lead.outreach) {
      const emailContent = generateOutreachEmail(lead);
      lead.outreach = {
        subject: emailContent.subject,
        message: emailContent.message,
        sent: false
      };
      await lead.save();
    }
    
    return NextResponse.json({ outreach: lead.outreach });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate outreach' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    const lead = await Lead.findById(params.id);
    
    if (!lead || !lead.outreach) {
      return NextResponse.json(
        { error: 'Lead or outreach not found' },
        { status: 404 }
      );
    }
    
    // Send email
    await sendEmail({
      to: lead.emails[0],
      subject: lead.outreach.subject,
      text: lead.outreach.message,
    });
    
    // Mark as sent
    lead.outreach.sent = true;
    lead.outreach.sentAt = new Date();
    lead.status = 'contacted';
    await lead.save();
    
    return NextResponse.json({ 
      success: true,
      message: 'Outreach sent successfully' 
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to send outreach' },
      { status: 500 }
    );
  }
}