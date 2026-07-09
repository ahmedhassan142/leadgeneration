// lib/scraper/inbound/hackerNewsScraper.ts - FIXED VERSION
import { InboundLead } from '@/lib/db/models/inboundlead';
import { logger } from '@/lib/scraper/utils/logger';
import { extractEmails } from '@/lib/analyzer/emailExtractor';
import { PlaywrightSafeScraper } from '@/lib/scraper/safe-scraper/palaywright-safe';
import { extractPhoneNumbers } from '@/lib/analyzer/phoneextractor';

// client-finding-keywords.js

const RELEVANT_KEYWORDS = [
  // Original hiring keywords
  'hiring', 'looking for', 'need developer', 'need engineer',
  
  // MOBILE APP SPECIFIC (17 keywords)
  'need mobile developer', 'looking for app developer', 'hire app developer',
  'need ios developer', 'looking for android dev', 'need flutter developer',
  'need react native dev', 'app development help', 'mobile app agency needed',
  'need app maker', 'looking for app builder', 'app development services',
  'mobile app freelancer', 'remote app developer', 'contract mobile dev',
  
  // MOBILE + AI SPECIFIC (12 keywords)
  'need ai developer for app', 'looking for ml engineer mobile', 
  'hire ai app developer', 'need chatbot for app', 'ai features for mobile',
  'ml integration for app', 'computer vision for app', 'voice assistant app',
  'need ai mobile app developer', 'looking for tensorflow lite expert',
  'ai app startup', 'tech co-founder for app',
  
  // Partnership/Startup
  'seek partner', 'co-founder', 'startup', 'saas',
  'mobile app startup', 'ai app startup',
  
  // Launching/Building
  'launching', 'built', 'show hn', 'ask hn',
  'building mobile app', 'launching app', 'built an app', 'app idea',
  
  // Freelance/Contract
  'freelancer', 'contract', 'remote job', 'work with us',
  
  // Pain Points (8 keywords)
  'app not working', 'app crashing', 'need app fix', 'app maintenance',
  'update my app', 'redesign app', 'app performance issues',
  'app store rejection', 'play store rejection', 'app launch help'
];

const IGNORE_KEYWORDS = [
  // Original ignore
  'research', 'paper', 'study', 'analysis', 'review',
  'book', 'tutorial', 'guide', 'introduction',
  
  // Mobile app noise (9 keywords)
  'learn mobile development', 'flutter course', 'android tutorial',
  'ios course', 'learn swift', 'kotlin tutorial', 'react native course',
  'app development course', 'udemy', 'coursera', 'youtube tutorial',
  
  // AI/ML noise (7 keywords)
  'learn machine learning', 'ai course', 'ml tutorial', 'tensorflow tutorial',
  'deep learning course', 'ai certification', 'ml for beginners',
  
  // Job seeking (6 keywords)
  'looking for job', 'seeking position', 'applying for', 'resume review',
  'portfolio review', 'junior developer seeking', 'entry level',
  
  // Student projects (5 keywords)
  'college project', 'university project', 'final year project',
  'student project', 'assignment help', 'homework',
  
  // Free/Open source (4 keywords)
  'free app', 'open source app', 'contributor wanted',
  'volunteer needed', 'unpaid internship', 'non-profit only',
  
  // Informational (6 keywords)
  'what is', 'how to', 'when to', 'why is', 'explain',
  'difference between', 'vs', 'versus', 'comparison'
];

// Export for use in scrapers
module.exports = { RELEVANT_KEYWORDS, IGNORE_KEYWORDS };

// Log counts
console.log(`✅ RELEVANT_KEYWORDS: ${RELEVANT_KEYWORDS.length} keywords`);
console.log(`✅ IGNORE_KEYWORDS: ${IGNORE_KEYWORDS.length} keywords`);

export class HackerNewsScraper {
  private readonly baseUrl = 'https://hacker-news.firebaseio.com/v0';
  private readonly maxItems = 100;
  private playwrightScraper: PlaywrightSafeScraper;

  constructor() {
    this.playwrightScraper = new PlaywrightSafeScraper();
  }

