// lib/scraper/serpSafeScraper.ts - WITH WAVE SIZE PAGINATION
import puppeteer from 'puppeteer';
import connectToDatabase from '../db/connect';
import { Lead, ILead } from '../db/models/Lead';
import { addJob } from '../queue/mongo-queue';
import { NICHES, NICHE_KEYWORDS } from '../constants/niches';
import { randomDelay, exponentialBackoff } from './utils/delay';
import { USER_AGENTS } from './utils/userAgent';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { logger } from '@/lib/scraper/utils/logger';

type NicheType = 'real-estate' | 'restaurant' | 'financial';

// Safe scraping configuration
const SAFE_CONFIG = {
  minDelay: 3000,
  maxDelay: 8000,
  maxPagesPerSession: 50,
  maxRetries: 3,
  viewportSizes: [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 }
  ],
  metadata: {
    developer: 'ahmed',
    version: '1.0.0'
  }
};

/**
 * Human-like random delay
 */
async function humanDelay() {
  const delay = SAFE_CONFIG.minDelay + Math.random() * (SAFE_CONFIG.maxDelay - SAFE_CONFIG.minDelay);
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Simulate mouse movement
 */
async function simulateMouseMovement(page: any) {
  try {
    const viewport = await page.viewport();
    for (let i = 0; i < 3; i++) {
      const x = Math.random() * viewport.width;
      const y = Math.random() * viewport.height;
      await page.mouse.move(x, y, { steps: 5 });
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    }
    logger.debug(`🐭 Mouse movement simulated`);
  } catch (error) {
    logger.error(`❌ Mouse movement failed`, { error });
  }
}

/**
 * Simulate scrolling
 */
async function simulateScroll(page: any) {
  try {
    const scrollAmount = 200 + Math.random() * 600;
    //@ts-ignore
    await page.evaluate((amount) => {
      window.scrollBy(0, amount);
    }, scrollAmount);
    
    logger.debug(`📜 Scrolled ${scrollAmount}px`);
    await humanDelay();
    
    if (Math.random() > 0.7) {
      await page.evaluate(() => {
        window.scrollBy(0, -100);
      });
      logger.debug(`📜 Scrolled back 100px`);
      await humanDelay();
    }
  } catch (error) {
    logger.error(`❌ Scroll failed`, { error });
  }
}

/**
 * Safe Puppeteer scrape with anti-block measures and wave size pagination
 */
export async function safePuppeteerScrape(
  niche: NicheType,
  location: string,
  maxResults: number = 20,
  waveSize: number = 20 // 👈 ADD waveSize parameter
): Promise<Partial<ILead>[]> {
  
  const startTime = Date.now();
  logger.info(`🗺️ Starting SAFE Puppeteer scrape`, { niche, location, maxResults, waveSize });
  logger.info(`👤 Developer: ${SAFE_CONFIG.metadata.developer}`);

  const tempDir = path.join(os.tmpdir(), `puppeteer_safe_${Date.now()}`);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    logger.debug(`📁 Created temp dir: ${tempDir}`);
  }

  let browser = null;
  const leads: Partial<ILead>[] = [];
  let allResults: any[] = [];

  try {
    // Launch with anti-detection args
    logger.info(`🚀 Launching browser...`);
    browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--window-size=1920,1080',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-client-side-phishing-detection',
        '--disable-default-apps',
        '--disable-hang-monitor',
        '--disable-prompt-on-repost',
        '--disable-sync',
        '--disable-translate',
        '--metrics-recording-only',
        '--no-zygote',
        `--user-data-dir=${tempDir}`
      ],
      ignoreDefaultArgs: ['--enable-automation'],
      timeout: 60000,
    });

    logger.success(`✅ Browser launched successfully`);
    
    const page = await browser.newPage();
    
    // Random viewport
    const viewport = SAFE_CONFIG.viewportSizes[
      Math.floor(Math.random() * SAFE_CONFIG.viewportSizes.length)
    ];
    await page.setViewport(viewport);
    logger.debug(`📐 Viewport set`, viewport);
    
    // Random user agent
    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    await page.setUserAgent(userAgent);
    logger.debug(`🔄 User agent set`, { userAgent: userAgent.substring(0, 50) });
    
    // Set realistic headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    });
    logger.debug(`📋 Headers set`);

    // Remove webdriver property
    await page.evaluateOnNewDocument(() => {
      delete (navigator as any).__proto__.webdriver;
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });
    logger.debug(`🕵️ Webdriver removed`);

    const nicheData = NICHES.find(n => n.id === niche);
    const keywords = nicheData?.searchTerms?.google || 
                    NICHE_KEYWORDS[niche]?.slice(0, 2) || 
                    [niche.replace('-', ' ')];
    
    logger.info(`🔍 Using keywords`, { keywords });

    for (const keyword of keywords) {
      // Stop if we already have enough leads
      if (leads.length >= waveSize) {
        logger.info(`✅ Reached wave size limit (${waveSize}), stopping keyword search`);
        break;
      }
      
      logger.info(`🔍 Searching for: ${keyword} in ${location} (wave progress: ${leads.length}/${waveSize})`);
      
      const searchQuery = `${keyword} ${location}`;
      
      // First go to Google (natural flow)
      logger.debug(`🌐 Navigating to Google...`);
      await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
      await humanDelay();
      
      // Type search
      await page.type('input[name="q"]', searchQuery, { delay: 50 + Math.random() * 100 });
      logger.debug(`⌨️ Typed search query`);
      await humanDelay();
      
      // Submit search
      await page.keyboard.press('Enter');
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      logger.debug(`🔍 Search submitted`);
      await humanDelay();
      
      // Simulate human reading
      await simulateScroll(page);
      await simulateMouseMovement(page);
      
      // Click on Maps link
      const mapsLink = await page.$('a[href*="maps.google.com"]');
      if (mapsLink) {
        await mapsLink.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        logger.debug(`🗺️ Clicked Maps link`);
        await humanDelay();
      }

      // Wait for results
      await page.waitForSelector('[role="article"]', { timeout: 30000 }).catch(() => {
        logger.warn(`⚠️ No results found for ${keyword}`);
      });
      await humanDelay();

      let previousHeight = 0;
      let scrollAttempts = 0;
      const maxScrollAttempts = 10;
      let pageResults = 0;

      // 👈 SCROLL WITH WAVE SIZE CHECK
      while (scrollAttempts < maxScrollAttempts && leads.length < waveSize) {
        const newResults = await page.evaluate(() => {
          const items: any[] = [];
          const cards = document.querySelectorAll('[role="article"]');
          
          cards.forEach((card) => {
            const nameEl = card.querySelector('.fontHeadlineSmall');
            if (!nameEl) return;
            
            items.push({
              name: nameEl.textContent?.trim() || '',
              website: card.querySelector('a[data-value="Website"]')?.getAttribute('href') || '',
              phone: card.querySelector('button[data-item-id^="phone:"]')?.getAttribute('data-item-id')?.replace('phone:', '') || '',
              address: card.querySelector('button[data-item-id^="address:"]')?.getAttribute('data-item-id')?.replace('address:', '') || '',
              rating: card.querySelector('.fontBodyMedium span[role="img"]')?.getAttribute('aria-label')?.match(/\d+\.?\d*/)?.[0] || null,
              reviews: card.querySelector('.fontBodyMedium span[aria-label*="reviews"]')?.textContent?.match(/\d+/)?.[0] || null
            });
          });
          
          return items;
        });

        allResults.push(...newResults);
        pageResults += newResults.length;
        logger.debug(`📄 Found ${newResults.length} results on current scroll (total: ${allResults.length})`);

        // Scroll like a human
        await simulateScroll(page);
        
        const newHeight = await page.evaluate(() => document.body.scrollHeight);
        if (newHeight === previousHeight) {
          scrollAttempts++;
          logger.debug(`⏹️ No more scroll, attempt ${scrollAttempts}/${maxScrollAttempts}`);
        } else {
          scrollAttempts = 0;
        }
        
        previousHeight = newHeight;
        await humanDelay();
        
        // Check if we have enough leads
        if (leads.length >= waveSize) {
          logger.info(`✅ Reached wave size (${waveSize}), stopping scroll`);
          break;
        }
      }

      logger.info(`📊 Page complete: ${pageResults} total results for ${keyword}`);
      await humanDelay();
    }

    // Remove duplicates
    const uniqueResults = Array.from(
      new Map(allResults.map(lead => [lead.name + lead.phone, lead])).values()
    );
    logger.info(`📊 Total unique results: ${uniqueResults.length}`);

    // 👈 SLICE TO WAVE SIZE (not maxResults)
    const resultsToProcess = uniqueResults.slice(0, Math.min(maxResults, waveSize));
    logger.info(`📦 Processing ${resultsToProcess.length} leads (wave size: ${waveSize})`);

    // Convert to Lead model format
    for (const result of resultsToProcess) {
      const websiteExists = !!result.website;
      
      leads.push({
        name: result.name,
        website: result.website || `no-website-${Date.now()}`,
        phone: result.phone,
        address: result.address,
        niche: niche,
        location: location,
        //@ts-ignore
        source: 'puppeteer_fallback',
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
          rating: result.rating,
          reviews: result.reviews,
          source: 'puppeteer_fallback',
          developer: SAFE_CONFIG.metadata.developer,
          scrapedAt: new Date().toISOString(),
          waveSize: waveSize // 👈 Store wave size in metadata
        },
        exportedToSheets: false,
        estuarySyncStatus: 'pending'
      });
    }

    const duration = Date.now() - startTime;
    logger.success(`✅ SAFE Puppeteer scrape complete`, { 
      leadsFound: leads.length, 
      waveSize,
      duration: `${duration}ms` 
    });
    
    return leads;

  } catch (error: any) {
    logger.error(`❌ Safe Puppeteer scraping error`, { 
      error: error.message,
      stack: error.stack 
    });
    return [];
  } finally {
    if (browser) {
      await browser.close();
      logger.debug(`🔄 Browser closed`);
      try {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
          logger.debug(`🧹 Temp directory cleaned`);
        }
      } catch (e) {
        logger.error(`❌ Failed to clean temp dir`, { error: e });
      }
    }
  }
}