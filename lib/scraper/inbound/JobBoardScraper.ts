// lib/scraper/inbound/jobBoardScraper.ts - FIXED VERSION WITH CONTACT EXTRACTION
import { InboundLead } from '@/lib/db/models/inboundlead';
import { Lead } from '@/lib/db/models/Lead';
import { PlaywrightSafeScraper } from '../safe-scraper/palaywright-safe';
import { logger } from '@/lib/scraper/utils/logger';
import { extractEmails } from '@/lib/analyzer/emailExtractor';
import { extractPhoneNumbers } from '@/lib/analyzer/phoneextractor';
import Parser from 'rss-parser';

const parser = new Parser();

// ✅ ONLY WORKING RSS FEEDS (tested)
const JOB_FEEDS = [
  {
    name: 'RemoteOK',
    url: 'https://remoteok.com/remote-dev-jobs.rss',
    category: 'remote',
    enabled: true
  },
  {
    name: 'We Work Remotely',
    url: 'https://weworkremotely.com/categories/remote-programming-jobs.rss',
    category: 'remote',
    enabled: true
  }
];

// ✅ WORKING API/FALLBACK SOURCES
const API_SOURCES = [
  {
    name: 'Stack Overflow Jobs',
    type: 'rss',
    url: 'https://stackoverflow.com/jobs/feed',
    category: 'developer'
  }
];

export class JobBoardScraper extends PlaywrightSafeScraper {
  async scrape(): Promise<number> {
    logger.info('💼 Starting Job Board scraper with only working feeds...');
    let totalLeads = 0;

    // Step 1: Working RSS feeds
    for (const feed of JOB_FEEDS) {
      try {
        logger.info(`📡 Fetching from ${feed.name}: ${feed.url}`);
        
        const rssFeed = await parser.parseURL(feed.url);
        
        if (!rssFeed.items || rssFeed.items.length === 0) {
          logger.debug(`⏭️ No items from ${feed.name}`);
          continue;
        }

        logger.info(`📊 ${feed.name}: Found ${rssFeed.items.length} jobs`);

        for (const item of rssFeed.items.slice(0, 30)) {
          try {
            const title = item.title || '';
            const link = item.link || '';
            const content = item.content || item.contentSnippet || item.summary || title;
            const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
            const author = item.author || item.creator || feed.name;

            if (!title || !link) continue;
            if (!this.isRelevant(title + ' ' + content)) continue;

            const existing = await InboundLead.findOne({ sourceUrl: link });
            if (existing) {
              logger.debug(`⏭️ Already exists: ${title.substring(0, 30)}...`);
              continue;
            }

            // 🔥 Extract company name from job title
            const companyName = this.extractCompanyName(item);

            const requirement = this.extractRequirement(title + ' ' + content);
            const keywords = this.extractKeywords(title + ' ' + content);

            // Create lead
            const inboundLead = await InboundLead.create({
              source: 'job_board',
              sourceUrl: link,
              sourceId: item.guid || link,
              title: title.substring(0, 200),
              content: content.substring(0, 500),
              author: author,
              authorProfile: link,
              requirement: requirement,
              keywords: keywords,
              postedAt: pubDate,
              status: 'new',
              metadata: {
                board: feed.name,
                category: feed.category,
                companyName,
                contactExtracted: false
              }
            });

            // 🔥 Extract contact info from company website
            if (companyName) {
              await this.extractCompanyContact(inboundLead._id.toString(), companyName);
            }

            totalLeads++;
            logger.info(`✅ Job lead [${feed.name}]: ${title.substring(0, 50)}...`);

          } catch (itemError) {
            logger.debug(`⚠️ Error processing item:`, itemError);
            continue;
          }
        }

        await new Promise(r => setTimeout(r, 3000));

      } catch (error) {
        logger.warn(`⚠️ Failed to fetch from ${feed.name}:`, error);
        continue;
      }
    }

    // Step 2: Stack Overflow Jobs
    try {
      logger.info('📡 Fetching Stack Overflow Jobs...');
      const soResponse = await fetch('https://stackoverflow.com/jobs/feed');
      
      if (soResponse.ok) {
        const xml = await soResponse.text();
        const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
        
        for (const item of items.slice(0, 20)) {
          const title = item.match(/<title>(.*?)<\/title>/)?.[1] || '';
          const link = item.match(/<link>(.*?)<\/link>/)?.[1] || '';
          const description = item.match(/<description>(.*?)<\/description>/)?.[1] || '';
          const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';

          if (!this.isRelevant(title + ' ' + description)) continue;

          const existing = await InboundLead.findOne({ sourceUrl: link });
          if (existing) continue;

          // Extract company name from Stack Overflow job
          const companyMatch = item.match(/<a class="company-name"[^>]*>([^<]+)<\/a>/);
          const companyName = companyMatch ? companyMatch[1].trim() : null;

          const inboundLead = await InboundLead.create({
            source: 'job_board',
            sourceUrl: link,
            title: title.substring(0, 200),
            content: description.substring(0, 500),
            author: 'Stack Overflow Jobs',
            authorProfile: link,
            requirement: this.extractRequirement(title + ' ' + description),
            keywords: this.extractKeywords(title + ' ' + description),
            postedAt: new Date(pubDate),
            status: 'new',
            metadata: {
              board: 'Stack Overflow',
              category: 'developer',
              companyName,
              contactExtracted: false
            }
          });

          // 🔥 Extract contact info from company website
          if (companyName) {
            await this.extractCompanyContact(inboundLead._id.toString(), companyName);
          }

          totalLeads++;
          logger.info(`✅ Job lead [Stack Overflow]: ${title.substring(0, 50)}...`);
        }
      }
    } catch (error) {
      logger.warn('⚠️ Stack Overflow Jobs failed:', error);
    }

    logger.success(`✅ Job Board scraper complete: ${totalLeads} leads`);
    return totalLeads;
  }

