// lib/scraper/safe-scraper/playwright-safescraper.ts - WITH WAVE SIZE PAGINATION
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { USER_AGENTS } from '../utils/userAgent';
import { logger } from '../utils/logger';

export class PlaywrightSafeScraper {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  public page: Page | null = null;
  private proxyList: string[] = [];
  private currentProxyIndex = 0;
  
  // 👈 TRACK PAGINATION PROGRESS
  private pagesChecked: string[] = [];
  private currentWaveSize: number = 20;
  private itemsFound: number = 0;

  constructor() {
    this.proxyList = [];
  }

  /**
   * Set wave size for pagination control
   */
  setWaveSize(size: number) {
    this.currentWaveSize = size;
    logger.info(`📊 Wave size set to: ${size}`);
  }

  /**
   * Check if we've reached wave size limit
   */
  private hasReachedWaveLimit(): boolean {
    return this.itemsFound >= this.currentWaveSize;
  }

  /**
   * Increment items found counter
   */
  private incrementItemsFound(count: number = 1) {
    this.itemsFound += count;
    logger.debug(`📈 Items found: ${this.itemsFound}/${this.currentWaveSize}`);
  }

  /**
   * Reset counters for new wave
   */
  resetWaveCounters() {
    this.pagesChecked = [];
    this.itemsFound = 0;
    logger.debug(`🔄 Wave counters reset`);
  }

  /**
   * Get pagination progress
   */
  getPaginationProgress() {
    return {
      itemsFound: this.itemsFound,
      waveSize: this.currentWaveSize,
      progressPercent: Math.round((this.itemsFound / this.currentWaveSize) * 100) || 0,
      pagesChecked: this.pagesChecked.length
    };
  }

  /**
   * Launch browser with anti-detection measures
   */
  async launch(options: { headless?: boolean, useProxy?: boolean } = {}) {
    logger.info('🚀 Launching Playwright browser with anti-detection...');

    const launchOptions: any = {
      headless: options.headless ?? false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-notifications',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=InterestCohort',
        '--disable-features=UserAgentClientHint',
        '--disable-session-crashed-bubble',
        '--disable-ipc-flooding-protection',
        '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
        '--window-size=1920,1080',
        '--start-maximized',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-component-update',
        '--disable-client-side-phishing-detection',
        '--disable-default-apps',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-sync',
        '--disable-web-resource',
        '--safebrowsing-disable-auto-update',
        '--disable-component-extensions-with-background-pages',
        '--disable-logging',
        '--log-level=3',
        '--silent'
      ],
    };

    if (options.useProxy && this.proxyList.length > 0) {
      const proxy = this.proxyList[this.currentProxyIndex];
      launchOptions.proxy = { server: proxy };
    }

