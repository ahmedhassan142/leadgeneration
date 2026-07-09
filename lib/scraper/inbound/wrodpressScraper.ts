// lib/scraper/inbound/wordpressPluginScraper.ts - WITH CONTACT EXTRACTION
import { InboundLead } from '@/lib/db/models/inboundlead';
import { Lead } from '@/lib/db/models/Lead'; // For email extraction
import { logger } from '@/lib/scraper/utils/logger';
import { extractEmails } from '@/lib/analyzer/emailExtractor';
import { PlaywrightSafeScraper } from '@/lib/scraper/safe-scraper/palaywright-safe';
import { extractPhoneNumbers } from '@/lib/analyzer/phoneextractor';

// WordPress Plugin Tags according to services
const PLUGIN_CATEGORIES = [
  // ORIGINAL CATEGORIES (keep these)
  {
    service: 'webdev',
    tags: ['ecommerce', 'woocommerce', 'payment-gateway', 'shipping', 'page-builder', 'contact-form', 'backup', 'migration'],
    description: 'Website owners needing development'
  },
  {
    service: 'ai',
    tags: ['ai', 'chatbot', 'machine-learning', 'openai', 'gpt', 'automation'],
    description: 'Businesses exploring AI integration'
  },
  {
    service: 'realestate',
    tags: ['real-estate', 'property', 'listings', 'idx', 'mortgage', 'realty'],
    description: 'Real estate agents & agencies'
  },
  {
    service: 'analytics',
    tags: ['analytics', 'google-analytics', 'tracking', 'statistics', 'report', 'data'],
    description: 'Data-driven businesses'
  },
  {
    service: 'marketing',
    tags: ['seo', 'marketing', 'social-media', 'email', 'newsletter', 'popup'],
    description: 'Digital marketing agencies & businesses'
  },
  
  // NEW: MOBILE APP DEVELOPMENT CATEGORIES
  
  {
    service: 'mobile-general',
    tags: ['mobile-app', 'app-development', 'mobile-app-builder', 'app-builder', 'hybrid-app', 'cross-platform-app'],
    description: 'Businesses needing mobile apps'
  },
  {
    service: 'mobile-ios',
    tags: ['ios-app', 'iphone-app', 'ipad-app', 'apple-app', 'swift', 'ios-development'],
    description: 'iOS app development needs'
  },
  {
    service: 'mobile-android',
    tags: ['android-app', 'google-play', 'kotlin', 'android-development', 'play-store'],
    description: 'Android app development needs'
  },
  {
    service: 'mobile-crossplatform',
    tags: ['flutter', 'react-native', 'ionic', 'xamarin', 'cross-platform-mobile', 'hybrid-mobile'],
    description: 'Cross-platform app development'
  },
  {
    service: 'mobile-ecommerce',
    tags: ['mobile-commerce', 'm-commerce', 'shopping-app', 'ecommerce-app', 'store-app', 'mobile-store'],
    description: 'E-commerce businesses needing mobile apps'
  },
  {
    service: 'mobile-business',
    tags: ['business-app', 'corporate-app', 'company-app', 'enterprise-mobile', 'b2b-app'],
    description: 'Corporate mobile app needs'
  },
  
  // NEW: MOBILE + AI CATEGORIES
  
  {
    service: 'mobile-ai-general',
    tags: ['ai-mobile-app', 'mobile-ai', 'smart-app', 'intelligent-app', 'ai-powered-app'],
    description: 'Businesses wanting AI in mobile apps'
  },
  {
    service: 'mobile-chatbot',
    tags: ['chatbot-app', 'ai-chatbot-mobile', 'mobile-chat-assistant', 'conversational-ai-app'],
    description: 'Chatbot integration for mobile apps'
  },
  {
    service: 'mobile-ml',
    tags: ['ml-mobile', 'machine-learning-app', 'tensorflow-lite', 'core-ml', 'ml-kit'],
    description: 'Machine learning in mobile apps'
  },
  {
    service: 'mobile-vision',
    tags: ['computer-vision-app', 'image-recognition-mobile', 'object-detection-app', 'face-recognition-app', 'ar-app'],
    description: 'Computer vision & AR mobile apps'
  },
  {
    service: 'mobile-voice',
    tags: ['voice-assistant-app', 'voice-recognition-app', 'speech-to-text-app', 'voice-command-app'],
    description: 'Voice-enabled mobile apps'
  },
  {
    service: 'mobile-nlp',
    tags: ['nlp-app', 'language-processing-app', 'text-analysis-app', 'sentiment-analysis-app', 'translation-app'],
    description: 'Natural language processing apps'
  },
  
  // NEW: MOBILE + SPECIFIC INDUSTRIES
  
  {
    service: 'mobile-healthcare',
    tags: ['health-app', 'fitness-app', 'medical-app', 'telemedicine-app', 'wellness-app', 'healthcare-mobile'],
    description: 'Healthcare & fitness mobile apps'
  },
  {
    service: 'mobile-finance',
    tags: ['finance-app', 'banking-app', 'investment-app', 'trading-app', 'crypto-app', 'fintech-mobile'],
    description: 'Finance & banking mobile apps'
  },
  {
    service: 'mobile-education',
    tags: ['education-app', 'e-learning-app', 'course-app', 'tutoring-app', 'language-learning-app'],
    description: 'Education & e-learning mobile apps'
  },
  {
    service: 'mobile-food',
    tags: ['food-delivery-app', 'restaurant-app', 'recipe-app', 'meal-planning-app', 'food-ordering-app'],
    description: 'Food & restaurant mobile apps'
  },
  {
    service: 'mobile-travel',
    tags: ['travel-app', 'booking-app', 'hotel-app', 'flight-app', 'tourism-app'],
    description: 'Travel & hospitality mobile apps'
  },
  {
    service: 'mobile-social',
    tags: ['social-media-app', 'networking-app', 'community-app', 'messaging-app', 'chat-app'],
    description: 'Social networking mobile apps'
  }
];

