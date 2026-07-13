// Quick scraping smoke test - small subset to verify it works
// Saves a scripts/quick-scrape-test.ts file under /home/z/my-project/leadgeneration/
import { mobileAppLeadGenerator } from '../lib/scraper/MobileScraper';
import { logger } from '../lib/scraper/utils/logger';

async function quickScrapeTest() {
  const startTime = Date.now();
  console.log('=== Quick Mobile Scrape Test ===');
  console.log('Categories: [finance], Countries: [us], maxAppsPerCategory: 10\n');

  try {
    const stats = await mobileAppLeadGenerator.generateLeads({
      categories: ['finance'],
      countries: ['us'],
      maxAppsPerCategory: 10,
      debug: true,
    });

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n=== SCRAPE COMPLETE ===');
    console.log(`Time: ${totalTime}s`);
    console.log(`Stats:`, stats);
  } catch (error) {
    logger.error('Scrape failed:', error);
    process.exit(1);
  }
  process.exit(0);
}

quickScrapeTest();
