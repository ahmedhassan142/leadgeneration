// scripts/mobile.ts
import { mobileAppLeadGenerator } from '.././lib/scraper/MobileScraper';
import { logger } from '../lib/scraper/utils/logger';

async function generateMobileLeads() {
  const startTime = Date.now();
  
  try {
    const stats = await mobileAppLeadGenerator.generateLeads({
      categories: ['finance', 'business', 'health', 'education', 'shopping', 'food'],
      countries: ['us', 'ca', 'gb', 'au'],
      maxAppsPerCategory: 100,
      debug: true
    });
    
    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    MISSION COMPLETE! 🎉                       ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('\n');
    console.log(`⏱️  Total execution time: ${totalTime} minutes`);
    console.log(`🔥 Hot leads ready for outreach: ${stats.hot}`);
    console.log(`💾 Check your database for all ${stats.total} leads`);
    console.log('\n');
    
  } catch (error) {
    logger.error('❌ Lead generation failed:', error);
  }
}

// Run
generateMobileLeads();