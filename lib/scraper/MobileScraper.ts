// services/mobile-app-lead-generator.ts
import { InboundLead, IInboundLead } from '@/lib/db/models/inboundlead';
import { iOSAppStoreScraper } from './IOS-Scraper';
import { GooglePlayScraper } from './ANdroid-Scraper';
import { CategoryMapper } from '../services/category';
import connectToDatabase from '@/lib/db/connect';
import { logger } from '@/lib/scraper/utils/logger';

export interface ScoredApp {
  app: any;
  platform: 'ios' | 'android';
  score: number;
  quality: 'hot' | 'warm' | 'cold';
  reasons: string[];
  breakdown: {
    rating: number;
    updateRecency: number;
    popularity: number;
    monetization: number;
    engagement: number;
    total: number;
  };
}

export class MobileAppLeadGenerator {
  private iosScraper: iOSAppStoreScraper;
  private androidScraper: GooglePlayScraper;
  private debugMode: boolean;
  
  constructor(debugMode: boolean = true) {
    this.iosScraper = new iOSAppStoreScraper();
    this.androidScraper = new GooglePlayScraper();
    this.debugMode = debugMode;
  }

  /**
   * MAIN LEAD GENERATION ALGORITHM
   * Fetches raw apps, scores them, classifies, and saves to database
   */
  async generateLeads(options: {
    categories?: string[];
    countries?: string[];
    maxAppsPerCategory?: number;
    minScore?: number;
    debug?: boolean;
  } = {}) {
    const {
      // Use simple category names (not platform-specific)
      categories = ['finance', 'business', 'health', 'education', 'shopping', 'food'],
      countries = ['us', 'ca', 'gb', 'au'],
      maxAppsPerCategory = 100,
      debug = this.debugMode
    } = options;

    const startTime = Date.now();
    await connectToDatabase();
    
    // Clear console for better visibility
    console.clear();
    
    // BIG BANNER
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║         MOBILE APP LEAD GENERATION SYSTEM v1.0               ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('\n');
    
    logger.info(`🚀 Starting mobile app lead generation for ${categories.length} categories`);
    
    // Show categories with proper display names
    logger.info(`📊 Categories: ${categories.map(c => CategoryMapper.getDisplayName(c)).join(', ')}`);
    logger.info(`🌍 Countries: ${countries.join(', ')}`);
    logger.info(`📱 Max apps per category: ${maxAppsPerCategory}`);
    logger.info(`🔍 Debug mode: ${debug ? 'ON' : 'OFF'}`);
    console.log('\n' + '─'.repeat(80) + '\n');

    const allLeads: ScoredApp[] = [];
    let totalIOS = 0;
    let totalAndroid = 0;

    for (const category of categories) {
      console.log(`\n📦 CATEGORY: ${CategoryMapper.getDisplayName(category)}`);
      console.log('─'.repeat(40));
      
      for (const country of countries) {
        console.log(`\n  🌍 Country: ${country.toUpperCase()}`);
        console.log('  ' + '─'.repeat(30));

        try {
          // ===========================================
          // iOS APPS
          // ===========================================
          console.log(`  📱 iOS: Scraping...`);
          const iosStart = Date.now();
          
          const iosApps = await this.iosScraper.getTopApps(category, country, maxAppsPerCategory);
          totalIOS += iosApps.length;
          
          console.log(`     ✅ Found ${iosApps.length} iOS apps (${Date.now() - iosStart}ms)`);
          
          if (iosApps.length > 0) {
            const sampleApp = iosApps[0];
            console.log(`     📊 Sample: ${sampleApp?.title || 'N/A'} (${(sampleApp?.score || 0).toFixed(2)}⭐)`);
          }

          console.log(`     🔄 Scoring iOS apps...`);
          const iosScored = await this.scoreApps(iosApps, 'ios', category, country, debug);
          allLeads.push(...iosScored);
          
          this.printScoreSummary(iosScored, 'ios');

          // ===========================================
          // ANDROID APPS
          // ===========================================
          console.log(`\n  🤖 Android: Scraping...`);
          const androidStart = Date.now();
          
          const androidApps = await this.androidScraper.getTopApps(
            category,  // Pass same category name, mapper handles it
            null, 
            maxAppsPerCategory, 
            country
          );
          totalAndroid += androidApps.length;
          
          console.log(`     ✅ Found ${androidApps.length} Android apps (${Date.now() - androidStart}ms)`);
          
          if (androidApps.length > 0) {
            const sampleApp = androidApps[0];
            console.log(`     📊 Sample: ${sampleApp?.title} (${(sampleApp?.score || 0).toFixed(2)}⭐)`);
          }

          console.log(`     🔄 Scoring Android apps...`);
          const androidScored = await this.scoreApps(androidApps, 'android', category, country, debug);
          allLeads.push(...androidScored);
          
          this.printScoreSummary(androidScored, 'android');

          // Show running total
          console.log(`\n  📈 Running Total: ${allLeads.length} leads (iOS: ${totalIOS}, Android: ${totalAndroid})`);
          
          // Throttle between countries
          if (countries.indexOf(country) < countries.length - 1) {
            console.log(`  ⏳ Waiting 2 seconds before next country...`);
            await new Promise(r => setTimeout(r, 2000));
          }

        } catch (error:any) {
          console.error(`  ❌ Error: ${error.message}`);
          if (debug) {
            console.error('     Stack:', error.stack);
          }
        }
      }
      console.log('\n' + '─'.repeat(40));
    }

    // FINAL SUMMARY
    console.log('\n' + '═'.repeat(80));
    console.log('📊 FINAL SCRAPING SUMMARY');
    console.log('═'.repeat(80));
    console.log(`📱 Total Apps Scraped: ${allLeads.length}`);
    console.log(`   ├─ iOS: ${totalIOS}`);
    console.log(`   └─ Android: ${totalAndroid}`);
    console.log(`⏱️  Time taken: ${((Date.now() - startTime) / 1000 / 60).toFixed(2)} minutes`);
    console.log('═'.repeat(80));

    // Save to database
    console.log('\n💾 SAVING TO DATABASE');
    console.log('─'.repeat(40));
    
    const saveStart = Date.now();
    const saveStats = await this.saveLeadsToDatabase(allLeads, debug);
    
    console.log(`\n✅ Database save complete in ${((Date.now() - saveStart) / 1000).toFixed(2)} seconds`);
    console.log(`   New leads: ${saveStats.saved}`);
    console.log(`   Duplicates: ${saveStats.duplicates}`);
    console.log(`   Failed: ${saveStats.failed}`);
    
    // FINAL STATISTICS
    const stats = this.getStatistics(allLeads);
    
    console.log('\n' + '═'.repeat(80));
    console.log('🎯 LEAD QUALITY BREAKDOWN');
    console.log('═'.repeat(80));
    console.log(`🔥 HOT LEADS:   ${stats.hot} (${stats.percentages.hot}%)`);
    console.log(`💫 WARM LEADS:  ${stats.warm} (${stats.percentages.warm}%)`);
    console.log(`❄️ COLD LEADS:   ${stats.cold} (${stats.percentages.cold}%)`);
    console.log('─'.repeat(40));
    console.log(`📱 iOS: ${stats.ios} (${stats.percentages.ios}%)`);
    console.log(`🤖 Android: ${stats.android} (${stats.percentages.android}%)`);
    console.log('─'.repeat(40));
    console.log(`📈 Average Score: ${stats.averageScore}`);
    console.log(`🏆 Top Score: ${stats.topScore}`);
    console.log(`📊 Score Distribution:`);
    console.log(`   90-100: ${stats.scoreDistribution['90-100']}`);
    console.log(`   80-89:  ${stats.scoreDistribution['80-89']}`);
    console.log(`   70-79:  ${stats.scoreDistribution['70-79']}`);
    console.log(`   60-69:  ${stats.scoreDistribution['60-69']}`);
    console.log(`   50-59:  ${stats.scoreDistribution['50-59']}`);
    console.log(`   40-49:  ${stats.scoreDistribution['40-49']}`);
    console.log(`   30-39:  ${stats.scoreDistribution['30-39']}`);
    console.log(`   20-29:  ${stats.scoreDistribution['20-29']}`);
    console.log(`   10-19:  ${stats.scoreDistribution['10-19']}`);
    console.log(`   0-9:    ${stats.scoreDistribution['0-9']}`);
    console.log('═'.repeat(80));

    return stats;
  }

