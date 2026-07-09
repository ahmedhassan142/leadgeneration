// lib/scraper/utils/browser.ts - UPDATED with timeouts
import puppeteer from 'puppeteer';
import { USER_AGENTS } from './userAgent';

let browser: any = null;
let browserLaunchPromise: Promise<any> | null = null;

export async function getBrowser() {
  if (browser) return browser;
  
  // Prevent multiple launch attempts
  if (browserLaunchPromise) {
    return browserLaunchPromise;
  }
  
  console.log('🚀 Launching browser...');
  browserLaunchPromise = puppeteer.launch({
    //@ts-ignore
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--window-size=1920,1080',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--disable-notifications',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  }).then(b => {
    browser = b;
    browserLaunchPromise = null;
    console.log('✅ Browser launched');
    return b;
  }).catch(err => {
    browserLaunchPromise = null;
    console.error('❌ Browser launch failed:', err);
    throw err;
  });
  
  return browserLaunchPromise;
}

export async function createPage() {
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  // Set shorter timeouts
  page.setDefaultNavigationTimeout(15000); // 15 seconds
  page.setDefaultTimeout(15000);
  
  // Random user agent
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  await page.setUserAgent(userAgent);
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Set extra headers
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Connection': 'keep-alive',
  });

  // Stealth measures
  await page.evaluateOnNewDocument(() => {
    // @ts-ignore
    delete navigator.__proto__.webdriver;
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    // @ts-ignore
    window.chrome = { runtime: {} };
  });

  return page;
}

export async function closeBrowser() {
  if (browser) {
    console.log('🔄 Closing browser...');
    await browser.close();
    browser = null;
    console.log('✅ Browser closed');
  }
}

// Add this helper for safe navigation with timeout
export async function safeGoto(page: any, url: string, timeout: number = 10000) {
  try {
    // Use Promise.race to enforce timeout
    await Promise.race([
      page.goto(url, { 
        waitUntil: 'domcontentloaded', // Changed from networkidle2
        timeout 
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Navigation timeout after ${timeout}ms`)), timeout + 1000)
      )
    ]);
    return true;
  } catch (error) {
    console.log(`Navigation failed for ${url}:`, error);
    return false;
  }
}