export class WordPressPluginScraper {
  private playwrightScraper: PlaywrightSafeScraper;

  constructor() {
    this.playwrightScraper = new PlaywrightSafeScraper();
  }

  async scrape(): Promise<number> {
    logger.info('🔌 Starting WordPress Plugin Scraper for Lead Generation...');
    let totalLeads = 0;

    for (const category of PLUGIN_CATEGORIES) {
      logger.info(`\n📌 Processing ${category.service.toUpperCase()} plugins (${category.description})`);

      for (const tag of category.tags) {
        try {
          logger.info(`🔍 Fetching plugins with tag: "${tag}"`);
          
          const url = `https://api.wordpress.org/plugins/info/1.2/?action=query_plugins&request[tag]=${encodeURIComponent(tag)}&request[per_page]=50`;
          
          const response = await fetch(url);
          const data = await response.json();

          if (!data.plugins || data.plugins.length === 0) {
            logger.debug(`⏭️ No plugins found for tag: ${tag}`);
            continue;
          }

          logger.info(`📊 Found ${data.plugins.length} plugins for tag: ${tag}`);

          for (const plugin of data.plugins) {
            try {
              // Basic plugin info
              const name = plugin.name || '';
              const slug = plugin.slug || '';
              const description = plugin.short_description || plugin.description || '';
              const author = plugin.author ? plugin.author.replace(/<[^>]*>/g, '') : 'Unknown';
              const authorProfile = plugin.author_profile || '';
              const homepage = plugin.homepage || `https://wordpress.org/plugins/${slug}/`;
              const activeInstalls = plugin.active_installs || 0;
              const rating = plugin.rating || 0;
              const numRatings = plugin.num_ratings || 0;
              
              // Date fix
              let lastUpdated = new Date();
              if (plugin.last_updated) {
                const parsedDate = new Date(plugin.last_updated);
                if (!isNaN(parsedDate.getTime())) {
                  lastUpdated = parsedDate;
                }
              }

              if (activeInstalls < 1000) {
                logger.debug(`⏭️ Skipping ${name} - only ${activeInstalls} installs`);
                continue;
              }

              const fullText = name + ' ' + description;
              
              if (!this.isBusinessRelevant(fullText, category.service)) {
                logger.debug(`⏭️ Not business relevant: ${name}`);
                continue;
              }

              const sourceUrl = homepage;

              // Check for duplicates in inbound leads
              const existingInbound = await InboundLead.findOne({ sourceUrl });
              if (existingInbound) {
                logger.debug(`⏭️ Already exists in Inbound: ${name.substring(0, 30)}...`);
                continue;
              }

              // 🔥 STEP 1: Save to InboundLead first
              const requirement = this.generateRequirement(fullText, category.service);
              const keywords = [
                category.service,
                tag,
                ...this.extractKeywords(fullText)
              ];
              const quality = this.determineLeadQuality(activeInstalls, rating);

              const inboundLead = await InboundLead.create({
                source: 'wordpress_plugin',
                sourceUrl,
                title: `WordPress User - ${name} Plugin`,
                content: `This website uses the "${name}" WordPress plugin. ${description.substring(0, 200)}`,
                author: author,
                authorProfile: authorProfile,
                requirement,
                keywords: [...new Set(keywords)],
                postedAt: lastUpdated,
                status: 'new',
                metadata: {
                  pluginName: name,
                  pluginSlug: slug,
                  tag,
                  service: category.service,
                  activeInstalls,
                  rating,
                  numRatings,
                  lastUpdated,
                  quality
                }
              });

              // 🔥 STEP 2: Create a temporary Lead record for email extraction
              // Note: This assumes you have a Lead model for main leads pipeline
              // If not, we can directly use InboundLead for contact info
              
              // 🔥 STEP 3: Extract emails and phone numbers from the website
              try {
                logger.info(`📧 Extracting contact info from ${homepage}...`);
                
                // Create a temporary Lead record if needed for emailExtractor
                // This depends on your existing emailExtractor expecting a Lead model
                // Option 1: Create a temporary Lead record
                const tempLead = await Lead.create({
                  name: author,
                  website: homepage,
                  source: 'wordpress_plugin',
                  quality: quality,
                  // Add other required fields as per your Lead model
                });

                // Extract emails using your existing extractor
                const emailResult = await extractEmails(tempLead._id.toString(), homepage);
                
                // 🔥 Extract phone numbers separately
                const page = await this.playwrightScraper.createPage();
                await page.goto(homepage, { waitUntil: 'domcontentloaded', timeout: 10000 });
                const phones = await extractPhoneNumbers(page);
                await page.close();

                // Update the inbound lead with contact info
                await InboundLead.findByIdAndUpdate(inboundLead._id, {
                  $set: {
                    'metadata.emails': emailResult.emailsFound || [],
                    'metadata.phones': phones || [],
                    'metadata.contactExtractedAt': new Date(),
                    'metadata.hasRealEmail': emailResult.count > 0 && !emailResult.generatedEmails,
                    'metadata.hasPhone': phones.length > 0
                  }
                });

                if (emailResult.count > 0) {
                  logger.info(`✅ Found ${emailResult.count} emails for ${name}`);
                }
                if (phones.length > 0) {
                  logger.info(`📞 Found ${phones.length} phone numbers for ${name}`);
                }

              } catch (contactError) {
                logger.debug(`⚠️ Contact extraction failed for ${name}:`, contactError);
              }

              totalLeads++;
              
              if (quality === 'hot') {
                logger.info(`🔥 HOT LEAD: ${name} (${activeInstalls.toLocaleString()} installs)`);
                if (inboundLead.metadata?.hasRealEmail) {
                  logger.info(`   📧 Email: ${inboundLead.metadata.emails?.[0]}`);
                }
                if (inboundLead.metadata?.hasPhone) {
                  logger.info(`   📞 Phone: ${inboundLead.metadata.phones?.[0]}`);
                }
              } else {
                logger.info(`✅ Lead: ${name.substring(0, 50)}...`);
              }

            } catch (pluginError) {
              logger.debug(`⚠️ Error processing plugin:`, pluginError);
              continue;
            }
          }

          await new Promise(r => setTimeout(r, 500));

        } catch (error) {
          logger.error(`❌ Failed to fetch plugins for tag ${tag}:`, error);
        }
      }
    }

    await this.playwrightScraper.close();
    logger.success(`✅ WordPress Plugin Scraper complete: ${totalLeads} leads`);
    return totalLeads;
  }

