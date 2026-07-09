// lib/analyzer/cmsDetector.ts
export async function detectCMS(page: any): Promise<string> {
  const cms = await page.evaluate(() => {
    const html = document.documentElement.innerHTML;
    const scripts = Array.from(document.scripts).map(s => s.src || '');
    const metaTags = Array.from(document.querySelectorAll('meta')).map(m => m.getAttribute('content') || '');
    const allContent = html + ' ' + scripts.join(' ') + ' ' + metaTags.join(' ');
    
    // WordPress
    if (allContent.includes('wp-content') || 
        allContent.includes('wp-includes') ||
        allContent.includes('wordpress')) {
      return 'WordPress';
    }
    
    // Shopify
    if (allContent.includes('shopify') ||
        allContent.includes('myshopify.com') ||
        document.querySelector('[id^="shopify-"]')) {
      return 'Shopify';
    }
    
    // Wix
    if (allContent.includes('wix') ||
        allContent.includes('Wix') ||
        document.querySelector('[data-wix-version]')) {
      return 'Wix';
    }
    
    // Squarespace
    if (allContent.includes('squarespace') ||
        document.querySelector('[data-squarespace-version]')) {
      return 'Squarespace';
    }
    
    // Webflow
    if (allContent.includes('webflow') ||
        document.querySelector('[data-wf-page]')) {
      return 'Webflow';
    }
    
    // Drupal
    if (allContent.includes('drupal') ||
        document.querySelector('meta[name="generator"][content*="Drupal"]')) {
      return 'Drupal';
    }
    
    // Joomla
    if (allContent.includes('joomla') ||
        document.querySelector('meta[name="generator"][content*="Joomla"]')) {
      return 'Joomla';
    }
    
    return 'Unknown/Custom';
  });
  
  return cms;
}