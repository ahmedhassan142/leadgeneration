// lib/scraper/scrapingdogScraper.ts - COMPLETELY FIXED VERSION
import connectToDatabase from '../db/connect';
import { Lead } from '../db/models/Lead';
import { addJob } from '../queue/mongo-queue';
import { safePuppeteerScrape } from './safepupeeter';
import { logger } from '@/lib/scraper/utils/logger';
import scrapingDog from '../services/scrapingdogservice';

type NicheType = 'real-estate' | 'restaurant' | 'financial';

export async function scrapeWithScrapingDog(
  niche: NicheType,
  location: string,
  pages: number = 3,
  waveSize: number = pages * 20
): Promise<number> {
  const startTime = Date.now();
  logger.info(`🐕 Starting ScrapingDog scrape`, { niche, location, pages, waveSize });
  
  let leadsSaved = 0;
  let source = 'scrapingdog';
  
  // 🔥 Step 1: Try ScrapingDog API first
  const remainingSearches = scrapingDog.getRemainingSearches();
  
  if (remainingSearches > 0) {
    logger.info(`✅ Using ScrapingDog API`, { remainingSearches });
    
    try {
      // Get API results
      const apiResults = await scrapingDog.searchGoogleWeb(niche, location);
      logger.info(`📥 ScrapingDog API response`, { count: apiResults.length });
      
      // Process results if we got any
      if (apiResults && apiResults.length > 0) {
        // Slice to wave size (don't process more than waveSize)
        const resultsToProcess = apiResults.slice(0, waveSize);
        logger.info(`📦 Processing ${resultsToProcess.length} leads (wave size: ${waveSize})`);
        
        await connectToDatabase();
        
        for (const result of resultsToProcess) {
          // Skip invalid results
          if (!result || !result.name) {
            logger.debug(`⚠️ Skipping invalid result`);
            continue;
          }
          
          // Check if website exists
          const websiteExists = !!(result.website && result.website !== '' && !result.website.includes('no-website'));
          
          // Generate a unique placeholder if no website
          const websiteUrl = websiteExists 
            ? result.website 
            : `no-website-sd-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
          
          const leadData = {
            name: result.name,
            website: websiteUrl,
            phone: result.phone || '',
            address: result.address || '',
            niche: niche,
            location: location,
            source: 'scrapingdog',
            emails: [],
            websiteExists: websiteExists,
            websiteCheckDate: websiteExists ? new Date() : undefined,
            websiteError: websiteExists ? undefined : 'No website found',
            callNeeded: !websiteExists,
            callStatus: websiteExists ? 'not_needed' : 'pending',
            callPriority: websiteExists ? 'low' : 'high',
            score: websiteExists ? 0 : 100,
            quality: websiteExists ? 'cold' : 'hot',
            autoHotLead: !websiteExists,
            status: websiteExists ? 'raw' : 'scored',
            metadata: {
              rating: result.rating || null,
              reviews: result.reviews || null,
              category: result.category || null,
              source: 'scrapingdog',
              developer: 'ahmed',
              scrapedAt: new Date().toISOString(),
              waveSize: waveSize
            },
            exportedToSheets: false,
            estuarySyncStatus: 'pending'
          };

          try {
            // Check if lead already exists
            const existingLead = await Lead.findOne({
              $or: [
                { website: result.website },
                { name: result.name, phone: result.phone }
              ]
            });

            let lead;
            if (existingLead) {
              lead = await Lead.findByIdAndUpdate(
                existingLead._id,
                { $set: leadData },
                { new: true, returnDocument: 'after' }
              );
              logger.debug(`🔄 Updated existing lead`, { name: result.name });
            } else {
              lead = await Lead.create(leadData);
              logger.debug(`✅ Created new lead`, { name: result.name });
            }

            // Create analyze job if website exists
            if (websiteExists && lead?.website && !lead.website.includes('no-website')) {
              await addJob('analyze', {
                leadId: lead._id.toString(),
                website: lead.website,
                source: 'scrapingdog',
                waveSize
              });
            }
            leadsSaved++;
          } catch (dbError: any) {
            logger.error(`❌ Error saving lead`, { error: dbError.message });
          }
        }
        
        source = 'scrapingdog';
        logger.success(`✅ ScrapingDog API completed`, { leadsSaved, waveSize });
      } else {
        logger.warn(`⚠️ ScrapingDog API returned 0 results, using fallback`);
      }
    } catch (error: any) {
      logger.error(`❌ ScrapingDog API failed`, { error: error.message });
      logger.info(`⚠️ Falling back to safe Puppeteer`);
    }
  } else {
    logger.warn(`⚠️ ScrapingDog daily limit reached, using safe Puppeteer fallback`);
  }
  
  // 🔥 Step 2: Safe Puppeteer fallback with wave size
  if (leadsSaved === 0) {
    logger.info(`🔄 Using safe Puppeteer fallback scraper (wave size: ${waveSize})`);
    source = 'puppeteer_fallback';
    
    try {
      // Calculate max results based on wave size (each page ~20 results)
      const maxResults = waveSize;
      
      const puppeteerLeads = await safePuppeteerScrape(
        niche, 
        location, 
        maxResults,
        waveSize
      );
      
      logger.info(`📥 Puppeteer response`, { count: puppeteerLeads.length });
      
      if (puppeteerLeads && puppeteerLeads.length > 0) {
        await connectToDatabase();
        
        // Only take up to waveSize leads
        const leadsToProcess = puppeteerLeads.slice(0, waveSize);
        
        for (const leadData of leadsToProcess) {
          try {
            // Check if lead already exists
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
                    metadata: {
                      ...leadData.metadata,
                      fallbackSource: 'scrapingdog_fallback',
                      waveSize
                    }
                  }
                },
                { new: true, returnDocument: 'after' }
              );
            } else {
              lead = await Lead.create({
                ...leadData,
                metadata: {
                  ...leadData.metadata,
                  fallbackSource: 'scrapingdog_fallback',
                  waveSize
                }
              });
            }

            // Create analyze job if website exists
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
        
        logger.success(`✅ Puppeteer fallback completed`, { leadsSaved, waveSize });
      } else {
        logger.warn(`⚠️ Puppeteer fallback returned 0 results`);
      }
    } catch (puppeteerError: any) {
      logger.error(`❌ Puppeteer fallback failed`, { 
        error: puppeteerError.message,
        stack: puppeteerError.stack 
      });
    }
  }
  
  const duration = Date.now() - startTime;
  logger.success(`✅ SCRAPINGDOG SCRAPING COMPLETE`, { 
    source, 
    leadsSaved, 
    waveSize,
    duration: `${duration}ms`,
    developer: 'ahmed'
  });
  
  return leadsSaved;
}