// Fresh mobile scrape - new category to add new leads
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { mobileAppLeadGenerator } from '../lib/scraper/MobileScraper';

async function main() {
  console.log('=== Fresh Mobile Scrape (health, us, 15 apps) ===\n');
  const stats = await mobileAppLeadGenerator.generateLeads({
    categories: ['health'],
    countries: ['us'],
    maxAppsPerCategory: 15,
    debug: false,
  });
  console.log('\n=== SCRAPE STATS ===');
  console.log(JSON.stringify(stats, null, 2));
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
