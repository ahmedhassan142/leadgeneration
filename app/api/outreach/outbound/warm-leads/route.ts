// app/api/outreach/outbound/warm-leads/route.ts - FULLY UPDATED
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/connect';
import { Lead } from '@/lib/db/models/Lead';
import { Outreach } from '@/lib/db/models/Outreach';
import { generateWarmEmail } from '@/lib/ai/warm-email-generator';
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

// Sequence configurations
const SEQUENCES = {
  default: {
    name: 'Standard 4-Step Sequence',
    steps: [
      { delay: 0, type: 'first', daysToAdd: 0 },
      { delay: 4, type: 'followup', daysToAdd: 4 },
      { delay: 4, type: 'followup-2', daysToAdd: 8 },
      { delay: 7, type: 'final', daysToAdd: 15 }
    ],
    totalSteps: 4
  },
  aggressive: {
    name: 'Compact 3-Step Sequence',
    steps: [
      { delay: 0, type: 'first', daysToAdd: 0 },
      { delay: 3, type: 'followup', daysToAdd: 3 },
      { delay: 5, type: 'final', daysToAdd: 8 }
    ],
    totalSteps: 3
  },
  gentle: {
    name: 'Extended 5-Step Sequence',
    steps: [
      { delay: 0, type: 'first', daysToAdd: 0 },
      { delay: 5, type: 'followup', daysToAdd: 5 },
      { delay: 5, type: 'followup-2', daysToAdd: 10 },
      { delay: 5, type: 'followup-3', daysToAdd: 15 },
      { delay: 7, type: 'final', daysToAdd: 22 }
    ],
    totalSteps: 5
  }
};