  async scrape(): Promise<number> {
    logger.info('🐍 Starting Hacker News scraper...');
    let totalLeads = 0;

    try {
      const storiesResponse = await fetch(`${this.baseUrl}/newstories.json`);
      const storyIds = await storiesResponse.json() as number[];

      if (!storyIds || storyIds.length === 0) {
        logger.warn('⚠️ No stories found');
        return 0;
      }

      logger.info(`📊 Found ${storyIds.length} stories. Processing top ${this.maxItems}...`);

      const storiesToProcess = storyIds.slice(0, this.maxItems);
      
      for (const storyId of storiesToProcess) {
        try {
          const story = await this.fetchStoryDetails(storyId);
          
          if (story.type !== 'story' && story.type !== 'job') continue;
          if (!this.isRelevant(story)) continue;

          const sourceUrl = story.url || `https://news.ycombinator.com/item?id=${story.id}`;
          
          const existing = await InboundLead.findOne({ sourceUrl });
          if (existing) {
            logger.debug(`⏭️ Already exists: ${story.title?.substring(0, 30)}...`);
            continue;
          }

          const leadType = this.determineLeadType(story);
          const requirement = this.generateRequirement(story);
          const keywords = this.extractKeywords(story);

          // 🔥 Create InboundLead directly - no temporary Lead needed
          const inboundLead = await InboundLead.create({
            source: 'hacker_news',
            sourceUrl,
            title: story.title?.substring(0, 200) || 'Hacker News Post',
            content: this.generateContent(story),
            author: story.by || 'HN User',
            authorProfile: `https://news.ycombinator.com/user?id=${story.by}`,
            requirement,
            keywords,
            postedAt: new Date(story.time * 1000),
            status: 'new',
            metadata: {
              storyId: story.id,
              score: story.score,
              descendants: story.descendants,
              type: story.type,
              leadType,
              contactExtracted: false
            }
          });

          // 🔥 Extract contact info if website exists - directly, without Lead model
          if (story.url) {
            try {
              logger.info(`📧 Extracting contact info from ${story.url}...`);
              
              // Directly extract emails using Playwright
              const page = await this.playwrightScraper.createPage();
              await page.goto(story.url, { waitUntil: 'domcontentloaded', timeout: 10000 });
              
              // Extract emails from page content
              const pageContent = await page.content();
              const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
              const emails = pageContent.match(emailRegex) || [];
              
              // Extract phone numbers
              const phones = await extractPhoneNumbers(page);
              
              // Also check for mailto links
              const mailtoEmails = await page.$$eval('a[href^="mailto:"]', (links: HTMLAnchorElement[]) => {
                return links.map(link => link.getAttribute('href')?.replace('mailto:', '').split('?')[0] || '')
                  .filter(email => email.includes('@'));
              });
              
              const allEmails = [...new Set([...emails, ...mailtoEmails])];
              
              await page.close();

              // Update inbound lead with contact info
              await InboundLead.findByIdAndUpdate(inboundLead._id, {
                $set: {
                  'metadata.emails': allEmails || [],
                  'metadata.phones': phones || [],
                  'metadata.contactExtractedAt': new Date(),
                  'metadata.contactExtracted': true,
                  'metadata.hasRealEmail': allEmails.length > 0,
                  'metadata.hasPhone': phones.length > 0
                }
              });

              if (allEmails.length > 0) {
                logger.info(`✅ Found ${allEmails.length} emails for HN story ${storyId}`);
              }
              if (phones.length > 0) {
                logger.info(`📞 Found ${phones.length} phones for HN story ${storyId}`);
              }

            } catch (contactError) {
              logger.debug(`⚠️ Contact extraction failed for HN story ${storyId}:`, contactError);
            }
          }

          totalLeads++;
          logger.info(`✅ HN Lead [${leadType}]: ${story.title?.substring(0, 50)}...`);

          await new Promise(r => setTimeout(r, 100));

        } catch (storyError) {
          logger.debug(`⚠️ Error processing story ${storyId}:`, storyError);
          continue;
        }
      }

    } catch (error) {
      logger.error('❌ Hacker News scraper failed:', error);
    }

    await this.playwrightScraper.close();
    logger.success(`✅ Hacker News scraper complete: ${totalLeads} leads`);
    return totalLeads;
  }

  private async fetchStoryDetails(storyId: number): Promise<any> {
    const response = await fetch(`${this.baseUrl}/item/${storyId}.json`);
    return response.json();
  }

  private isRelevant(story: any): boolean {
    if (!story.title) return false;

    const title = story.title.toLowerCase();
    
    const hasRelevantKeyword = RELEVANT_KEYWORDS.some(keyword => 
      title.includes(keyword.toLowerCase())
    );

    const hasIgnoreKeyword = IGNORE_KEYWORDS.some(keyword => 
      title.includes(keyword.toLowerCase())
    );

    const isAskHN = title.startsWith('ask hn');

    return (hasRelevantKeyword || isAskHN) && !hasIgnoreKeyword;
  }

  private determineLeadType(story: any): string {
    const title = story.title.toLowerCase();

    if (title.includes('hiring') || title.includes('work with us')) {
      return 'hiring';
    } else if (title.includes('looking for') || title.includes('need developer')) {
      return 'seeking_help';
    } else if (title.includes('startup') || title.includes('launching')) {
      return 'startup';
    } else if (title.includes('ask hn') || title.includes('show hn')) {
      return 'discussion';
    } else {
      return 'opportunity';
    }
  }

  private generateRequirement(story: any): string {
    const title = story.title || '';
    
    if (title.toLowerCase().includes('hiring')) {
      return `Company is hiring. ${title}`;
    } else if (title.toLowerCase().includes('looking for')) {
      return `Looking for talent/partner. ${title}`;
    } else if (title.toLowerCase().startsWith('ask hn')) {
      return `Seeking advice/discussion: ${title}`;
    } else {
      return `Potential opportunity: ${title}`;
    }
  }

  private generateContent(story: any): string {
    const parts = [];
    
    if (story.title) parts.push(`Title: ${story.title}`);
    if (story.score) parts.push(`Score: ${story.score} points`);
    if (story.descendants) parts.push(`Comments: ${story.descendants}`);
    if (story.url) parts.push(`Link: ${story.url}`);
    
    return parts.join('\n');
  }

  private extractKeywords(story: any): string[] {
    const keywords = [];
    const title = story.title?.toLowerCase() || '';

    const keywordMap = {
      'hiring': ['hiring', 'job', 'position', 'work with us'],
      'developer': ['developer', 'engineer', 'programmer', 'coder'],
      'startup': ['startup', 'saas', 'venture', 'founder'],
      'freelance': ['freelance', 'contract', 'gig'],
      'ai': ['ai', 'artificial intelligence', 'machine learning'],
      'web': ['web', 'website', 'frontend', 'backend']
    };

    for (const [key, patterns] of Object.entries(keywordMap)) {
      if (patterns.some(p => title.includes(p))) {
        keywords.push(key);
      }
    }

    return keywords;
  }
}