  /**
   * Print score summary for debugging
   */
  private printScoreSummary(scoredApps: ScoredApp[], platform: string) {
    const hot = scoredApps.filter(a => a.quality === 'hot').length;
    const warm = scoredApps.filter(a => a.quality === 'warm').length;
    const cold = scoredApps.filter(a => a.quality === 'cold').length;
    
    console.log(`     📊 Scores: 🔥${hot} hot, 💫${warm} warm, ❄️${cold} cold`);
    
    if (scoredApps.length > 0 && this.debugMode) {
      // Show top 3 scoring apps
      const topApps = [...scoredApps].sort((a, b) => b.score - a.score).slice(0, 3);
      console.log(`     🏆 Top scores:`);
      topApps.forEach((app, i) => {
        console.log(`        ${i+1}. ${app.app.title || app.app.name}: ${app.score} (${app.quality})`);
        console.log(`           Reasons: ${app.reasons.join(', ')}`);
      });
    }
  }

  /**
   * ADVANCED SCORING ALGORITHM
   */
  private async scoreApps(apps: any[], platform: 'ios' | 'android', category: string, country: string, debug: boolean): Promise<ScoredApp[]> {
    const scoredApps: ScoredApp[] = [];
    let processed = 0;

    for (const app of apps) {
      try {
        if (debug && processed % 10 === 0) {
          console.log(`     🔄 Processing app ${processed + 1}/${apps.length}...`);
        }

        // Get full details for scoring
        let fullApp = app;
        if (platform === 'ios') {
          const result = await this.iosScraper.getAppById(app.id, country);
          if (result.success) {
            fullApp = result.data;
          } else {
            processed++;
            continue;
          }
        } else {
          const result = await this.androidScraper.getAppDetails(app.appId || app.appId, country);
          if (result.success) {
            fullApp = result.data;
          } else {
            processed++;
            continue;
          }
        }

        // SCORING BREAKDOWN
        const ratingScore = this.scoreRating(fullApp);
        const updateScore = this.scoreUpdateRecency(fullApp);
        const popularityScore = this.scorePopularity(fullApp);
        const monetizationScore = this.scoreMonetization(fullApp);
        const engagementScore = this.scoreEngagement(fullApp);
        
        const total = Math.min(
          ratingScore + updateScore + popularityScore + monetizationScore + engagementScore, 
          100
        );

        const breakdown = {
          rating: ratingScore,
          updateRecency: updateScore,
          popularity: popularityScore,
          monetization: monetizationScore,
          engagement: engagementScore,
          total
        };

        // Generate reasons
        const reasons = this.generateReasons(fullApp, breakdown);

        // Determine quality
        const quality = this.determineQuality(total);

        scoredApps.push({
          app: fullApp,
          platform,
          score: total,
          quality,
          reasons,
          breakdown
        });

        if (debug && total >= 70) {
          console.log(`     🔥 HOT LEAD FOUND: ${fullApp.title || fullApp.name} - Score: ${total}`);
          console.log(`        Reasons: ${reasons.join(', ')}`);
        }

        processed++;

        // Throttle to avoid rate limits
        await new Promise(r => setTimeout(r, 500));

      } catch (error:any) {
        if (debug) console.error(`     ❌ Error scoring app:`, error.message);
        processed++;
      }
    }

    return scoredApps;
  }

