// lib/scraper/linkedinAlternative.ts
import { Lead } from '../db/models/Lead';
// import { addJob } from '../queue/mongo-queue';

/**
 * ✅ SAFE LinkedIn Alternative Scraper
 * Finds LinkedIn URLs from public sources
 */

// 1. Find LinkedIn via Google Search (PUBLIC)
export async function findLinkedInViaGoogle(companyName: string, location?: string) {
  try {
    const searchQuery = `site:linkedin.com/company "${companyName}" ${location || ''}`;
    
    // Using a free search API or fetch with proper headers
    const response = await fetch(
      `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );
    
    const html = await response.text();
    
    // Extract LinkedIn URLs from Google results
    const linkedInRegex = /https:\/\/www\.linkedin\.com\/company\/[^"\\\s>]+/g;
    const matches = html.match(linkedInRegex);
    
    return matches ? matches[0] : null;
    
  } catch (error) {
    console.error('Google search failed:', error);
    return null;
  }
}

// 2. Find LinkedIn on company website
export async function findLinkedInOnWebsite(website: string) {
  try {
    // Import dynamically to avoid circular dependencies
    const { createPage } = await import('./utils/browser');
    const page = await createPage();
    
    try {
      await page.goto(website, { 
        waitUntil: 'networkidle2', 
        timeout: 10000 
      });
      
      // Look for LinkedIn links
      const linkedInUrl = await page.evaluate(() => {
        // Find all links
        const links = Array.from(document.querySelectorAll('a[href*="linkedin.com"]'));
        
        for (const link of links) {
          const href = link.getAttribute('href');
          if (href && href.includes('/company/')) {
            return href.startsWith('http') ? href : `https:${href}`;
          }
        }
        
        // Check for LinkedIn icon
        const icons = Array.from(document.querySelectorAll(
          'img[alt*="LinkedIn"], svg[title*="LinkedIn"], i[class*="linkedin"]'
        ));
        
        for (const icon of icons) {
          const parent = icon.closest('a');
          if (parent) {
            const href = parent.getAttribute('href');
            if (href) {
              return href.startsWith('http') ? href : `https:${href}`;
            }
          }
        }
        
        return null;
      });
      
      return linkedInUrl;
      
    } finally {
      await page.close();
    }
  } catch (error) {
    console.error('Error scanning website:', error);
    return null;
  }
}

// 3. Use Clearbit API (Free)
export async function getClearbitInfo(domain: string) {
  try {
    const response = await fetch(`https://company.clearbit.com/v1/domains/find?name=${domain}`, {
      headers: {
        'Authorization': `Bearer ${process.env.CLEARBIT_API_KEY || 'sk_your_key_here'}`
      }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    return {
      name: data.name,
      linkedin: data.linkedin?.handle ? `https://linkedin.com/company/${data.linkedin.handle}` : null,
      twitter: data.twitter?.handle,
      facebook: data.facebook?.handle,
      employeeCount: data.employeeCount,
      industry: data.industry,
      description: data.description,
      logo: data.logo,
    };
    
  } catch (error) {
    console.error('Clearbit API error:', error);
    return null;
  }
}

// 4. Main function to enrich leads with social data
export async function enrichLeadWithSocialData(leadId: string) {
  await require('../db/connect').default();
  const lead = await Lead.findById(leadId);
  if (!lead) return null;
  
  const socialData: any = {
    linkedin: null,
    facebook: null,
    twitter: null,
    instagram: null,
  };
  
  // Method 1: Check website for LinkedIn link
  if (lead.website && !lead.website.includes('google.com')) {
    try {
      const domain = new URL(lead.website).hostname.replace('www.', '');
      
      // Try Clearbit first
      const clearbitData = await getClearbitInfo(domain);
      if (clearbitData) {
        socialData.linkedin = clearbitData.linkedin;
        socialData.facebook = clearbitData.facebook;
        socialData.twitter = clearbitData.twitter;
        socialData.employeeCount = clearbitData.employeeCount;
        socialData.industry = clearbitData.industry;
        socialData.description = clearbitData.description;
        socialData.logo = clearbitData.logo;
      }
      
      // If no LinkedIn from Clearbit, try website
      if (!socialData.linkedin) {
        const linkedInFromSite = await findLinkedInOnWebsite(lead.website);
        if (linkedInFromSite) {
          socialData.linkedin = linkedInFromSite;
        }
      }
    } catch (e) {
      // Invalid URL, skip
    }
  }
  
  // Method 2: Try Google search
  if (!socialData.linkedin) {
    const linkedInFromGoogle = await findLinkedInViaGoogle(lead.name, lead.location);
    if (linkedInFromGoogle) {
      socialData.linkedin = linkedInFromGoogle;
    }
  }
  
  // Update lead with social data
  if (socialData.linkedin || socialData.facebook || socialData.twitter) {
    await Lead.findByIdAndUpdate(leadId, {
      socialLinks: {
        linkedin: socialData.linkedin,
        facebook: socialData.facebook,
        twitter: socialData.twitter,
        instagram: socialData.instagram,
      },
      metadata: {
        ...lead.metadata,
        employeeCount: socialData.employeeCount,
        industry: socialData.industry,
        description: socialData.description,
        logo: socialData.logo,
      }
    });
    
    console.log(`✅ Enriched lead ${lead.name} with social data`);
  }
  
  return socialData;
}

// 5. Batch enrich all leads
export async function batchEnrichLeads(niche?: string, limit: number = 50) {
  await require('../db/connect').default();
  
  const query: any = {
    'socialLinks.linkedin': { $exists: false },
    website: { $exists: true, $ne: '' }
  };
  
  if (niche) query.niche = niche;
  
  const leads = await Lead.find(query).limit(limit);
  
  console.log(`🔄 Enriching ${leads.length} leads with social data...`);
  
  for (const lead of leads) {
    try {
      await enrichLeadWithSocialData(lead._id.toString());
      // Add small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to enrich lead ${lead._id}:`, error);
    }
  }
  
  console.log(`✅ Batch enrichment complete`);
  return leads.length;
}