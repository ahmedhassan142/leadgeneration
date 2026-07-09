// lib/analyzer/phoneExtractor.ts
import { logger } from '@/lib/scraper/utils/logger';

// Phone number regex for international formats
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;

// Clean phone numbers to standard format
function cleanPhoneNumber(phone: string): string {
  return phone.replace(/[^\d+]/g, ''); // Sirf digits aur + rakhna
}

export async function extractPhoneNumbers(page: any): Promise<string[]> {
  try {
    // Get page content
    const content = await page.content();
    
    // Find phone numbers using regex
    const matches = content.match(PHONE_REGEX) || [];
    
    // Clean and deduplicate
    const phones = new Set<string>();
    matches.forEach((phone:any) => {
      const cleaned = cleanPhoneNumber(phone);
      if (cleaned.length >= 10) { // Minimum 10 digits
        phones.add(cleaned);
      }
    });
    
    // Also check for tel: links
    const telLinks = await page.$$eval('a[href^="tel:"]', (links: HTMLAnchorElement[]) => {
      return links.map(link => link.getAttribute('href')?.replace('tel:', '') || '');
    });
    
    telLinks.forEach((phone:any) => {
      const cleaned = cleanPhoneNumber(phone);
      if (cleaned.length >= 10) {
        phones.add(cleaned);
      }
    });
    
    return Array.from(phones);
    
  } catch (error) {
    logger.error('❌ Phone extraction failed:', error);
    return [];
  }
}