  // 🔥 NEW: Extract company name from job item
  private extractCompanyName(item: any): string | null {
    // Try different fields where company name might be
    if (item.author && item.author !== item.creator) {
      return item.author;
    }
    
    // Try to extract from content
    if (item.content) {
      const match = item.content.match(/at\s+([A-Z][a-zA-Z0-9\s&.-]+?)(?:\s+(?:is|are|has|was)|\s*$)/i);
      if (match) return match[1].trim();
    }
    
    return null;
  }

  // 🔥 NEW: Extract contact info from company website
  private async extractCompanyContact(leadId: string, companyName: string): Promise<void> {
    try {
      logger.info(`🔍 Searching for ${companyName} website...`);
      
      // Google search for company website
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(companyName + ' official website')}`;
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const searchHtml = await searchResponse.text();
      const websiteMatch = searchHtml.match(/<a href="\/url\?q=([^"]+)"[^>]*>/);
      
      if (websiteMatch) {
        const companyWebsite = decodeURIComponent(websiteMatch[1].split('&')[0]);
        
        if (companyWebsite.startsWith('http')) {
          logger.info(`📧 Extracting contact from ${companyWebsite}...`);
          
          // Create temporary Lead for email extractor
          const tempLead = await Lead.create({
            name: companyName,
            website: companyWebsite,
            source: 'job_board',
            quality: 'warm',
            niche: 'webdev',
            location: 'Remote'
          });
          
          // Extract emails using your existing extractor
          const emailResult = await extractEmails(tempLead._id.toString(), companyWebsite);
          
          // Extract phone numbers
          const page = await this.createPage();
          await page.goto(companyWebsite, { waitUntil: 'domcontentloaded', timeout: 10000 });
          const phones = await extractPhoneNumbers(page);
          await page.close();
          
          // Update lead with contact info
          await InboundLead.findByIdAndUpdate(leadId, {
            $set: {
              'metadata.companyWebsite': companyWebsite,
              'metadata.emails': emailResult.emailsFound || [],
              'metadata.phones': phones || [],
              'metadata.contactExtracted': true,
              'metadata.hasRealEmail': emailResult.count > 0 && !emailResult.generatedEmails,
              'metadata.hasPhone': phones.length > 0,
              'metadata.contactExtractedAt': new Date()
            }
          });
          
          if (emailResult.emailsFound?.length > 0) {
            logger.info(`✅ Found ${emailResult.emailsFound.length} emails for ${companyName}`);
          }
          if (phones.length > 0) {
            logger.info(`📞 Found ${phones.length} phones for ${companyName}`);
          }
          
          // Delete temp lead
          await Lead.findByIdAndDelete(tempLead._id);
        }
      }
    } catch (error) {
      logger.debug(`⚠️ Contact extraction failed for ${companyName}:`, error);
    }
  }

  private isRelevant(text: string): boolean {
    const lower = text.toLowerCase();
    
    const keywords = [
      'developer', 'engineer', 'programmer', 'coder',
      'frontend', 'backend', 'full stack', 'fullstack',
      'react', 'node', 'javascript', 'typescript',
      'python', 'java', 'php', 'ruby', 'go', 'rust',
      'shopify', 'wordpress', 'web', 'website',
      'designer', 'ui', 'ux', 'graphic',
      'seo', 'marketing', 'content',
      'ai', 'machine learning', 'ml', 'data'
    ];
    
    return keywords.some(k => lower.includes(k));
  }

  private extractRequirement(text: string): string {
    const sentences = text.split(/[.!?]+/);
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      if (lower.includes('need') || 
          lower.includes('looking for') ||
          lower.includes('hire') ||
          lower.includes('required') ||
          lower.includes('must have')) {
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
      'designer': ['designer', 'ui', 'ux', 'graphic', 'visual'],
      'frontend': ['frontend', 'front-end', 'react', 'vue', 'angular'],
      'backend': ['backend', 'back-end', 'node', 'python', 'java', 'php'],
      'fullstack': ['full stack', 'fullstack', 'full-stack'],
      'shopify': ['shopify', 'ecommerce', 'woocommerce'],
      'website': ['website', 'web', 'site', 'landing page'],
      'mobile': ['mobile', 'ios', 'android', 'react native'],
      'seo': ['seo', 'search engine', 'ranking'],
      'marketing': ['marketing', 'content', 'social media'],
      'ai': ['ai', 'machine learning', 'ml', 'data science']
    };

    for (const [key, patterns] of Object.entries(keywordMap)) {
      if (patterns.some(p => lower.includes(p))) {
        keywords.push(key);
      }
    }

    return keywords;
  }
}