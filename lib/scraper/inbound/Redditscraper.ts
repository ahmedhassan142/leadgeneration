// lib/scraper/inbound/redditScraper.ts - FIXED VERSION
import { InboundLead } from '@/lib/db/models/inboundlead';
import { Lead } from '@/lib/db/models/Lead';
import { PlaywrightSafeScraper } from '../safe-scraper/palaywright-safe';
import { logger } from '@/lib/scraper/utils/logger';
import { extractEmails } from '@/lib/analyzer/emailExtractor';
import { extractPhoneNumbers } from '@/lib/analyzer/phoneextractor';
import Parser from 'rss-parser';

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml'
  }
});
const SUBREDDITS = [
  // Original subreddits (keep these - they still work)
  'forhire', 'freelance', 'Entrepreneur', 'startups', 'smallbusiness',
  'webdev', 'reactjs', 'node', 'javascript', 'shopify', 'ecommerce',
  'freelance_forhire', 'remotejs', 'techhire',
  
  // MOBILE APP DEVELOPMENT (NEW - 12 subreddits)
  'mobileapp', 'androiddev', 'iOSProgramming', 'iOSDev', 'androidapps',
  'FlutterDev', 'reactnative', 'swift', 'kotlin', 'crossplatform',
  'appdev', 'mobileapps', 'AppDevelopers', 'Flutter', 'ReactNative',
  
  // MOBILE + AI (NEW - 8 subreddits)
  'MachineLearning', 'artificial', 'MLQuestions', 'learnmachinelearning',
  'AIforApps', 'AIDevelopment', 'MLinProduction', 'ComputerVision',
  
  // BUSINESS with MOBILE focus (NEW)
  'AppBusiness', 'AppIdeas', 'SaaS', 'sideproject', 'alphaandbetausers',
  'roastmystartup', 'startup_ideas', 'EntrepreneurRideAlong',
  
  // CLIENT FINDING specific (NEW)
  'HireAProgrammer', 'hireadev', 'HireAnAppDeveloper', 'HireAniOSDev',
  'forhireprogramming', 'remotejs', 'remoteandroid', 'remotefreelance'
];

const SEARCH_QUERIES = [
  // Original queries (keep these)
  'need developer', 'looking for developer', 'hire developer',
  'need web designer', 'shopify expert', 'website help',
  'need chatbot', 'seo expert', 'freelancer needed',
  
  // MOBILE APP DEVELOPMENT (NEW - 20 queries)
  'need mobile developer', 'need app developer', 'looking for app developer',
  'hire mobile developer', 'hire ios developer', 'hire android developer',
  'need flutter developer', 'need react native developer', 'app development help',
  'build my app', 'create my app', 'app idea help', 'need app maker',
  'looking for app builder', 'mobile app project', 'app prototype help',
  'need app designer', 'mobile ui ux designer', 'app development agency',
  'contract mobile developer', 'freelance app developer',
  
  // MOBILE + AI (NEW - 15 queries)
  'need ai developer for app', 'hire ai app developer', 'looking for ml engineer app',
  'need chatbot for app', 'ai features for mobile', 'ml integration for app',
  'computer vision app help', 'voice assistant app developer', 'need tensorflow lite expert',
  'ai mobile app development', 'machine learning app help', 'smart app development',
  'need ai features in app', 'add ai to my app', 'app with ai integration',
  
  // PAIN POINTS (NEW - 10 queries)
  'app not working', 'app crashing fix', 'need app maintenance',
  'update my app', 'redesign my app', 'app performance issues',
  'app store rejection help', 'play store rejection help', 'app launch help',
  'fix my app', 'app bug fixing',
  
  // HIGH INTENT (NEW - 10 queries)
  'budget for app development', 'app development cost', 'how much to build an app',
  'looking to build an app', 'ready to hire app developer', 'need app dev urgently',
  'app development quote', 'app development proposal', 'app development timeline',
  'app development requirements',
  
  // CROSS-PLATFORM (NEW - 5 queries)
  'flutter app help', 'react native developer needed', 'cross platform app development',
  'build for both ios android', 'hybrid app development'
];

export class RedditScraper extends PlaywrightSafeScraper {
  async scrape(): Promise<number> {
    logger.info('🔴 Starting Reddit scraper with fixed RSS...');
    let totalLeads = 0;

    for (const subreddit of SUBREDDITS) {
      for (const query of SEARCH_QUERIES) {
        try {
          // 🔥 FIX: Proper RSS URL with headers
          const rssUrl = `https://www.reddit.com/r/${subreddit}/search.rss?q=${encodeURIComponent(query)}&sort=new&restrict_sr=1&t=week`;
          
          logger.info(`📡 Fetching RSS: ${rssUrl}`);
          
          // Custom fetch with proper headers
          const response = await fetch(rssUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'application/rss+xml, application/xml, text/xml'
            }
          });

          if (!response.ok) {
            logger.warn(`⚠️ RSS failed (${response.status}), trying old.reddit.com...`);
            
            // 🔥 FALLBACK: Try old.reddit.com (less strict)
            const oldRssUrl = `https://old.reddit.com/r/${subreddit}/search.rss?q=${encodeURIComponent(query)}&sort=new&restrict_sr=on&t=week`;
            
            const oldResponse = await fetch(oldRssUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/rss+xml, application/xml, text/xml'
              }
            });
            
            if (!oldResponse.ok) {
              logger.warn(`⚠️ old.reddit.com also failed (${oldResponse.status})`);
              continue;
            }
            
            const xml = await oldResponse.text();
            await this.processRSSFeed(xml, subreddit, query, totalLeads);
            continue;
          }