  // ... (rest of the helper methods remain the same)
  private isBusinessRelevant(text: string, service: string): boolean {
    const lower = text.toLowerCase();
    
    const businessIndicators = [
      'business', 'store', 'shop', 'company', 'enterprise',
      'professional', 'commercial', 'corporate', 'agency'
    ];

    const serviceIndicators: Record<string, string[]> = {
      webdev: ['website', 'ecommerce', 'payment', 'booking', 'catalog'],
      ai: ['ai', 'automation', 'chat', 'bot', 'intelligence'],
      realestate: ['property', 'listing', 'agent', 'mortgage', 'realtor'],
      analytics: ['analytics', 'tracking', 'report', 'insight', 'data'],
      marketing: ['seo', 'marketing', 'campaign', 'email', 'social']
    };

    const hasBusinessIndicator = businessIndicators.some(i => lower.includes(i));
    const hasServiceIndicator = serviceIndicators[service]?.some(i => lower.includes(i)) || true;

    return hasBusinessIndicator || hasServiceIndicator;
  }

  private generateRequirement(text: string, service: string): string {
    const templates: Record<string, string[]> = {
      webdev: [
        'Looking for web development services',
        'Needs website/e-commerce development',
        'Requires payment/shopping cart integration',
        'Seeking professional web developer'
      ],
      ai: [
        'Interested in AI/automation solutions',
        'Looking to integrate AI into business',
        'Needs chatbot/automation services',
        'Exploring machine learning applications'
      ],
      realestate: [
        'Real estate business needs digital presence',
        'Looking for property listing website',
        'Requires real estate portal development',
        'Needs IDX/MLS integration'
      ],
      analytics: [
        'Needs business analytics solution',
        'Looking for data tracking/reporting',
        'Requires custom analytics dashboard',
        'Interested in business intelligence'
      ],
      marketing: [
        'Looking for SEO/marketing services',
        'Needs digital marketing automation',
        'Requires email/social media integration',
        'Seeking marketing campaign tools'
      ]
    };

    const serviceTemplates = templates[service] || ['Potential business opportunity'];
    return serviceTemplates[Math.floor(Math.random() * serviceTemplates.length)];
  }

  private determineLeadQuality(installs: number, rating: number): 'hot' | 'warm' | 'cold' {
    if (installs >= 100000 && rating >= 80) return 'hot';
    if (installs >= 10000 && rating >= 60) return 'warm';
    return 'cold';
  }

  private extractKeywords(text: string): string[] {
    const keywords = [];
    const lower = text.toLowerCase();
    
    const keywordMap = {
      'webdev': ['website', 'ecommerce', 'store', 'payment', 'booking'],
      'ai': ['ai', 'automation', 'chatbot', 'intelligence', 'machine learning'],
      'realestate': ['property', 'real estate', 'listing', 'agent', 'mortgage'],
      'analytics': ['analytics', 'tracking', 'data', 'report', 'insight'],
      'marketing': ['seo', 'marketing', 'social', 'email', 'campaign']
    };

    for (const [service, patterns] of Object.entries(keywordMap)) {
      if (patterns.some(p => lower.includes(p))) {
        keywords.push(service);
      }
    }

    return keywords;
  }
}