// app/api/outreach/inbound-cold-leads/route.ts
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/connect';
import { InboundLead } from '@/lib/db/models/inboundlead';
import { Outreach } from '@/lib/db/models/Outreach';
import { generateColdEmail } from '@/lib/ai/cold-email-generator';
import { sendEmail } from '@/lib/email/send';
import { logger } from '@/lib/scraper/utils/logger';
import mongoose from 'mongoose';

// Helper to extract email from content
function extractEmailFromContent(content: string): string | null {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = content?.match(emailRegex);
  return matches && matches.length > 0 ? matches[0] : null;
}

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    const source = searchParams.get('source');
    const daysOld = parseInt(searchParams.get('daysOld') || '30');

    // Build query for inbound cold leads
    const query: any = {
      $or: [
        { leadQuality: 'cold' },
        { leadScore: { $lt: 40 } }
      ],
      status: { $ne: 'converted' }
    };

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    query.postedAt = { $gte: cutoffDate };

    if (source && source !== 'all') {
      query.source = source;
    }

    const total = await InboundLead.countDocuments(query);

    const coldLeads = await InboundLead.find(query)
      .sort({ leadScore: 1, postedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      leads: coldLeads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error: any) {
    logger.error('Failed to fetch inbound cold leads:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { leadIds, source, daysOld, limit = 50, testMode = false, sequenceId = 'inbound-cold-default' } = body;

    let query: any = {
      $or: [
        { leadQuality: 'cold' },
        { leadScore: { $lt: 40 } }
      ],
      status: { $ne: 'converted' }
    };

    if (leadIds && leadIds.length > 0) {
      query._id = { $in: leadIds };
    }

    if (daysOld) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      query.postedAt = { $gte: cutoffDate };
    }

    if (source && source !== 'all') {
      query.source = source;
    }

    const coldLeads = await InboundLead.find(query)
      .sort({ leadScore: 1 })
      .limit(limit)
      .session(session)
      .lean();

    if (coldLeads.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({
        success: true,
        message: 'No inbound cold leads to process',
        processed: 0
      });
    }

    const BATCH_SIZE = 5;
    const results = [];
    
    for (let i = 0; i < coldLeads.length; i += BATCH_SIZE) {
      const batch = coldLeads.slice(i, i + BATCH_SIZE);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (lead) => {
          try {
            const existingOutreach = await Outreach.findOne({
              inboundLeadId: lead._id.toString(),
              status: { $in: ['active', 'pending'] }
            }).session(session);

            if (existingOutreach) {
              return {
                leadId: lead._id,
                status: 'skipped',
                reason: 'Already in outreach'
              };
            }

            // Generate AI email
            const emailContent = await generateColdEmail({
              emailType: 'first',
              companyName: lead.author || 'there',
              website: lead.sourceUrl,
              source: lead.source,
              score: lead.leadScore || 0,
              leadId: lead._id?.toString(),
              recipientName: lead.author,
              recipientRole: 'Potential Client',
              metadata: {
                ...lead.metadata,
                requirement: lead.requirement,
                postedAt: lead.postedAt
              }
            });

            // Extract email from content
            const emailAddress = lead.contactInfo?.email || extractEmailFromContent(lead.content);

            if (testMode) {
              return {
                leadId: lead._id,
                status: 'test',
                emailPreview: {
                  to: emailAddress || 'No email found',
                  subject: emailContent.subject,
                  text: emailContent.text.substring(0, 200) + '...',
                  model: emailContent.model
                }
              };
            }

            if (!emailAddress) {
              return {
                leadId: lead._id,
                status: 'failed',
                error: 'No email address found'
              };
            }

            const emailResult = await sendEmail({
              to: emailAddress,
              subject: emailContent.subject,
              html: emailContent.html,
              text: emailContent.text,
              from: process.env.SMTP_FROM_EMAIL || 'outreach@yourdomain.com'
            });

            if (emailResult.success) {
              // Create outreach record
              const outreach = await Outreach.create([{
                inboundLeadId: lead._id.toString(),
                leadType: 'inbound',
                leadSnapshot: {
                  name: lead.author || 'Unknown',
                  website: lead.sourceUrl,
                  email: emailAddress,
                  niche: lead.metadata?.niche,
                  location: lead.metadata?.location,
                  quality: lead.leadQuality || 'cold',
                  score: lead.leadScore || 0,
                  source: lead.source,
                },
                sequenceId,
                sequenceName: 'Inbound Cold Email Campaign',
                totalSteps: 1,
                currentStep: 1,
                status: 'active',
                startedAt: new Date(),
                lastContactedAt: new Date(),
                nextFollowUpAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                emails: [{
                  to: emailAddress,
                  subject: emailContent.subject,
                  body: emailContent.text,
                  sentAt: new Date(),
                  status: 'sent',
                  messageId: emailResult.messageId,
                  templateName: 'inbound-cold-email',
                  stepIndex: 1
                }],
                tags: ['inbound', 'cold', 'automated']
              }], { session });

              // Update lead status
              await InboundLead.findByIdAndUpdate(
                lead._id,
                {
                  status: 'contacted',
                  lastContactedAt: new Date(),
                  $push: {
                    'outreach.history': {
                      type: 'cold_email',
                      sentAt: new Date(),
                      subject: emailContent.subject,
                      model: emailContent.model,
                      messageId: emailResult.messageId,
                      outreachId: outreach[0]._id
                    }
                  }
                },
                { session }
              );

              return {
                leadId: lead._id,
                status: 'sent',
                outreachId: outreach[0]._id,
                emailId: emailResult.messageId,
                to: emailAddress,
                model: emailContent.model
              };
            } else {
              throw new Error(emailResult.error);
            }
          } catch (error: any) {
            logger.error(`Failed to process inbound cold lead ${lead._id}:`, error);
            return {
              leadId: lead._id,
              status: 'failed',
              error: error.message
            };
          }
        })
      );
      
      results.push(...batchResults);
      
      if (i + BATCH_SIZE < coldLeads.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    await session.commitTransaction();
    session.endSession();

    const stats = {
      total: coldLeads.length,
      sent: results.filter(r => r.status === 'fulfilled' && r.value?.status === 'sent').length,
      failed: results.filter(r => r.status === 'rejected' || r.value?.status === 'failed').length,
      skipped: results.filter(r => r.status === 'fulfilled' && r.value?.status === 'skipped').length,
      test: results.filter(r => r.status === 'fulfilled' && r.value?.status === 'test').length
    };

    return NextResponse.json({
      success: true,
      message: `Processed ${stats.total} inbound cold leads`,
      stats,
      results: results.map(r => r.status === 'fulfilled' ? r.value : { status: 'rejected', error: r.reason })
    });

  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    logger.error('Failed to process inbound cold leads:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}