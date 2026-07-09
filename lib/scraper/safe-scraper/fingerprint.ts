// lib/scraper/safe-scraper/fingerprint.ts
import { BrowserContextOptions } from 'playwright';

export class FingerprintManager {
  private config: any;
  private currentFingerprint: any;

  constructor(config: any) {
    this.config = config;
  }

  getRandomUserAgent(): string {
    const agents = this.config.userAgents;
    return agents[Math.floor(Math.random() * agents.length)];
  }

  getRandomViewport(): { width: number; height: number } {
    const sizes = this.config.viewportSizes;
    return sizes[Math.floor(Math.random() * sizes.length)];
  }

  getRandomLocale(): string {
    const locales = ['en-US', 'en-GB', 'en-CA', 'en-AU'];
    return locales[Math.floor(Math.random() * locales.length)];
  }

  getRandomTimezone(): string {
    const timezones = [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'Europe/London'
    ];
    return timezones[Math.floor(Math.random() * timezones.length)];
  }

  generateNewFingerprint(): BrowserContextOptions {
    const viewport = this.getRandomViewport();
    
    return {
      userAgent: this.getRandomUserAgent(),
      viewport,
      locale: this.getRandomLocale(),
      timezoneId: this.getRandomTimezone(),
      deviceScaleFactor: 1,
      hasTouch: false,
      isMobile: false,
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      }
    };
  }

  rotateFingerprint(): BrowserContextOptions {
    this.currentFingerprint = this.generateNewFingerprint();
    return this.currentFingerprint;
  }
}