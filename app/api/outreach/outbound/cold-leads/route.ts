// app/api/outreach/outbound/cold-leads/route.ts - FULLY UPDATED
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/connect';
import { Lead } from '@/lib/db/models/Lead';
import { Outreach } from '@/lib/db/models/Outreach';
import { generateColdEmail } from '@/lib/ai/cold-email-generator';
import { sendEmail } from '@/lib/email/send';
import { logger } from '@/lib/scraper/utils/logger';

// Rate limiting configuration
const RATE_LIMITS = {
  DAILY_LIMIT: 30,              // Increased from 20 to 30 emails per day
  HOURLY_LIMIT: 8,              // Increased from 5 to 8 emails per hour
  DELAY_BETWEEN_EMAILS: 240000, // 4 minutes between emails (was 5 minutes)
  DELAY_BETWEEN_BATCHES: 720000, // 12 minutes between batches (was 15 minutes)
};
// Skip these email addresses
const SKIP_EMAILS = [
  'ah770643@gmail.com',
  'ah770643@yourdomain.com',
  'test@gmail.com',
  'ahmed@ahtech.fun'
];

// Track sent counts
let dailySentCount = 0;
let hourlySentCount = 0;
let lastResetDate = new Date();
let lastResetHour = new Date();

function resetCountersIfNeeded() {
  const now = new Date();
  
  if (now.getDate() !== lastResetDate.getDate() || 
      now.getMonth() !== lastResetDate.getMonth() || 
      now.getFullYear() !== lastResetDate.getFullYear()) {
    dailySentCount = 0;
    lastResetDate = now;
    console.log('📊 Daily email counter reset');
  }
  
  if (now.getHours() !== lastResetHour.getHours() || 
      now.getDate() !== lastResetHour.getDate()) {
    hourlySentCount = 0;
    lastResetHour = now;
    console.log('📊 Hourly email counter reset');
  }
}

function canSendEmail(): { allowed: boolean; reason?: string } {
  resetCountersIfNeeded();
  
  if (dailySentCount >= RATE_LIMITS.DAILY_LIMIT) {
    return { allowed: false, reason: `Daily limit reached (${RATE_LIMITS.DAILY_LIMIT}/${dailySentCount})` };
  }
  
  if (hourlySentCount >= RATE_LIMITS.HOURLY_LIMIT) {
    return { allowed: false, reason: `Hourly limit reached (${RATE_LIMITS.HOURLY_LIMIT}/${hourlySentCount})` };
  }
  
  return { allowed: true };
}

