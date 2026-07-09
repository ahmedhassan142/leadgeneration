// lib/scoring/leadScorer.ts - TONY'S EXACT LOGIC
import { Lead } from '@/lib/db/models/Lead';
import { logger } from '@/lib/scraper/utils/logger';

export async function calculateScore(leadId: string) {
  const lead = await Lead.findById(leadId);
  if (!lead) throw new Error('Lead not found');

  // 🚀 Already hot from auto-detection? Skip calculation
  if (lead.autoHotLead) {
    logger.info(`🔥 Lead already auto-hot from website check`, { leadId });
    
    // Check if has email - even auto-hot leads follow Tony's rule
    const hasEmail = lead.emails && lead.emails.length > 0;
    const callNeeded = !hasEmail; // Email ho to call nahi
    
    return {
      score: 100,
      quality: 'hot',
      reasons: lead.leadScoreReason || ['Website does not exist'],
      callNeeded,
      callPriority: callNeeded ? 'high' : 'low',
      channel: callNeeded ? 'call' : 'email'
    };
  }

  let score = 0;
  const reasons = [];
  
  // 🔥 Check email and website status (Tony's Core Logic)
  const hasEmail = lead.emails && lead.emails.length > 0;
  const hasWebsite = lead.websiteExists;
  
  // Quality based on scoring
  if (!lead.analysis?.hasSEO) {
    score += 20;
    reasons.push('Missing SEO optimization');
  }

  if (lead.analysis?.speedScore && lead.analysis.speedScore < 60) {
    score += 20;
    reasons.push('Poor loading speed');
  }

  if (lead.ai?.designScore && lead.ai.designScore < 6) {
    score += 25;
    reasons.push(`Design issues: ${lead.ai.issues?.join(', ')}`);
  }

  const pageContent = `${lead.analysis?.title || ''} ${lead.analysis?.description || ''}`.toLowerCase();
  
  if (!pageContent.includes('chat')) {
    score += 10;
    reasons.push('No live chat feature');
  }

  if (!pageContent.includes('book') && !pageContent.includes('appointment')) {
    score += 10;
    reasons.push('No online booking');
  }

  if (!lead.analysis?.mobileFriendly) {
    score += 15;
    reasons.push('Not mobile friendly');
  }

  // Determine quality
  let quality: 'cold' | 'warm' | 'hot' = 'cold';
  if (score >= 70) {
    quality = 'hot';
  } else if (score >= 40) {
    quality = 'warm';
  }

  // 🔥 TONY'S EXACT CALL NEEDED LOGIC
  let callNeeded = false;
  let channel = 'email'; // Default channel
  let callPriority: 'high' | 'medium' | 'low' = 'low';

  // COLD LEADS - NEVER CALL
  if (quality === 'cold') {
    callNeeded = false;
    channel = 'none';
    reasons.push('Cold lead - no outreach needed');
  }
  // HOT/WARM LEADS
  else {
    if (hasEmail) {
      // Has email → Email only, NO CALL
      callNeeded = false;
      channel = 'email';
      reasons.push('Has email - sending email campaign');
    } else {
      // No email → CALL NEEDED
      callNeeded = true;
      channel = 'call';
      
      // Set priority based on website
      if (!hasWebsite) {
        callPriority = 'high';
        reasons.push('No website and no email - urgent call needed');
      } else if (quality === 'hot') {
        callPriority = 'high';
        reasons.push('Hot lead with no email - call immediately');
      } else {
        callPriority = 'medium';
        reasons.push('Warm lead with no email - call required');
      }
    }
  }

  // Update lead with Tony's logic
  await Lead.findByIdAndUpdate(leadId, {
    $set: {
      score,
      quality,
      leadScoreReason: reasons,
      callNeeded,
      callPriority,
      callStatus: callNeeded ? 'pending' : 'not_needed',
      status: 'scored',
      metadata: {
        ...lead.metadata,
        outreachChannel: channel,
        hasEmail,
        hasWebsite,
        scoredAt: new Date()
      }
    }
  });

  logger.info(`📊 Lead scored with Tony's logic:`, {
    leadId,
    score,
    quality,
    hasEmail,
    hasWebsite,
    callNeeded,
    channel,
    reasons: reasons.slice(0, 2)
  });

  return {
    score,
    quality,
    reasons,
    callNeeded,
    callPriority,
    channel,
    hasEmail,
    hasWebsite
  };
}