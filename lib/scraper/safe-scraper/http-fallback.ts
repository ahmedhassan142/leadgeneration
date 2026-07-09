// lib/scraper/safe-scraper/http-fallback.ts
import axios from 'axios';
import { logger } from '@/lib/scraper/utils/logger';

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export async function httpAnalyzeWebsite(website: string) {
  try {
    logger.info(`🌐 HTTP fallback for: ${website}`);
    
    const response = await axios.get(website, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      maxRedirects: 5
    });

    const html = response.data;
    const statusCode = response.status;
    
    // Simple CMS detection
    let cms = 'Unknown';
    if (html.includes('wp-content') || html.includes('wordpress')) cms = 'WordPress';
    else if (html.includes('shopify')) cms = 'Shopify';
    else if (html.includes('wix')) cms = 'Wix';
    else if (html.includes('squarespace')) cms = 'Squarespace';
    
    // Check if mobile friendly (simple check)
    const hasViewport = html.includes('viewport');
    const mobileFriendly = hasViewport;
    
    // Extract title
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : '';
    
    // Extract description
    const descMatch = html.match(/<meta name="description" content="(.*?)"/i);
    const description = descMatch ? descMatch[1] : '';
    
    // Check for H1
    const hasH1 = html.includes('<h1');
    
    return {
      success: true,
      websiteExists: true,
      statusCode,
      cms,
      mobileFriendly,
      title,
      description,
      hasH1,
      loadTime: response.headers['x-response-time'] || 0,
      method: 'http-fallback'
    };
    
  } catch (error: any) {
    logger.error(`❌ HTTP fallback failed: ${error.message}`);
    
    // Check if site exists at all
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return {
        success: false,
        websiteExists: false,
        error: 'Website does not exist',
        method: 'http-fallback'
      };
    }
    
    if (error.response?.status === 403 || error.response?.status === 429) {
      return {
        success: false,
        websiteExists: true,
        blocked: true,
        statusCode: error.response.status,
        error: `HTTP ${error.response.status} - Blocked`,
        method: 'http-fallback'
      };
    }
    
    return {
      success: false,
      websiteExists: error.response?.status ? true : false,
      error: error.message,
      method: 'http-fallback'
    };
  }
}

export async function httpExtractEmails(website: string): Promise<string[]> {
  try {
    const response = await axios.get(website, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const html = response.data;
    const emails = html.match(EMAIL_REGEX) || [];
    
    // Also check for mailto links
    const mailtoRegex = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const mailtoMatches = html.matchAll(mailtoRegex);
    //@ts-ignore
    const mailtoEmails = Array.from(mailtoMatches, m => m[1]);
    
    return [...new Set([...emails, ...mailtoEmails])];
    
  } catch (error) {
    return [];
  }
}