    try {
      this.browser = await chromium.launch(launchOptions);
      logger.info('✅ Playwright browser launched successfully');
      return this.browser;
    } catch (error) {
      logger.error('❌ Failed to launch Playwright browser:', error);
      throw error;
    }
  }

  /**
   * Create a new context with anti-detection fingerprints
   */
  async createContext(options: { 
    viewport?: { width: number, height: number },
    userAgent?: string,
    locale?: string,
    timezone?: string
  } = {}) {
    if (!this.browser) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    const viewport = options.viewport || {
      width: 1920 + Math.floor(Math.random() * 100),
      height: 1080 + Math.floor(Math.random() * 100)
    };

    const userAgent = options.userAgent || 
      USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

    const locales = ['en-US', 'en-GB', 'en-CA', 'en-AU'];
    const locale = options.locale || locales[Math.floor(Math.random() * locales.length)];

    const timezones = [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'Europe/London'
    ];
    const timezoneId = options.timezone || 
      timezones[Math.floor(Math.random() * timezones.length)];

    this.context = await this.browser.newContext({
      viewport,
      userAgent,
      locale,
      timezoneId,
      geolocation: { longitude: -97.7431, latitude: 30.2672 },
      permissions: ['geolocation'],
      deviceScaleFactor: 1,
      hasTouch: false,
      isMobile: false,
      colorScheme: 'light',
      reducedMotion: 'no-preference' as const,
      forcedColors: 'none' as const,
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
    });

    await this.addStealthScripts();

    logger.info('✅ Created new browser context with anti-detection');
    return this.context;
  }

  /**
   * Add stealth scripts to evade detection
   */
  private async addStealthScripts() {
    if (!this.context) return;

    await this.context.addInitScript(() => {
      // Override navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true
      });

      // Override navigator.plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5] as any,
        configurable: true
      });

      // Override navigator.languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
        configurable: true
      });

      // Add chrome object
      (window as any).chrome = {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {}
      };

      // Override permissions
      const originalQuery = navigator.permissions.query;
      navigator.permissions.query = ((parameters: any) => {
        if (parameters.name === 'notifications') {
          return Promise.resolve({ state: Notification.permission } as any);
        }
        return originalQuery(parameters);
      }) as any;

      // Override connection properties
      Object.defineProperty(navigator, 'connection', {
        get: () => ({
          effectiveType: '4g',
          rtt: 50,
          downlink: 10,
          saveData: false
        }),
        configurable: true
      });

      // Override hardware concurrency
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 8,
        configurable: true
      });

      // Override device memory
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8,
        configurable: true
      });

      // Add random canvas fingerprint
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      //@ts-ignore
      HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) {
        const context = originalGetContext.call(this, type, ...args);
        if (type === '2d' && context) {
          const originalFillText = (context as CanvasRenderingContext2D).fillText;
          (context as CanvasRenderingContext2D).fillText = function(text: string, x: number, y: number, maxWidth?: number) {
            if (Math.random() > 0.5) {
              x += 0.1;
              y += 0.1;
            }
            return originalFillText.call(this, text, x, y, maxWidth);
          };
        }
        return context;
      };
    });
  }

  /**
   * Create a new page with human-like behavior
   */
  async createPage() {
    if (!this.context) {
      await this.createContext();
    }
    this.page = await this.context!.newPage();
    
    this.page.setDefaultTimeout(30000);
    this.page.setDefaultNavigationTimeout(30000);

    return this.page;
  }

  /**
   * Navigate with human-like behavior
   */
  async humanizedGoto(url: string, options: { 
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle',
    timeout?: number,
    randomDelay?: boolean
  } = {}) {
    if (!this.page) {
      await this.createPage();
    }

    const waitUntil = options.waitUntil || 'networkidle';
    const timeout = options.timeout || 30000;

    logger.info(`🌐 Navigating to: ${url}`);

    try {
      if (Math.random() > 0.7) {
        await this.page!.goto('https://www.google.com', { waitUntil: 'domcontentloaded', timeout: 10000 });
        await this.randomDelay(1000, 2000);
      }

      const response = await this.page!.goto(url, { waitUntil, timeout });
      
      if (response && response.status() >= 400) {
        throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
      }

      if (options.randomDelay !== false) {
        await this.randomDelay(2000, 4000);
      }

      await this.simulateHumanBehavior();

      logger.info(`✅ Successfully loaded: ${url}`);
      return response;

    } catch (error: any) {
      logger.error(`❌ Navigation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Simulate human-like behavior
   */
  async simulateHumanBehavior() {
    if (!this.page) return;

    await this.page.mouse.move(
      100 + Math.random() * 500,
      100 + Math.random() * 500
    );

    await this.page.evaluate(() => {
      window.scrollBy({
        top: 100 + Math.random() * 500,
        behavior: 'smooth'
      });
    });

    await this.randomDelay(500, 1500);

    await this.page.mouse.move(
      200 + Math.random() * 800,
      200 + Math.random() * 800
    );
  }

  /**
   * Random delay helper
   */
  async randomDelay(min: number = 1000, max: number = 3000) {
    const delay = min + Math.random() * (max - min);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * 👈 EXTRACT EMAILS WITH PAGINATION AND WAVE SIZE CONTROL
   */
  async extractEmailsWithPagination(
    baseUrl: string, 
    pagesToCheck: string[] = ['', 'contact', 'privacy-policy', 'privacy']
  ): Promise<{ emails: string[], pagesChecked: string[] }> {
    
    if (!this.page) {
      await this.createPage();
    }

    const foundEmails = new Set<string>();
    this.pagesChecked = [];
    this.itemsFound = 0;

    logger.info(`📧 Starting email extraction with wave size: ${this.currentWaveSize}`);

    for (const pagePath of pagesToCheck) {
      // 👈 STOP IF WAVE SIZE REACHED
      if (this.hasReachedWaveLimit()) {
        logger.info(`✅ Reached wave size limit (${this.currentWaveSize}), stopping pagination`);
        break;
      }

      const url = pagePath ? `${baseUrl.replace(/\/$/, '')}/${pagePath}` : baseUrl;
      
      try {
        logger.info(`🌐 Checking page ${this.pagesChecked.length + 1}: ${url}`);
        
        await this.humanizedGoto(url, { 
          waitUntil: 'domcontentloaded', 
          timeout: 8000,
          randomDelay: false 
        });

        const emails = await this.extractEmails();
        
        emails.forEach(email => {
          if (!this.hasReachedWaveLimit()) {
            foundEmails.add(email.toLowerCase());
            this.incrementItemsFound();
          }
        });

        this.pagesChecked.push(url);
        
        logger.info(`   Found ${emails.length} emails on this page (total: ${this.itemsFound}/${this.currentWaveSize})`);

        // Random delay between pages
        await this.randomDelay(2000, 3000);

      } catch (error: any) {
        logger.warn(`⚠️ Failed to load ${url}: ${error.message}`);
      }
    }

    const result = {
      emails: Array.from(foundEmails),
      pagesChecked: this.pagesChecked,
      progress: this.getPaginationProgress()
    };

    logger.success(`✅ Email extraction complete: ${result.emails.length} emails from ${this.pagesChecked.length} pages`);
    return result;
  }

  /**
   * Extract emails from current page
   */
  async extractEmails(): Promise<string[]> {
    if (!this.page) return [];

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    
    const content = await this.page.content();
    const emails = content.match(emailRegex) || [];
    
    const mailtoEmails = await this.page.$$eval('a[href^="mailto:"]', (links: HTMLAnchorElement[]) => {
      return links
        .map(link => link.getAttribute('href')?.replace('mailto:', '').split('?')[0])
        .filter((email): email is string => !!email && email.includes('@'));
    });

    return [...new Set([...emails, ...mailtoEmails])];
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(path?: string): Promise<string | Buffer> {
    if (!this.page) throw new Error('No page available');
    
    if (path) {
      await this.page.screenshot({ path, fullPage: true });
      return path;
    }
    
    return await this.page.screenshot({ type: 'jpeg', quality: 80, fullPage: true });
  }

  /**
   * Get page content
   */
  async getContent(): Promise<string> {
    if (!this.page) throw new Error('No page available');
    return await this.page.content();
  }

  /**
   * Close all resources
   */
  async close() {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this.page = null;
    logger.info('🔒 Closed all browser resources');
  }

  /**
   * Rotate proxy
   */
  rotateProxy() {
    if (this.proxyList.length > 0) {
      this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxyList.length;
      logger.info(`🔄 Rotated to proxy: ${this.proxyList[this.currentProxyIndex]}`);
    }
  }
}