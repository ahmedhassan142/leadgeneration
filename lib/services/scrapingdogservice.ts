// lib/scraper/scrapingdogservice.ts - WORKING VERSION (Google Search API)
import { logger } from '@/lib/scraper/utils/logger';

interface ScrapingDogConfig {
  apiKey: string;
  dailyLimit: number;
}

// Updated interface to match the data we can get from Search API results
interface ScrapingDogResult {
  name: string;
  website?: string;
  // Phone and address are less common in web search results, so making them optional
  phone?: string;
  address?: string;
  rating?: number;
  reviews?: number;
  category?: string;
  source: 'scrapingdog_search'; // Changed source to be more specific
  // Adding fields common in organic results
  snippet?: string;
  displayedLink?: string;
}

class ScrapingDogService {
  private apiKey: string;
  private dailyLimit: number;
  private searchesToday: number = 0;
  //@ts-ignore
  private lastResetDate: string;

  // Map niche to effective search terms
  private searchTerms = {
    'real-estate': 'real estate agents',
    'restaurant': 'restaurants',
    'financial': 'financial advisors'
  };

  constructor(config: ScrapingDogConfig) {
    this.apiKey = config.apiKey;
    this.dailyLimit = config.dailyLimit;
    this.loadDailyCount();
    logger.info(`🐕 ScrapingDog Service initialized`, { dailyLimit: this.dailyLimit });
  }

  private loadDailyCount() {
    const today = new Date().toDateString();
    if (this.lastResetDate !== today) {
      this.searchesToday = 0;
      this.lastResetDate = today;
    }
  }

  canSearch(): boolean {
    this.loadDailyCount();
    return this.searchesToday < this.dailyLimit;
  }

  getRemainingSearches(): number {
    this.loadDailyCount();
    return Math.max(0, this.dailyLimit - this.searchesToday);
  }

  getStats() {
    this.loadDailyCount();
    return {
      searchesToday: this.searchesToday,
      dailyLimit: this.dailyLimit,
      remainingToday: this.getRemainingSearches(),
      percentageUsed: Math.round((this.searchesToday / this.dailyLimit) * 100),
      date: new Date().toDateString()
    };
  }

  /**
   * 🔥 FIXED: Uses the WORKING Google Search API endpoint
   * Renamed function for clarity, as it no longer calls the Maps API.
   */
  async searchGoogleWeb(
    niche: string,
    location: string
  ): Promise<ScrapingDogResult[]> {

    if (!this.canSearch()) {
      logger.warn(`⚠️ ScrapingDog daily limit exceeded`);
      return [];
    }

    const startTime = Date.now();

    // Construct a natural language search query
    const searchTerm = this.searchTerms[niche as keyof typeof this.searchTerms] || niche;
    const query = `${searchTerm} ${location}`;

    logger.info(`🔍 ScrapingDog Search API: Searching web for "${query}"`);

    try {
      // ✅ CORRECT URL for the working Google Search API
      const url = `https://api.scrapingdog.com/google?api_key=${this.apiKey}&query=${encodeURIComponent(query)}&country=us`;

      logger.debug(`📡 Fetching: ${url.replace(this.apiKey, 'HIDDEN')}`);

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; LeadGen/1.0)'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`❌ ScrapingDog Search API error`, {
          status: response.status,
          body: errorText.substring(0, 200)
        });
        return [];
      }

      const data = await response.json();
      return this.processSearchResponse(data, startTime);

    } catch (error: any) {
      logger.error('❌ ScrapingDog Search API failed:', error);
      return [];
    }
  }

  /**
   * Process the response from the Google Search API
   */
  private processSearchResponse(data: any, startTime: number): ScrapingDogResult[] {
    const leads: ScrapingDogResult[] = [];

    // --- Extract from organic_results (main web listings) ---
    if (data.organic_results && Array.isArray(data.organic_results)) {
      logger.info(`✅ Found ${data.organic_results.length} organic results`);
      for (const item of data.organic_results) {
        // Prioritize items that look like business homepages
        if (item.title && item.link && !item.link.includes('yelp.com') && !item.link.includes('yellowpages.com')) {
          leads.push({
            name: item.title,
            website: item.link,
            snippet: item.snippet,
            displayedLink: item.displayed_link,
            source: 'scrapingdog_search'
          });
        }
      }
    }

    // --- Extract from local_results (Google Maps listings within search) ---
    if (data.local_results && Array.isArray(data.local_results)) {
      logger.info(`✅ Found ${data.local_results.length} local results`);
      for (const item of data.local_results) {
        // Note: The search API local_results might not have websites directly.
        // You may need a second step or use the Maps API for full details.
        leads.push({
          name: item.title,
          rating: item.rating ? parseFloat(item.rating) : undefined,
          reviews: item.reviews ? parseInt(String(item.reviews).replace(/,/g, '')) : undefined,
          placeId: item.place_id,
          //@ts-ignore
          source: 'scrapingdog_search_local'
        });
      }
    }

    // Increment search count
    this.searchesToday++;

    const duration = Date.now() - startTime;
    logger.success(`✅ ScrapingDog Search complete: ${leads.length} leads in ${duration}ms`);
    logger.info(`📊 Searches today: ${this.searchesToday}/${this.dailyLimit}`);

    return leads;
  }
}

// Export an instance of the service
export const scrapingDog = new ScrapingDogService({
  apiKey: process.env.SCRAPINGDOG_API_KEY || 'YOUR_SCRAPINGDOG_API_KEY',
  dailyLimit: 30
});

export default scrapingDog;