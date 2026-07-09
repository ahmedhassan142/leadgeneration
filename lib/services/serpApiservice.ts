// lib/scraper/serpApiService.ts - FULLY UPDATED FOR MULTIPLE WAVES
import { logger } from '@/lib/scraper/utils/logger';
import { Lead, ILead } from '../db/models/Lead';

interface SerpApiConfig {
  apiKey: string;
  dailyLimit: number;
}

interface SerpBusinessResult {
  name: string;
  website?: string;
  phone?: string;
  address?: string;
  rating?: number;
  reviews?: number;
  latitude?: number;
  longitude?: number;
  placeId?: string;
  types?: string[];
  thumbnail?: string;
  hours?: string[];
  price?: string;
  service_options?: string[];
}

class SerpApiService {
  private apiKey: string;
  private dailyLimit: number;
  private searchesToday: number = 0;
  private lastResetDate: string;
  
  constructor(config: SerpApiConfig) {
    this.apiKey = config.apiKey;
    this.dailyLimit = config.dailyLimit;
    this.lastResetDate = new Date().toDateString();
    this.loadDailyCount();
  }
  
  /**
   * Daily search count load karo (local storage ya DB se)
   */
  private loadDailyCount() {
    const today = new Date().toDateString();
    if (this.lastResetDate !== today) {
      this.searchesToday = 0;
      this.lastResetDate = today;
    }
  }
  
  /**
   * Daily limit check karo
   */
  canSearch(): boolean {
    this.loadDailyCount();
    return this.searchesToday < this.dailyLimit;
  }
  
  /**
   * Remaining searches today
   */
  getRemainingSearches(): number {
    this.loadDailyCount();
    return Math.max(0, this.dailyLimit - this.searchesToday);
  }
  
  /**
   * Search count increment karo
   */
  private incrementSearchCount() {
    this.searchesToday++;
  }
  