  /**
   * Rating Score (0-30 points) - UPDATED for better distribution
   */
  private scoreRating(app: any): number {
    const rating = app.score || app.rating;
    
    if (!rating) return 0;
    
    // More granular scoring
    if (rating < 3.0) return 35;      // Critical - needs complete redesign
    if (rating < 3.3) return 30;      // Major issues
    if (rating < 3.6) return 25;      // Significant problems
    if (rating < 3.9) return 20;      // Below average
    if (rating < 4.2) return 15;      // Average - room for improvement
    if (rating < 4.5) return 10;      // Good - minor improvements
    if (rating < 4.8) return 5;       // Very good
    return 0;                          // Excellent
  }

  /**
   * Update Recency Score (0-40 points) - FIXED date parsing
   */
  private scoreUpdateRecency(app: any): number {
    // Handle different date formats
    let lastUpdate: Date;
    
    if (app.updated) {
      lastUpdate = new Date(app.updated);
    } else if (app.updated) {
      lastUpdate = new Date(app.updated);
    } else {
      return 0; // No date info
    }
    
    // Check if date is valid
    if (isNaN(lastUpdate.getTime())) {
      return 0;
    }
    
    const now = new Date();
    const monthsDiff = (now.getFullYear() - lastUpdate.getFullYear()) * 12 +
                       (now.getMonth() - lastUpdate.getMonth());

    if (monthsDiff > 36) return 45;    // 3+ years - CRITICAL
    if (monthsDiff > 24) return 40;    // 2+ years - URGENT
    if (monthsDiff > 18) return 35;    // 1.5+ years - major need
    if (monthsDiff > 12) return 30;    // 1+ years - needs update
    if (monthsDiff > 9) return 25;     // 9+ months - should update
    if (monthsDiff > 6) return 20;     // 6+ months - could update
    if (monthsDiff > 3) return 15;     // 3+ months - minor update
    if (monthsDiff > 1) return 10;     // 1+ months - recent
    return 5;                           // Very recent
  }

