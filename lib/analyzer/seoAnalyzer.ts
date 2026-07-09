// lib/analyzer/seoAnalyzer.ts
export async function analyzeSEO(page: any) {
  return await page.evaluate(() => {
    // Get meta description
    const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    
    // Check for H1
    const h1Elements = document.querySelectorAll('h1');
    const hasH1 = h1Elements.length > 0;
    
    // Check image alt tags
    const images = document.querySelectorAll('img');
    const imagesWithAlt = Array.from(images).filter(img => img.hasAttribute('alt') && img.getAttribute('alt') !== '');
    const hasAltTags = images.length === 0 || (imagesWithAlt.length / images.length) > 0.7;
    
    // Check for meta keywords (optional)
    const metaKeywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content') || '';
    
    // Check for canonical
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
    
    // Check robots meta
    const robots = document.querySelector('meta[name="robots"]')?.getAttribute('content') || '';
    
    // Calculate SEO score based on factors
    let score = 0;
    if (document.title && document.title.length > 10) score += 20;
    if (metaDescription && metaDescription.length > 50) score += 20;
    if (hasH1) score += 20;
    if (hasAltTags) score += 20;
    if (canonical) score += 10;
    if (!robots.includes('noindex')) score += 10;
    
    return {
      title: document.title,
      description: metaDescription,
      hasH1,
      hasAltTags,
      metaKeywords,
      canonical,
      robots,
      score,
      hasSEO: score >= 60
    };
  });
}