          const xml = await response.text();
          totalLeads = await this.processRSSFeed(xml, subreddit, query, totalLeads);

        } catch (error) {
          logger.error(`❌ Reddit scrape failed for ${subreddit}:`, error);
          continue;
        }
        
        // Rate limiting
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    logger.success(`✅ Reddit scraper complete: ${totalLeads} leads`);
    return totalLeads;
  }

  private async processRSSFeed(xml: string, subreddit: string, query: string, totalLeads: number): Promise<number> {
    let leads = totalLeads;
    
    try {
      const feed = await parser.parseString(xml);
      
      if (!feed.items || feed.items.length === 0) {
        logger.debug(`⏭️ No items from r/${subreddit} for "${query}"`);
        return leads;
      }

      logger.info(`📊 r/${subreddit}: Found ${feed.items.length} posts for "${query}"`);

      for (const item of feed.items) {
        try {
          const title = item.title || '';
          const link = item.link || '';
          const content = item.content || item.contentSnippet || title;
          const author = item.author || item.creator || 'redditor';
          const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();

          // Skip if not relevant
          if (!this.isRelevant(title + ' ' + content)) continue;

          const existing = await InboundLead.findOne({ sourceUrl: link });
          if (existing) {
            logger.debug(`⏭️ Already exists: ${title.substring(0, 30)}...`);
            continue;
          }

          const requirement = this.extractRequirement(title + ' ' + content);
          const keywords = this.extractKeywords(title + ' ' + content);

          const inboundLead = await InboundLead.create({
            source: 'reddit',
            sourceUrl: link,
            sourceId: item.guid || link,
            title: title.substring(0, 200),
            content: content.substring(0, 1000),
            author: author,
            authorProfile: `https://reddit.com/u/${author}`,
            requirement: requirement,
            keywords: keywords,
            postedAt: pubDate,
            status: 'new',
            metadata: {
              subreddit,
              searchQuery: query,
              method: 'rss',
              confidence: 70,
              contactExtracted: false
            }
          });

          leads++;
          logger.info(`✅ Reddit lead: ${title.substring(0, 50)}...`);

        } catch (itemError) {
          logger.debug(`⚠️ Error processing item:`, itemError);
          continue;
        }
      }
    } catch (error) {
      logger.error(`❌ RSS parsing failed:`, error);
    }
    
    return leads;
  }

  // 🔥 NEW: Better relevance filtering
  private isRelevant(text: string): boolean {
    const lower = text.toLowerCase();
    
    const positive = [
      'need', 'looking for', 'help', 'hire', 'freelancer',
      'contract', 'gig', 'project', 'build', 'develop',
      'website', 'app', 'shopify', 'wordpress', 'react',
      'python', 'javascript', 'api', 'chatbot', 'ai'
    ];
    
    const negative = [
      'hiring', 'job', 'position', 'salary', 'remote',
      'full-time', 'part-time', 'senior', 'lead', 'manager'
    ];

    const hasPositive = positive.some(p => lower.includes(p));
    const hasNegative = negative.some(n => lower.includes(n));

    return hasPositive && !hasNegative;
  }

  private extractRequirement(text: string): string {
    const sentences = text.split(/[.!?]+/);
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      if (lower.includes('need') || 
          lower.includes('looking for') ||
          lower.includes('hire') ||
          lower.includes('help')) {
        return sentence.trim().substring(0, 200);
      }
    }
    return text.substring(0, 200);
  }

  private extractKeywords(text: string): string[] {
    const keywords = [];
    const lower = text.toLowerCase();
    
    const keywordMap = {
      'developer': ['developer', 'dev', 'programmer', 'coder', 'engineer'],
      'designer': ['designer', 'design', 'ui', 'ux', 'graphic'],
      'shopify': ['shopify', 'ecommerce', 'store'],
      'website': ['website', 'web', 'site', 'landing page'],
      'chatbot': ['chatbot', 'bot', 'automation', 'ai'],
      'seo': ['seo', 'search engine', 'ranking'],
      'freelancer': ['freelancer', 'freelance', 'contract', 'gig']
    };

    for (const [key, patterns] of Object.entries(keywordMap)) {
      if (patterns.some(p => lower.includes(p))) {
        keywords.push(key);
      }
    }

    return keywords;
  }
}