// ============================================
// GET METHOD - Fetch warm leads
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
    const outreachStatus = searchParams.get('outreachStatus');
    const onlyNew = searchParams.get('onlyNew') === 'true';

    const query: any = {
      $or: [
        { quality: 'warm' },
        { score: { $gte: 40, $lt: 70 } }
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

    if (outreachStatus && outreachStatus !== 'all') {
      if (outreachStatus === 'contacted') {
        query.status = 'contacted';
      } else if (outreachStatus === 'new') {
        query.status = 'new';
      }
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    query.createdAt = { $gte: cutoffDate };

    if (source && source !== 'all') {
      query.source = source;
    }

    const total = await Lead.countDocuments(query);
    const warmLeads = await Lead.find(query)
      .sort({ score: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    console.log(`📊 Warm leads found: ${total} (onlyNew: ${onlyNew})`);

    return NextResponse.json({
      success: true,
      leads: warmLeads,
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
    logger.error('Failed to fetch outbound warm leads:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// POST METHOD - Send warm emails
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
      sequence = 'default',
      startStep = 1,
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

    const sequenceConfig = SEQUENCES[sequence as keyof typeof SEQUENCES] || SEQUENCES.default;

    let query: any = {
      $or: [
        { quality: 'warm' },
        { score: { $gte: 40, $lt: 70 } }
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

    const warmLeads = await Lead.find(query)
      .sort({ score: -1 })
      .limit(limit)
      .lean();

    console.log(`📊 Found ${warmLeads.length} warm leads (skipAlreadyEmailed: ${skipAlreadyEmailed})`);

    if (warmLeads.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No outbound warm leads to process',
        processed: 0
      });
    }

    for (const lead of warmLeads) {
      const email = (lead.emails && lead.emails[0]) || lead.email;
      console.log(`   📧 ${lead.name}: ${email}`);
    }

    const BATCH_SIZE = 3;
    const results = [];
    
    for (let i = 0; i < warmLeads.length; i += BATCH_SIZE) {
      const batch = warmLeads.slice(i, i + BATCH_SIZE);
      
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
            
            let outreach = await Outreach.findOne({
              leadId: lead._id.toString(),
              status: { $in: ['active', 'pending'] }
            });

            let currentStep = startStep;
            let emailType: 'first' | 'followup' | 'followup-2' | 'final' = 'first';

            if (outreach) {
              currentStep = outreach.currentStep + 1;
              if (currentStep > sequenceConfig.totalSteps) {
                return {
                  leadId: lead._id,
                  status: 'skipped',
                  reason: 'Sequence complete'
                };
              }
              
              const stepConfig = sequenceConfig.steps[currentStep - 1];
              emailType = stepConfig.type as any;
            }

            const emailContent = await generateWarmEmail({
              companyName: lead.name || lead.author || 'there',
              website: lead.website || lead.sourceUrl,
              source: lead.source,
              score: lead.score || 0,
              leadId: lead._id?.toString(),
              recipientName: lead.name || lead.author,
              recipientRole: lead.role,
              emailType,
              previousInteractions: outreach?.emails?.map((e: any) => e.subject).join(', '),
              sequence,
              metadata: lead.metadata
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

            console.log(`📧 Lead: ${lead.name}, Email: ${emailAddress}, Type: ${emailType}`);

            if (testMode) {
              return {
                leadId: lead._id,
                status: 'test',
                step: currentStep,
                emailType,
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
              const currentStepConfig = sequenceConfig.steps[currentStep - 1];
              const daysToAdd = currentStepConfig?.daysToAdd || 4;
              nextFollowUp.setDate(nextFollowUp.getDate() + daysToAdd);

              if (outreach) {
                outreach.currentStep = currentStep;
                outreach.status = currentStep >= sequenceConfig.totalSteps ? 'completed' : 'active';
                outreach.lastContactedAt = new Date();
                outreach.nextFollowUpAt = nextFollowUp;
                outreach.emails.push({
                  to: emailAddress,
                  subject: emailContent.subject,
                  body: emailContent.text,
                  sentAt: new Date(),
                  status: 'sent',
                  messageId: emailResult.messageId,
                  templateName: `warm-${emailType}`,
                  stepIndex: currentStep
                });
                await outreach.save();
              } else {
                outreach = await Outreach.create({
                  leadId: lead._id.toString(),
                  leadType: 'main',
                  leadSnapshot: {
                    name: lead.name || lead.author || 'Unknown',
                    website: lead.website || lead.sourceUrl,
                    email: emailAddress,
                    phone: lead.contactInfo?.phone,
                    niche: lead.niche,
                    location: lead.location,
                    quality: lead.quality || 'warm',
                    score: lead.score || 0,
                    source: lead.source,
                    ai: lead.ai
                  },
                  sequenceId: sequence,
                  sequenceName: sequenceConfig.name,
                  totalSteps: sequenceConfig.totalSteps,
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
                    templateName: `warm-${emailType}`,
                    stepIndex: 1
                  }],
                  tags: ['warm', 'sequence', sequence]
                });
              }

              await Lead.findByIdAndUpdate(
                lead._id,
                {
                  status: 'contacted',
                  lastContactedAt: new Date(),
                  lastEmailSentAt: new Date(),
                  lastEmailType: emailType,
                  lastEmailSubject: emailContent.subject,
                  totalEmailsSent: 1,
                  lastEmailStep: currentStep,
                  currentSequenceId: sequence,
                  emailSequenceStatus: 'active',
                  $push: {
                    'outreach.history': {
                      type: `warm_${emailType}`,
                      sentAt: new Date(),
                      subject: emailContent.subject,
                      model: emailContent.model,
                      messageId: emailResult.messageId,
                      outreachId: outreach._id,
                      step: currentStep
                    }
                  }
                }
              );

              return {
                leadId: lead._id,
                status: 'sent',
                step: currentStep,
                emailType,
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
            logger.error(`Failed to process warm lead ${lead._id}:`, error);
            return {
              leadId: lead._id,
              status: 'failed',
              error: error.message
            };
          }
        })
      );
      
      results.push(...batchResults);
      
      if (i + BATCH_SIZE < warmLeads.length) {
        console.log(`⏳ Waiting ${RATE_LIMITS.DELAY_BETWEEN_BATCHES / 1000} seconds before next batch...`);
        await delay(RATE_LIMITS.DELAY_BETWEEN_BATCHES);
      }
    }

    const stats = {
      total: warmLeads.length,
      sent: results.filter(r => r.status === 'fulfilled' && r.value?.status === 'sent').length,
      failed: results.filter(r => r.status === 'rejected' || r.value?.status === 'failed').length,
      test: results.filter(r => r.status === 'fulfilled' && r.value?.status === 'test').length,
      rateLimited: results.filter(r => r.status === 'fulfilled' && r.value?.status === 'rate_limited').length,
      byStep: results.reduce((acc: any, r) => {
        if (r.status === 'fulfilled' && r.value?.step) {
          acc[`step${r.value.step}`] = (acc[`step${r.value.step}`] || 0) + 1;
        }
        return acc;
      }, {})
    };

    return NextResponse.json({
      success: true,
      message: `Processed ${stats.total} outbound warm leads`,
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
    logger.error('Failed to process outbound warm leads:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}