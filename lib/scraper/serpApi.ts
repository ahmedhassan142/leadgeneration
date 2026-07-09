// lib/scraper/serpApiScraper.ts - UPDATED FOR MULTIPLE WAVES
import connectToDatabase from '../db/connect';
import { Lead } from '../db/models/Lead';
import { addJob } from '../queue/mongo-queue';
import { safePuppeteerScrape } from './safepupeeter';
import { logger } from '@/lib/scraper/utils/logger';
import serpApi from '../services/serpApiservice';

type NicheType = 'real-estate' | 'restaurant' | 'financial';

export interface ScrapeOptions {
  niche: NicheType;
  location: string;
  maxResults?: number;
  waveSize?: number; // 20, 40, 60, 80, 100
}

export async function scrapeWithSerp(
  niche: NicheType,
  location: string,
  maxResults: number = 100,
  waveSize: number = 20
): Promise<number> {
  const startTime = Date.now();
  
  // Calculate how many waves will be created
  const expectedWaves = Math.ceil(maxResults / waveSize);
  
  logger.info(`🚀 Starting SERP API scrape`, { 
    niche, 
    location, 
    maxResults, 
    waveSize,
    totalWaves: `${expectedWaves} wave${expectedWaves > 1 ? 's' : ''} of ${waveSize} leads each`
  });
  
  let leadsSaved = 0;
  let source = 'serp_api';
  
  // 🔥 Step 1: Try SERP API first
  const remainingSearches = serpApi.getRemainingSearches();
  
  if (remainingSearches > 0) {
    try {
      // Get ALL leads from API (no wave size limit here)
      const apiLeads = await serpApi.searchGoogleMaps(niche, location, maxResults);
      
      logger.info(`📥 SERP API returned ${apiLeads.length} total leads`);
      
      if (apiLeads.length > 0) {
        await connectToDatabase();
        
        // ✅ FIX: Process ALL leads - don't slice by waveSize here
        // The processor will automatically split into multiple waves
        for (const leadData of apiLeads) {
          try {
            // Check for duplicate leads
            const existingLead = await Lead.findOne({
              $or: [
                { website: leadData.website },
                { name: leadData.name, phone: leadData.phone }
              ]
            });

            let lead;
            if (existingLead) {
              // Update existing lead
              lead = await Lead.findByIdAndUpdate(
                existingLead._id,
                { 
                  $set: {
                    ...leadData,
                    updatedAt: new Date()
                  }
                },
                { new: true, returnDocument: 'after' }
              );
              logger.debug(`🔄 Updated existing lead`, { name: leadData.name });
            } else {
              // Create new lead
              lead = await Lead.create(leadData);
              logger.debug(`✅ Created new lead`, { name: leadData.name });
            }

            // ✅ ALWAYS create analyze job for leads with websites
            if (leadData.websiteExists && lead?.website && !lead.website.includes('no-website')) {
              await addJob('analyze', {
                leadId: lead._id.toString(),
                website: lead.website,
                source: 'serp_api',
                waveSize // Pass waveSize so processor knows batch size
              });
            }
            leadsSaved++;
          } catch (dbError: any) {
            logger.error(`❌ Error saving lead`, { error: dbError.message });
          }
        }
        
        source = 'serp_api';
        
        // Log wave breakdown
        const actualWaves = Math.ceil(leadsSaved / waveSize);
        logger.info(`📊 Wave breakdown: ${leadsSaved} leads → ${actualWaves} wave${actualWaves > 1 ? 's' : ''} of ${waveSize} leads each`);
        
      } else {
        logger.warn(`⚠️ SERP API returned 0 results`);
      }
    } catch (error: any) {
      logger.error(`❌ SERP API failed`, { error: error.message });
      logger.info(`⚠️ Falling back to Puppeteer`);
    }
  } else {
    logger.warn(`⚠️ SERP API daily limit reached, using Puppeteer fallback`);
  }
  
  // 🔥 Step 2: Puppeteer fallback (if API failed or no results)
  if (leadsSaved === 0) {
    logger.info(`🔄 Using safe Puppeteer fallback scraper`);
    source = 'puppeteer_fallback';
    
    try {
      // Get ALL leads from Puppeteer (no wave size limit)
      const puppeteerLeads = await safePuppeteerScrape(niche, location, maxResults);
      
      logger.info(`📥 Puppeteer returned ${puppeteerLeads.length} total leads`);
      
      if (puppeteerLeads.length > 0) {
        await connectToDatabase();
        
        // ✅ FIX: Process ALL leads - don't slice by waveSize
        for (const leadData of puppeteerLeads) {
          try {
            const existingLead = await Lead.findOne({
              $or: [
                { website: leadData.website },
                { name: leadData.name, phone: leadData.phone }
              ]
            });

            let lead;
            if (existingLead) {
              lead = await Lead.findByIdAndUpdate(
                existingLead._id,
                { 
                  $set: {
                    ...leadData,
                    updatedAt: new Date()
                  }
                },
                { new: true, returnDocument: 'after' }
              );
            } else {
              lead = await Lead.create(leadData);
            }

            if (leadData.websiteExists && lead?.website && !lead.website.includes('no-website')) {
              await addJob('analyze', {
                leadId: lead._id.toString(),
                website: lead.website,
                source: 'puppeteer_fallback',
                waveSize
              });
            }
            leadsSaved++;
          } catch (dbError: any) {
            logger.error(`❌ Error saving lead from puppeteer`, { error: dbError.message });
          }
        }
        
        const actualWaves = Math.ceil(leadsSaved / waveSize);
        logger.info(`📊 Wave breakdown: ${leadsSaved} leads → ${actualWaves} wave${actualWaves > 1 ? 's' : ''} of ${waveSize} leads each`);
        
      } else {
        logger.warn(`⚠️ Puppeteer returned 0 results`);
      }
    } catch (puppeteerError: any) {
      logger.error(`❌ Puppeteer fallback failed`, { 
        error: puppeteerError.message,
        stack: puppeteerError.stack 
      });
    }
  }
  
  const duration = Date.now() - startTime;
  const actualWaves = Math.ceil(leadsSaved / waveSize);
  
  logger.success(`✅ SCRAPING COMPLETE`, { 
    source, 
    leadsSaved, 
    waveSize,
    totalWaves: `${actualWaves} wave${actualWaves > 1 ? 's' : ''}`,
    duration: `${duration}ms`
  });
  
  return leadsSaved;
}