  /**
   * Get stats
   */
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
   * 🔥 SERP API result ko Lead model mein convert karo
   */
  private mapToLeadModel(
    serpResult: SerpBusinessResult, 
    niche: string, 
    location: string,
    maxResults?: number
  ): Partial<ILead> {
    
    // Extract city and state from location
    const locationParts = location.split(',').map(part => part.trim());
    const city = locationParts[0] || '';
    const state = locationParts[1] || '';
    
    // Clean website URL
    let cleanWebsite = serpResult.website || '';
    if (cleanWebsite && !cleanWebsite.startsWith('http')) {
      cleanWebsite = 'https://' + cleanWebsite;
    }
    
    // Determine if website exists
    const websiteExists = !!serpResult.website && serpResult.website.length > 0;
    
    return {
      // Basic Info - Lead model ke saare required fields
      name: serpResult.name || 'Unknown Business',
      website: cleanWebsite || `no-website-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      phone: serpResult.phone || '',
      address: serpResult.address || '',
      city: city,
      state: state,
      niche: niche as 'real-estate' | 'restaurant' | 'financial',
      location: location,
      source: 'google_maps',
      
      // Contact Info
      emails: [],
      
      // 🌐 Website Status
      websiteExists: websiteExists,
      websiteCheckDate: websiteExists ? new Date() : undefined,
      websiteError: websiteExists ? undefined : 'No website found in SERP API',
      
      // Analysis Data - Will be filled by analyzer job
      analysis: {
        hasSEO: false,
        speedScore: 0,
        cms: '',
        mobileFriendly: false,
        //@ts-ignore
        uiModernScore: 0,
        isModernDesign: false
      },
      
      // AI Data - Will be filled by AI job
      ai: {
        designScore: 0,
        issues: [],
        analyzedAt: undefined,
      },
      
      // 📞 Call Tracking
      callNeeded: !websiteExists,
      callStatus: websiteExists ? 'not_needed' : 'pending',
      callPriority: websiteExists ? 'low' : 'high',
      callAttempts: 0,
      callLogs: [],
      
      // 🔥 Lead Scoring
      score: websiteExists ? 0 : 100,
      quality: websiteExists ? 'cold' : 'hot',
      leadScoreReason: websiteExists ? [] : ['No website found - direct call needed'],
      autoHotLead: !websiteExists,
      hotLeadReason: !websiteExists ? ['Business has no website'] : undefined,
      
      // Pipeline Status
      status: websiteExists ? 'raw' : 'scored',
      
      // Metadata with all SERP API additional data
      metadata: {
        rating: serpResult.rating,
        reviews: serpResult.reviews,
        placeId: serpResult.placeId,
        types: serpResult.types,
        thumbnail: serpResult.thumbnail,
        hours: serpResult.hours,
        price: serpResult.price,
        serviceOptions: serpResult.service_options,
        coordinates: serpResult.latitude && serpResult.longitude ? 
          `${serpResult.latitude},${serpResult.longitude}` : null,
        sourceDetails: 'serp_api',
        scrapedAt: new Date().toISOString(),
        maxResults: maxResults
      },
      
      // Estuary Export
      exportedToSheets: false,
      estuarySyncStatus: 'pending',
      
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  /**
   * 🔥 FIXED: Google Maps search with PROPER pagination
   * Now fetches up to maxResults and lets processor handle wave splitting
   */
  async searchGoogleMaps(
    niche: string, 
    location: string, 
    maxResults: number = 100
  ): Promise<Partial<ILead>[]> {
    
    if (!this.canSearch()) {
      logger.warn(`⚠️ Daily search limit (${this.dailyLimit}) exceeded`);
      return [];
    }
    
    const allResults: SerpBusinessResult[] = [];
    const resultsPerPage = 20;
    const maxPages = Math.ceil(maxResults / resultsPerPage);
    
    logger.info(`🔍 SERP API: Searching for ${niche} in ${location}`);
    logger.info(`📊 Requested: ${maxResults} total leads | Pages needed: ${maxPages} (${resultsPerPage} per page)`);
    
    for (let page = 0; page < maxPages; page++) {
      const start = page * resultsPerPage;
      
      // Stop if we already have enough results
      if (allResults.length >= maxResults) {
        logger.info(`✅ Reached max results limit (${maxResults}), stopping pagination`);
        break;
      }
      
      try {
        const url = new URL('https://serpapi.com/search.json');
        url.searchParams.append('engine', 'google_maps');
        url.searchParams.append('q', `${niche} ${location}`);
        url.searchParams.append('start', start.toString());
        url.searchParams.append('api_key', this.apiKey);
        
        logger.debug(`📡 Fetching page ${page + 1}: ${url.toString().replace(this.apiKey, 'HIDDEN')}`);
        
        const response = await fetch(url.toString());
        
        if (!response.ok) {
          logger.error(`❌ SERP API HTTP ${response.status} on page ${page + 1}`);
          break;
        }
        
        const data = await response.json();
        
        if (data.error) {
          logger.error('❌ SERP API error:', data.error);
          break;
        }
        
        const pageResults = data.local_results || [];
        
        if (pageResults.length === 0) {
          logger.info(`⏹️ No more results available on page ${page + 1}`);
          break;
        }
        
        // Transform to our business format
        const transformed = pageResults.map((item: any) => ({
          name: item.title || item.name,
          website: item.website,
          phone: item.phone,
          address: item.address,
          rating: item.rating,
          reviews: item.reviews,
          latitude: item.gps_coordinates?.latitude,
          longitude: item.gps_coordinates?.longitude,
          placeId: item.place_id,
          types: item.type,
          thumbnail: item.thumbnail,
          hours: item.hours,
          price: item.price
        }));
        
        allResults.push(...transformed);
        
        logger.info(`📄 Page ${page + 1}: ${transformed.length} results (total: ${allResults.length}/${maxResults})`);
        
        // Check if we got less than expected (last page)
        if (pageResults.length < resultsPerPage) {
          logger.info(`⏹️ Last page reached (got ${pageResults.length}/${resultsPerPage} results)`);
          break;
        }
        
        // Random delay between pages (avoid rate limiting)
        if (page < maxPages - 1) {
          const delay = 1000 + Math.random() * 2000;
          logger.debug(`⏳ Waiting ${Math.round(delay)}ms before next page...`);
          await new Promise(r => setTimeout(r, delay));
        }
        
      } catch (error) {
        logger.error(`❌ SERP API page ${page + 1} failed:`, error);
        break;
      }
    }
    
    this.incrementSearchCount();
    
    // 🔥 IMPORTANT: Return ALL results (up to maxResults)
    // DO NOT slice by waveSize here - let the processor handle wave splitting!
    const finalResults = allResults.slice(0, maxResults);
    
    // Map to Lead model format
    const leads = finalResults.map(result => 
      this.mapToLeadModel(result, niche, location, maxResults)
    );
    
    // Log summary
    const withWebsites = leads.filter(l => l.websiteExists).length;
    const withoutWebsites = leads.length - withWebsites;
    const wavesNeeded = Math.ceil(leads.length / 20); // Assuming waveSize = 20
    
    logger.success(`✅ SERP API complete:`);
    logger.info(`   ┌─────────────────────────────────────────┐`);
    logger.info(`   │ Requested:     ${maxResults} leads                    │`);
    logger.info(`   │ Found:         ${allResults.length} leads                    │`);
    logger.info(`   │ Processing:    ${leads.length} leads                    │`);
    logger.info(`   │ With websites: ${withWebsites} leads (will get emails)   │`);
    logger.info(`   │ Without sites: ${withoutWebsites} leads (need calls)     │`);
    logger.info(`   │ Waves needed:  ${wavesNeeded} waves of 20 leads each     │`);
    logger.info(`   │ Searches used: ${this.searchesToday}/${this.dailyLimit}                │`);
    logger.info(`   └─────────────────────────────────────────┘`);
    
    return leads;
  }
}

// Initialize with your API key
export const serpApi = new SerpApiService({
  apiKey: process.env.SERP_API_KEY || 'YOUR_SERP_API_KEY',
  dailyLimit: 10
});

export default serpApi;