  /**
   * Popularity Score (0-20 points) - FIXED for both platforms
   */
  private scorePopularity(app: any): number {
    // iOS uses reviews count
    const reviews = app.reviews || app.ratings || 0;
    
    // Android uses installs
    const downloads = app.maxInstalls || app.minInstalls || 0;
    
    // Use whichever is higher
    const popularity = Math.max(reviews, downloads);
    
    if (popularity > 5000000) return 25;   // 5M+ - HUGE budget
    if (popularity > 1000000) return 22;   // 1M+ - very large
    if (popularity > 500000) return 20;    // 500k+ - large
    if (popularity > 250000) return 18;    // 250k+ - good
    if (popularity > 100000) return 16;    // 100k+ - decent
    if (popularity > 50000) return 14;     // 50k+ - moderate
    if (popularity > 25000) return 12;     // 25k+ - small but growing
    if (popularity > 10000) return 10;     // 10k+ - has budget
    if (popularity > 5000) return 8;       // 5k+ - minimal
    if (popularity > 1000) return 6;       // 1k+ - very small
    if (popularity > 100) return 4;        // 100+ - new app
    return 2;                               // Brand new
  }

  /**
   * Monetization Score (0-10 points)
   */
  private scoreMonetization(app: any): number {
    let score = 0;
    
    if (app.price > 0 || app.free === false) score += 5;
    if (app.hasInAppPurchases || app.offersIAP) score += 3;
    if (app.hasAds || app.adSupported) score += 2;
    
    return score;
  }

