// lib/scraper/safe-scraper/session-manager.ts
import { Browser, BrowserContext, chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

export class SessionManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private config: any;
  private fingerprintManager: any;
  private sessionsToday: number = 0;
  private pagesProcessed: number = 0;

  constructor(config: any, fingerprintManager: any) {
    this.config = config;
    this.fingerprintManager = fingerprintManager;
    this.loadSessionCount();
  }

  private loadSessionCount(): void {
    const today = new Date().toDateString();
    const sessionFile = path.join('/tmp', `scraper-session-${today}.json`);
    
    try {
      if (fs.existsSync(sessionFile)) {
        const data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
        this.sessionsToday = data.sessions || 0;
        this.pagesProcessed = data.pages || 0;
      }
    } catch (error) {
      // Ignore, start fresh
    }
  }

  private saveSessionCount(): void {
    const today = new Date().toDateString();
    const sessionFile = path.join('/tmp', `scraper-session-${today}.json`);
    
    fs.writeFileSync(sessionFile, JSON.stringify({
      sessions: this.sessionsToday,
      pages: this.pagesProcessed,
      date: today
    }));
  }

  canStartNewSession(): boolean {
    return this.sessionsToday < this.config.maxSessionsPerDay;
  }

  canProcessMorePages(): boolean {
    return this.pagesProcessed < this.config.maxPagesPerSession;
  }

  async initSession(): Promise<BrowserContext> {
    if (!this.canStartNewSession()) {
      throw new Error('Daily session limit reached');
    }

    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: this.config.headless,
        slowMo: this.config.slowMo,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage'
        ]
      });
    }

    const fingerprint = this.fingerprintManager.rotateFingerprint();
    
    this.context = await this.browser.newContext(fingerprint);
    
    // Load cookies if exists
    const cookieFile = path.join('/tmp', 'scraper-cookies.json');
    if (fs.existsSync(cookieFile)) {
      const cookies = JSON.parse(fs.readFileSync(cookieFile, 'utf8'));
      await this.context.addCookies(cookies);
    }

    this.sessionsToday++;
    this.pagesProcessed = 0;
    this.saveSessionCount();

    return this.context;
  }

  async closeSession(): Promise<void> {
    if (this.context) {
      // Save cookies for next session
      const cookies = await this.context.cookies();
      const cookieFile = path.join('/tmp', 'scraper-cookies.json');
      fs.writeFileSync(cookieFile, JSON.stringify(cookies, null, 2));
      
      await this.context.close();
      this.context = null;
    }
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  incrementPageCount(): void {
    this.pagesProcessed++;
    this.saveSessionCount();
  }

  getStats() {
    return {
      sessionsToday: this.sessionsToday,
      pagesProcessed: this.pagesProcessed,
      maxSessions: this.config.maxSessionsPerDay,
      maxPages: this.config.maxPagesPerSession
    };
  }
}