// lib/analyzer/emailExtractor.ts - FIXED VERSION (NO FAKE EMAILS)
import { PlaywrightSafeScraper } from '@/lib/scraper/safe-scraper/palaywright-safe';
import { Lead } from '@/lib/db/models/Lead';
import { logger } from '@/lib/scraper/utils/logger';

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PAGES_TO_CHECK = ['', 'contact', 'contact-us', 'privacy-policy', 'privacy'];
const MAX_EXTRACTION_TIME = 15000; // 15 seconds total
const MAX_EMAILS = 1; // Sirf 1 email chahiye

export async function extractEmails(leadId: string, website: string) {
  const scraper = new PlaywrightSafeScraper();
  const startTime = Date.now();
  const foundEmails = new Set<string>();
  const results: any = {
    success: true,
    emailsFound: [],
    count: 0,
    pagesChecked: [],
    errors: [],
    generatedEmails: false // 👈 Never generate fake emails
  };

  try {
    logger.info(`📧 Fast email extraction for ${website}`, { leadId });

    await scraper.launch({ headless: true });
    
    // Try homepage first
    logger.info(`🌐 Checking homepage: ${website}`);
    try {
      await scraper.humanizedGoto(website, { 
        waitUntil: 'domcontentloaded',
        timeout: 8000,
        randomDelay: false
      });
      const emails = await scraper.extractEmails();
      emails.forEach(email => foundEmails.add(email.toLowerCase()));
      results.pagesChecked.push(website);
    } catch (error: any) {
      results.errors.push({ url: website, error: error.message });
    }

    // If email found, stop
    if (foundEmails.size >= MAX_EMAILS) {
      logger.info(`✅ Found email on homepage, skipping other pages`);
    } else {
      // Try contact pages
      for (const pagePath of PAGES_TO_CHECK.slice(1)) {
        if (Date.now() - startTime > MAX_EXTRACTION_TIME) {
          logger.info(`⏰ Time limit reached, stopping extraction`);
          break;
        }
        
        if (foundEmails.size >= MAX_EMAILS) {
          logger.info(`✅ Found ${foundEmails.size} email, stopping`);
          break;
        }
        
        const url = `${website.replace(/\/$/, '')}/${pagePath}`;
        logger.info(`🌐 Checking: ${url}`);
        
        try {
          await scraper.humanizedGoto(url, { 
            waitUntil: 'domcontentloaded', 
            timeout: 5000,
            randomDelay: false 
          });
          const emails = await scraper.extractEmails();
          emails.forEach(email => foundEmails.add(email.toLowerCase()));
          results.pagesChecked.push(url);
        } catch (error: any) {
          results.errors.push({ url, error: error.message });
        }
      }
    }

    // ✅ FIX: DO NOT generate fake emails - only use real ones found
    // If no emails found, leave array empty - do NOT create fake info@domain.com
    if (foundEmails.size === 0) {
      logger.warn(`⚠️ No emails found for ${website}, lead will be marked for call`);
      results.generatedEmails = false;
      // No fake email created!
    }

    results.emailsFound = Array.from(foundEmails);
    results.count = results.emailsFound.length;

    // Get lead to check quality
    const lead = await Lead.findById(leadId);
    
    // Call logic - if no email found, mark for call
    let callNeeded = false;
    let callPriority: 'high' | 'medium' | 'low' = 'low';
    
    if (lead) {
      const hasRealEmail = results.emailsFound.length > 0;
      
      if (lead.quality === 'cold') {
        // Cold leads: only call if high potential
        callNeeded = !hasRealEmail && lead.score > 30;
        callPriority = 'medium';
      }
      else if (lead.quality === 'warm') {
        // Warm leads: need call if no email found
        callNeeded = !hasRealEmail;
        callPriority = 'medium';
      }
      else if (lead.quality === 'hot') {
        // Hot leads: ALWAYS need call if no email found
        callNeeded = !hasRealEmail;
        callPriority = 'high';
      }
    }

    // Update lead - FAST update
    await Lead.findByIdAndUpdate(
      leadId,
      {
        $set: {
          emails: results.emailsFound, // 👈 Will be empty array if no emails found
          callNeeded,
          callPriority,
          callStatus: callNeeded ? 'pending' : 'not_needed',
          emailExtractedAt: new Date(),
          emailExtractionTime: Date.now() - startTime,
          'analysis.emailExtraction': {
            count: results.count,
            pagesChecked: results.pagesChecked.length,
            generated: false, // 👈 Never generated
            hasRealEmail: results.count > 0,
            duration: Date.now() - startTime,
            extractedAt: new Date()
          }
        }
      }
    );

    logger.success(`✅ Email extraction complete in ${Date.now() - startTime}ms`, {
      leadId,
      emailsFound: results.count,
      callNeeded
    });

    return {
      ...results,
      callNeeded,
      callPriority,
      duration: Date.now() - startTime
    };

  } catch (error: any) {
    logger.error(`❌ Email extraction failed`, { leadId, error: error.message });
    
    results.success = false;
    results.error = error.message;
    
    const isBlocked = error.message.includes('ERR_BLOCKED_BY_CLIENT') || 
                      error.message.includes('captcha') ||
                      error.message.includes('blocked') ||
                      error.message.includes('403') ||
                      error.message.includes('429');
    
    const lead = await Lead.findById(leadId);
    let callNeeded = false;
    let callPriority: 'high' | 'medium' | 'low' = 'low';
    
    if (lead) {
      if (lead.quality === 'hot' || lead.quality === 'warm') {
        callNeeded = true;
        callPriority = lead.quality === 'hot' ? 'high' : 'medium';
      }
    }
    
    await Lead.findByIdAndUpdate(
      leadId,
      {
        $set: {
          emails: [], // 👈 Empty array - no fake emails
          callNeeded,
          callPriority,
          callStatus: callNeeded ? 'pending' : 'not_needed',
          blocked: isBlocked ? true : false,
          blockReason: isBlocked ? error.message : null,
          'analysis.emailExtraction': {
            error: error.message,
            blocked: isBlocked,
            duration: Date.now() - startTime,
            attemptedAt: new Date()
          }
        }
      }
    );
    
    return {
      ...results,
      callNeeded,
      callPriority,
      blocked: isBlocked
    };

  } finally {
    await scraper.close();
  }
}