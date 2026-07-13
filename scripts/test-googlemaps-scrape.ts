// Google Maps scraper test via SerpApi
// Validates that the Google Maps scraping pipeline works
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { scrapeWithSerp } from '../lib/scraper/serpApi';

async function main() {
  console.log('=== Google Maps Scraper Test (SerpApi) ===');
  console.log('Niche:    real-estate');
  console.log('Location: Austin, TX');
  console.log('Max results: 20 (1 wave)');
  console.log('');

  try {
    const saved = await scrapeWithSerp('real-estate', 'Austin, TX', 20, 20);
    console.log(`\n✅ Scraped and saved ${saved} leads to MongoDB`);
  } catch (err: any) {
    console.error('❌ Scrape failed:', err?.message || err);
    process.exit(1);
  }
  process.exit(0);
}

main();
