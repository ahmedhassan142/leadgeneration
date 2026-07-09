// lib/scraper/safe-scraper/config.ts
export interface ScraperConfig {
  // Browser settings
  headless: boolean;
  slowMo: number;
  
  // Human behavior
  minDelay: number;      // 3 seconds
  maxDelay: number;      // 10 seconds
  mouseMovement: boolean;
  scrollVariation: boolean;
  
  // Session limits
  maxPagesPerSession: number;  // 50-80
  maxSessionsPerDay: number;    // 2-3
  delayBetweenPages: number;    // 3-10 sec
  
  // Fingerprint
  viewportSizes: Array<{width: number, height: number}>;
  userAgents: string[];
  
  // Retry settings
  maxRetries: number;
  retryDelay: number;
}

export const defaultConfig: ScraperConfig = {
  headless: false,
  slowMo: 100,
  minDelay: 3000,
  maxDelay: 10000,
  mouseMovement: true,
  scrollVariation: true,
  maxPagesPerSession: 60,
  maxSessionsPerDay: 2,
  delayBetweenPages: 5000,
  viewportSizes: [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 }
  ],
  userAgents: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ],
  maxRetries: 3,
  retryDelay: 2000
};