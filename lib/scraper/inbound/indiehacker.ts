// lib/scraper/inbound/indiehackersScraper.ts - FIXED SELECTORS
import { InboundLead } from '@/lib/db/models/inboundlead';
import { PlaywrightSafeScraper } from '../safe-scraper/palaywright-safe';
import { logger } from '@/lib/scraper/utils/logger';

const IH_GROUPS = [
  {
    name: 'For Hire',
    url: 'https://www.indiehackers.com/group/for-hire',
    type: 'forhire'
  },
  {
    name: 'Looking to Partner Up',
    url: 'https://www.indiehackers.com/group/looking-to-partner-up',
    type: 'partner'
  },
  {
    name: 'Developers',
    url: 'https://www.indiehackers.com/group/developers',
    type: 'developers'
  },
  {
    name: 'Jobs',
    url: 'https://www.indiehackers.com/group/jobs',
    type: 'jobs'
  }
];

// 🔥 Rotating user agents
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
];

export class IndieHackersScraper extends PlaywrightSafeScraper {
  async scrape(): Promise<number> {
    logger.info('🏴‍☠️ Starting IndieHackers scraper (FIXED SELECTORS)...');
    let totalLeads = 0;

    const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    
    await this.launch({ 
      headless: false, // Keep false for debugging
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox'
      ]
    });

    const context = await this.browser!.newContext({
      userAgent: randomUA,
      viewport: { width: 1920, height: 1080 }
    });

    logger.info('✅ Browser launched');

    for (const group of IH_GROUPS) {
      try {
        logger.info(`📡 Fetching group: ${group.name}`);
        
        const page = await context.newPage();

        // Add stealth scripts
        await page.addInitScript(() => {
          Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });

        await this.randomDelay(2000, 4000);

        // Navigate
        await page.goto(group.url, { 
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });

        // Wait for content
        await page.waitForTimeout(3000);

        // 🔥 FIXED SELECTORS - Based on actual IndieHackers structure
        const posts = await page.evaluate(() => {
          const results = [];
          
          // Try multiple selectors that actually exist on IndieHackers
          const postSelectors = [
            '.css-1jq1nuh',  // IndieHackers post container class
            '.css-1r4q6fh',  // Alternative class
            '.css-1v7s4f6',  // Discussion item
            '[class*="post"]',
            '[class*="discussion"]',
            'div[role="article"]',
            '.group-discussion',
            '.thread'
          ];

          for (const selector of postSelectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              console.log(`Found ${elements.length} elements with selector: ${selector}`);
              
              elements.forEach(el => {
                // 🔥 CORRECT SELECTORS for IndieHackers
                const titleEl = el.querySelector('a[class*="title"], a[class*="link"], h2 a, h3 a');
                const title = titleEl?.textContent?.trim() || '';
                let link = titleEl?.getAttribute('href') || '';
                
                if (link && !link.startsWith('http')) {
                  link = `https://indiehackers.com${link}`;
                }
                
                const authorEl = el.querySelector('[class*="author"], [class*="user"], [class*="creator"]');
                const author = authorEl?.textContent?.trim() || 'IndieHacker';
                
                const contentEl = el.querySelector('[class*="content"], [class*="description"], p');
                const content = contentEl?.textContent?.trim() || title;
                
                if (title && link) {
                  results.push({ title, url: link, author, content });
                }
              });
              if (results.length > 0) break;
            }
          }
          
          return results.slice(0, 20);
        });

        logger.info(`📊 Found ${posts.length} posts in ${group.name}`);

        // Debug: Log first post structure if found
        if (posts.length > 0) {
          logger.debug(`Sample post: ${JSON.stringify(posts[0], null, 2)}`);
        }

        for (const post of posts) {
          try {
            const existing = await InboundLead.findOne({ sourceUrl: post.url });
            if (existing) {
              logger.debug(`⏭️ Already exists: ${post.title.substring(0, 30)}...`);
              continue;
            }

            await InboundLead.create({
              source: 'indiehackers',
              sourceUrl: post.url,
              title: post.title.substring(0, 200),
              content: (post.content || post.title).substring(0, 500),
              author: post.author,
              authorProfile: `https://indiehackers.com/user/${post.author}`,
              requirement: post.title,
              keywords: this.extractKeywords(post.title + ' ' + post.content),
              postedAt: new Date(),
              status: 'new',
              metadata: {
                groupName: group.name,
                groupType: group.type
              }
            });

            totalLeads++;
            logger.info(`✅ Lead [${group.type}]: ${post.title.substring(0, 50)}...`);

            await this.randomDelay(500, 1000);

          } catch (postError) {
            logger.debug(`⚠️ Error saving post:`, postError);
            continue;
          }
        }

        await page.close();
        
        logger.info(`⏱️ Waiting 10-20 seconds...`);
        await this.randomDelay(10000, 20000);

      } catch (error) {
        logger.error(`❌ Failed to scrape ${group.name}:`, error);
        continue;
      }
    }

    await context.close();
    await this.close();
    logger.success(`✅ IndieHackers scraper complete: ${totalLeads} leads`);
    return totalLeads;
  }

  private extractKeywords(text: string): string[] {
    const keywords = [];
    const lower = text.toLowerCase();
    
    const keywordMap = {
      'developer': ['developer', 'dev', 'programmer', 'coder', 'engineer'],
      'designer': ['designer', 'ui', 'ux', 'graphic'],
      'ai': ['ai', 'artificial intelligence', 'machine learning', 'chatbot'],
      'webdev': ['website', 'web app', 'saas', 'frontend', 'backend'],
      'freelancer': ['freelancer', 'freelance', 'contract', 'gig'],
      'cofounder': ['co-founder', 'cofounder', 'partner up']
    };

    for (const [key, patterns] of Object.entries(keywordMap)) {
      if (patterns.some(p => lower.includes(p))) {
        keywords.push(key);
      }
    }
    return keywords;
  }

  private async randomDelay(min: number, max: number) {
    const delay = min + Math.random() * (max - min);
    await new Promise(r => setTimeout(r, delay));
  }
}