  /**
   * Engagement Score (0-10 points)
   */
  private scoreEngagement(app: any): number {
    let score = 0;
    
    if (app.recentReviews && app.recentReviews.length > 10) score += 3;
    if (app.versionHistory && app.versionHistory.length > 5) score += 3;
    
    const reviewRatio = (app.reviews || 0) / (app.maxInstalls || 1);
    if (reviewRatio > 0.01) score += 4;
    
    return score;
  }

  /**
   * Generate human-readable reasons
   */
  private generateReasons(app: any, breakdown: any): string[] {
    const reasons = [];
    const rating = app.score || app.rating;
    
    if (breakdown.rating >= 25) {
      reasons.push(`Low rating (${rating?.toFixed(1) || '?'}⭐) - needs redesign`);
    }
    
    if (breakdown.updateRecency >= 30) {
      const lastUpdate = new Date(app.updated || app.updated);
      if (!isNaN(lastUpdate.getTime())) {
        const months = Math.floor((Date.now() - lastUpdate.getTime()) / (30 * 24 * 60 * 60 * 1000));
        reasons.push(`No update in ${months} months - needs maintenance`);
      }
    }
    
    if (breakdown.popularity >= 15) {
      const downloads = app.maxInstalls || app.reviews || 0;
      reasons.push(`Popular app (${this.formatNumber(downloads)} users) - has budget`);
    }
    
    if (breakdown.monetization >= 5) {
      reasons.push(`Paid app / has IAP - already investing`);
    }
    
    if (breakdown.engagement >= 5) {
      reasons.push(`High user engagement - active user base`);
    }
    
    return reasons;
  }

  /**
   * Determine lead quality
   */
  private determineQuality(score: number): 'hot' | 'warm' | 'cold' {
    if (score >= 70) return 'hot';
    if (score >= 40) return 'warm';
    return 'cold';
  }

  /**
   * Save leads to database
   */
  private async saveLeadsToDatabase(scoredApps: ScoredApp[], debug: boolean) {
    let saved = 0;
    let duplicates = 0;
    let failed = 0;

    console.log(`\n  💾 Saving ${scoredApps.length} leads to database...`);

    for (let i = 0; i < scoredApps.length; i++) {
      const scored = scoredApps[i];
      
      if (debug && i % 50 === 0) {
        const percent = Math.round((i / scoredApps.length) * 100);
        console.log(`     Progress: ${i}/${scoredApps.length} (${percent}%)`);
      }

      try {
        const app = scored.app;
        const platform = scored.platform;
        
        // Check for duplicate
        const existing = await InboundLead.findOne({
          source: platform === 'ios' ? 'app_store_ios' : 'play_store_android',
          sourceId: app.id || app.appId
        });

        if (existing) {
          duplicates++;
          continue;
        }

        // Create new inbound lead
        const lead = new InboundLead({
          source: platform === 'ios' ? 'app_store_ios' : 'play_store_android',
          sourceUrl: app.url || 
                    (platform === 'ios' 
                      ? `https://apps.apple.com/app/${app.id}` 
                      : `https://play.google.com/store/apps/details?id=${app.appId || app.appId}`),
          sourceId: app.id || app.appId,
          
          title: app.title || app.name || 'Unknown App',
          content: app.description || app.summary || '',
          author: app.developer || app.developerName || 'Unknown',
          authorProfile: app.developerWebsite || app.developerUrl,
          
          requirement: this.generateRequirement(scored),
          keywords: this.extractKeywords(app, scored),
          
          leadScore: scored.score,
          leadQuality: scored.quality,
          scoreReasons: scored.reasons,
          scoreBreakdown: scored.breakdown,
          
          appMetadata: {
            appId: app.id || app.appId,
            platform,
            rating: app.score || app.rating,
            ratingsCount: app.reviews || app.ratings || 0,
            lastUpdate: app.updated || app.updated,
            price: app.price || 0,
            isFree: app.free === undefined ? (app.price === 0) : app.free,
            downloads: app.maxInstalls || app.minInstalls,
            minInstalls: app.minInstalls,
            maxInstalls: app.maxInstalls,
            developer: app.developer || app.developerName,
            developerEmail: app.developerEmail,
            developerWebsite: app.developerWebsite,
            categories: app.genres || [app.genre].filter(Boolean),
            version: app.version,
            contentRating: app.contentRating,
            privacyPolicy: app.privacyPolicy
          },
          
          postedAt: app.updated || new Date(),
          discoveredAt: new Date(),
          status: 'new'
        });

        await lead.save();
        saved++;

      } catch (error:any) {
        failed++;
        if (debug) {
          console.error(`     ❌ Error saving lead ${i+1}:`, error.message);
        }
      }
    }

    return { saved, duplicates, failed };
  }