function recordEmailSent() {
  dailySentCount++;
  hourlySentCount++;
  console.log(`📊 Email sent. Daily: ${dailySentCount}/${RATE_LIMITS.DAILY_LIMIT}, Hourly: ${hourlySentCount}/${RATE_LIMITS.HOURLY_LIMIT}`);
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function shouldSkipEmail(email: string): boolean {
  if (!email) return true;
  return SKIP_EMAILS.includes(email.toLowerCase());
}

// ============================================
// GET METHOD - Fetch cold leads
// ============================================
export async function GET(request: Request) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '500');
    const skip = (page - 1) * limit;
    const source = searchParams.get('source');
    const daysOld = parseInt(searchParams.get('daysOld') || '365');
    const onlyNew = searchParams.get('onlyNew') === 'true';

    const query: any = {
      $or: [
        { quality: 'cold' },
        { score: { $lt: 40 } }
      ],
      $and: [
        {
          $or: [
            { emails: { $exists: true, $ne: [] } },
            { email: { $exists: true, $ne: '' } }
          ]
        },
        {
          $nor: [
            { email: { $in: SKIP_EMAILS } },
            { emails: { $in: SKIP_EMAILS } }
          ]
        }
      ]
    };

    // ✅ Exclude leads that already received emails
    if (onlyNew) {
      query.$and.push({
        $or: [
          { emailSequenceStatus: { $in: [null, 'not_started', ''] } },
          { emailSequenceStatus: { $exists: false } },
          { lastEmailSentAt: { $exists: false } }
        ]
      });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    query.createdAt = { $gte: cutoffDate };

    if (source && source !== 'all') {
      query.source = source;
    }

    const total = await Lead.countDocuments(query);
    const coldLeads = await Lead.find(query)
      .sort({ score: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    console.log(`📊 Cold leads found: ${total} (onlyNew: ${onlyNew})`);

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
      },
      rateLimits: {
        dailyRemaining: RATE_LIMITS.DAILY_LIMIT - dailySentCount,
        hourlyRemaining: RATE_LIMITS.HOURLY_LIMIT - hourlySentCount
      }
    });

  } catch (error: any) {
    logger.error('Failed to fetch cold leads:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// POST METHOD - Send cold emails
// ============================================
export async function POST(request: Request) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { 
      leadIds, 
      source, 
      daysOld, 
      limit = 50, 
      testMode = false, 
      sequenceId = 'cold-default',
      respectRateLimit = true,
      skipAlreadyEmailed = true
    } = body;

    if (respectRateLimit) {
      const rateCheck = canSendEmail();
      if (!rateCheck.allowed) {
        return NextResponse.json({
          success: false,
          error: rateCheck.reason,
          rateLimits: {
            dailyRemaining: RATE_LIMITS.DAILY_LIMIT - dailySentCount,
            hourlyRemaining: RATE_LIMITS.HOURLY_LIMIT - hourlySentCount
          }
        }, { status: 429 });
      }
    }

    let query: any = {
      $or: [
        { quality: 'cold' },
        { score: { $lt: 40 } }
      ],
      status: { $ne: 'converted' },
      $and: [
        {
          $or: [
            { emails: { $exists: true, $ne: [] } },
            { email: { $exists: true, $ne: '' } }
          ]
        },
        {
          $nor: [
            { email: { $in: SKIP_EMAILS } },
            { emails: { $in: SKIP_EMAILS } }
          ]
        }
      ]
    };

    // ✅ Skip leads that already received emails
    if (skipAlreadyEmailed) {
      query.$and.push({
        $or: [
          { emailSequenceStatus: { $in: [null, 'not_started', ''] } },
          { emailSequenceStatus: { $exists: false } },
          { lastEmailSentAt: { $exists: false } }
        ]
      });
    }

    if (leadIds && leadIds.length > 0) {
      query._id = { $in: leadIds };
    }

    if (daysOld) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      query.createdAt = { $gte: cutoffDate };
    }

    if (source && source !== 'all') {
      query.source = source;
    }

    const coldLeads = await Lead.find(query)
      .sort({ score: 1 })
      .limit(limit)
      .lean();

    console.log(`📊 Found ${coldLeads.length} cold leads (skipAlreadyEmailed: ${skipAlreadyEmailed})`);

    if (coldLeads.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No cold leads to process',
        processed: 0
      });
    }

    for (const lead of coldLeads) {
      const email = (lead.emails && lead.emails[0]) || lead.email;
      console.log(`   📧 ${lead.name}: ${email}`);
    }

    const results = [];
    const BATCH_SIZE = 3;
    
    for (let i = 0; i < coldLeads.length; i += BATCH_SIZE) {
      const batch = coldLeads.slice(i, i + BATCH_SIZE);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (lead, batchIndex) => {
          try {
            if (respectRateLimit) {
              const rateCheck = canSendEmail();
              if (!rateCheck.allowed) {
                return {
                  leadId: lead._id,
                  status: 'rate_limited',
                  reason: rateCheck.reason
                };
              }
            }
            
            if (batchIndex > 0) {
              await delay(RATE_LIMITS.DELAY_BETWEEN_EMAILS);
            }
            
            const existingOutreach = await Outreach.findOne({
              $or: [
                { leadId: lead._id.toString() },
                { inboundLeadId: lead._id.toString() }
              ],
              status: { $in: ['active', 'pending'] }
            });

            if (existingOutreach) {
              return {
                leadId: lead._id,
                status: 'skipped',
                reason: 'Already in outreach'
              };
            }

            const emailContent = await generateColdEmail({
              companyName: lead.name || lead.author || 'there',
              website: lead.website || lead.sourceUrl,
              source: lead.source,
              score: lead.score || 0,
              leadId: lead._id?.toString(),
              recipientName: lead.name || lead.author,
              recipientRole: lead.role,
              metadata: lead.metadata,
              emailType: 'first'
            });

            let emailAddress = '';
            if (lead.emails && Array.isArray(lead.emails) && lead.emails.length > 0) {
              emailAddress = lead.emails[0];
            } else if (lead.email) {
              emailAddress = lead.email;
            } else if (lead.contactInfo?.email) {
              emailAddress = lead.contactInfo.email;
            }

            if (shouldSkipEmail(emailAddress)) {
              console.log(`⚠️ Skipping ${lead.name} - would send to own email: ${emailAddress}`);
              return {
                leadId: lead._id,
                status: 'skipped',
                reason: 'Would send to own email (test lead)'
              };
            }

            console.log(`📧 Lead: ${lead.name}, Email: ${emailAddress}`);

            if (testMode) {
              return {
                leadId: lead._id,
                status: 'test',
                emailPreview: {
                  to: emailAddress,
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
                error: 'No email address'
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
              recordEmailSent();
              
              const nextFollowUp = new Date();
              nextFollowUp.setDate(nextFollowUp.getDate() + 3);
              
              const outreach = await Outreach.create({
                leadId: lead._id.toString(),
                leadType: 'main',
                leadSnapshot: {
                  name: lead.name || lead.author || 'Unknown',
                  website: lead.website || lead.sourceUrl,
                  email: emailAddress,
                  phone: lead.contactInfo?.phone,
                  niche: lead.niche,
                  location: lead.location,
                  quality: lead.quality || 'cold',
                  score: lead.score || 0,
                  source: lead.source,
                  ai: lead.ai
                },
                sequenceId,
                sequenceName: 'Cold Email Campaign',
                totalSteps: 4,
                currentStep: 1,
                status: 'active',
                startedAt: new Date(),
                lastContactedAt: new Date(),
                nextFollowUpAt: nextFollowUp,
                emails: [{
                  to: emailAddress,
                  subject: emailContent.subject,
                  body: emailContent.text,
                  sentAt: new Date(),
                  status: 'sent',
                  messageId: emailResult.messageId,
                  templateName: 'cold-email',
                  stepIndex: 1
                }],
                tags: ['cold', 'automated']
              });

              await Lead.findByIdAndUpdate(
                lead._id,
                {
                  status: 'contacted',
                  lastContactedAt: new Date(),
                  lastEmailSentAt: new Date(),
                  lastEmailType: 'first',
                  lastEmailSubject: emailContent.subject,
                  totalEmailsSent: 1,
                  lastEmailStep: 1,
                  currentSequenceId: sequenceId,
                  emailSequenceStatus: 'active',
                  $push: {
                    'outreach.history': {
                      type: 'cold_email',
                      sentAt: new Date(),
                      subject: emailContent.subject,
                      model: emailContent.model,
                      messageId: emailResult.messageId,
                      outreachId: outreach._id
                    }
                  }
                }
              );

              return {
                leadId: lead._id,
                status: 'sent',
                outreachId: outreach._id,
                emailId: emailResult.messageId,
                to: emailAddress,
                model: emailContent.model,
                nextFollowUp: nextFollowUp
              };
            } else {
              throw new Error(emailResult.error);
            }
          } catch (error: any) {
            logger.error(`Failed to process cold lead ${lead._id}:`, error);
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
        console.log(`⏳ Waiting ${RATE_LIMITS.DELAY_BETWEEN_BATCHES / 1000} seconds before next batch...`);
        await delay(RATE_LIMITS.DELAY_BETWEEN_BATCHES);
      }
    }

    const stats = {
      total: coldLeads.length,
      sent: results.filter(r => r.status === 'fulfilled' && r.value?.status === 'sent').length,
      failed: results.filter(r => r.status === 'rejected' || r.value?.status === 'failed').length,
      skipped: results.filter(r => r.status === 'fulfilled' && r.value?.status === 'skipped').length,
      test: results.filter(r => r.status === 'fulfilled' && r.value?.status === 'test').length,
      rateLimited: results.filter(r => r.status === 'fulfilled' && r.value?.status === 'rate_limited').length
    };

    return NextResponse.json({
      success: true,
      message: `Processed ${stats.total} cold leads`,
      stats,
      rateLimits: {
        dailyRemaining: RATE_LIMITS.DAILY_LIMIT - dailySentCount,
        hourlyRemaining: RATE_LIMITS.HOURLY_LIMIT - hourlySentCount,
        dailySent: dailySentCount,
        hourlySent: hourlySentCount
      },
      results: results.map(r => r.status === 'fulfilled' ? r.value : { status: 'rejected', error: r.reason })
    });

  } catch (error: any) {
    logger.error('Failed to process cold leads:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}