  /**
   * Generate requirement text
   */
  private generateRequirement(scored: ScoredApp): string {
    const app = scored.app;
    const name = app.title || app.name || 'Unknown';
    let requirement = `${name}: `;
    requirement += scored.reasons.join(' ');
    return requirement;
  }

  /**
   * Extract keywords
   */
  private extractKeywords(app: any, scored: ScoredApp): string[] {
    const keywords = [];
    
    if (app.genres) keywords.push(...app.genres);
    if (app.genre) keywords.push(app.genre);
    
    keywords.push(scored.quality);
    keywords.push(`score-${scored.score}`);
    keywords.push(scored.platform);
    
    return [...new Set(keywords)].filter(Boolean);
  }

  /**
   * Get statistics
   */
  private getStatistics(leads: ScoredApp[]) {
    const hot = leads.filter(l => l.quality === 'hot').length;
    const warm = leads.filter(l => l.quality === 'warm').length;
    const cold = leads.filter(l => l.quality === 'cold').length;
    
    const iosLeads = leads.filter(l => l.platform === 'ios').length;
    const androidLeads = leads.filter(l => l.platform === 'android').length;
    
    const avgScore = leads.reduce((sum, l) => sum + l.score, 0) / leads.length;
    const topScore = Math.max(...leads.map(l => l.score));
    
    // Score distribution
    const distribution = {
      '90-100': 0, '80-89': 0, '70-79': 0, '60-69': 0,
      '50-59': 0, '40-49': 0, '30-39': 0, '20-29': 0,
      '10-19': 0, '0-9': 0
    };
    
    leads.forEach(l => {
      if (l.score >= 90) distribution['90-100']++;
      else if (l.score >= 80) distribution['80-89']++;
      else if (l.score >= 70) distribution['70-79']++;
      else if (l.score >= 60) distribution['60-69']++;
      else if (l.score >= 50) distribution['50-59']++;
      else if (l.score >= 40) distribution['40-49']++;
      else if (l.score >= 30) distribution['30-39']++;
      else if (l.score >= 20) distribution['20-29']++;
      else if (l.score >= 10) distribution['10-19']++;
      else distribution['0-9']++;
    });

    return {
      total: leads.length,
      hot,
      warm,
      cold,
      ios: iosLeads,
      android: androidLeads,
      averageScore: Math.round(avgScore * 10) / 10,
      topScore,
      scoreDistribution: distribution,
      percentages: {
        hot: leads.length ? Math.round((hot / leads.length) * 100) : 0,
        warm: leads.length ? Math.round((warm / leads.length) * 100) : 0,
        cold: leads.length ? Math.round((cold / leads.length) * 100) : 0,
        ios: leads.length ? Math.round((iosLeads / leads.length) * 100) : 0,
        android: leads.length ? Math.round((androidLeads / leads.length) * 100) : 0
      }
    };
  }

  /**
   * Utility: Format number with commas
   */
  private formatNumber(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  /**
   * Show banner
   */
  private showBanner() {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║         MOBILE APP LEAD GENERATION SYSTEM v1.0               ║');
    console.log('║                      by Your Name                            ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('\n');
  }
}

// Export singleton
export const mobileAppLeadGenerator = new MobileAppLeadGenerator(true);