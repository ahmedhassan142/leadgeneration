// lib/analyzer/website-analyzer.ts
import axios from 'axios';
import * as cheerio from 'cheerio';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '@/lib/scraper/utils/logger';

const execAsync = promisify(exec);

export interface AnalysisResult {
  url: string;
  // SEO & Technical
  hasSSL: boolean;
  hasRobotsTxt: boolean;
  hasSitemap: boolean;
  hasFavicon: boolean;
  hasCanonical: boolean;
  metaTags: {
    title: string | null;
    description: string | null;
    keywords: string | null;
    viewport: string | null;
  };
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  images: {
    total: number;
    withAlt: number;
    withoutAlt: number;
  };
  links: {
    total: number;
    internal: number;
    external: number;
    broken: string[];
  };
  pageSize: number;
  loadTime: number;
  isMobileFriendly: boolean;
  
  // UI/Design Quality (from Impeccable)
  uiModernScore: number;
  isModernDesign: boolean;
  outdatedElements: string[];
  designIssues: string[];
  uiRecommendations: string[];
  
  // Final Score
  score: number;
  quality: 'hot' | 'warm' | 'cold';
}

/**
 * Run Impeccable UI detection (detects modern vs outdated design)
 */
async function runImpeccableUI(url: string): Promise<{
  modernScore: number;
  isModern: boolean;
  outdatedElements: string[];
  designIssues: string[];
  recommendations: string[];
}> {
  const defaultResult = {
    modernScore: 50,
    isModern: false,
    outdatedElements: [],
    designIssues: [],
    recommendations: []
  };
  
  try {
    logger.info(`🎨 Running Impeccable UI analysis on ${url}`);
    
    // Run impeccable detect command
    const command = `npx impeccable detect ${url} --json`;
    const { stdout, stderr } = await execAsync(command, { timeout: 60000 });
    
    if (stderr) console.error('Impeccable stderr:', stderr);
    
    const result = JSON.parse(stdout);
    const findings = result.findings || [];
    
    // Categorize findings
    const aiSlopPatterns = findings.filter((f: any) => 
      f.pattern?.includes('gradient') || 
      f.pattern?.includes('purple') ||
      f.pattern?.includes('glow') ||
      f.pattern?.includes('glassmorphism')
    );
    
    const typographyIssues = findings.filter((f: any) =>
      f.pattern?.includes('Inter') ||
      f.pattern?.includes('Roboto') ||
      f.pattern?.includes('font')
    );
    
    const layoutIssues = findings.filter((f: any) =>
      f.pattern?.includes('centered') ||
      f.pattern?.includes('spacing') ||
      f.pattern?.includes('padding')
    );
    
    const designIssues = [
      ...aiSlopPatterns.map((f: any) => `AI Slop: ${f.pattern}`),
      ...typographyIssues.map((f: any) => `Typography: ${f.pattern}`),
      ...layoutIssues.map((f: any) => `Layout: ${f.pattern}`)
    ];
    
    // Calculate modern score (fewer findings = more modern)
    const maxFindings = 25;
    const findingCount = findings.length;
    const modernScore = Math.max(0, Math.min(100, 100 - (findingCount * 4)));
    const isModern = modernScore >= 60;
    
    // Generate UI recommendations
    const recommendations = [];
    if (modernScore < 50) {
      recommendations.push('Modernize UI design - update color scheme and typography');
    }
    if (aiSlopPatterns.length > 0) {
      recommendations.push('Avoid generic AI-generated UI patterns (purple gradients, glassmorphism)');
    }
    if (typographyIssues.length > 0) {
      recommendations.push('Use a more distinctive font hierarchy');
    }
    if (layoutIssues.length > 0) {
      recommendations.push('Improve layout spacing and alignment');
    }
    if (isModern) {
      recommendations.push('Website has modern design - good candidate for outreach');
    } else {
      recommendations.push('Website looks outdated - high opportunity for redesign services');
    }
    
    return {
      modernScore,
      isModern,
      outdatedElements: findings.slice(0, 10).map((f: any) => f.pattern),
      designIssues: designIssues.slice(0, 10),
      recommendations
    };
    
  } catch (error: any) {
    logger.error('Impeccable UI analysis failed:', error.message);
    return defaultResult;
  }
}

/**
 * Complete website analysis including SEO, technical, and UI/design
 */
export async function analyzeWebsite(url: string): Promise<AnalysisResult> {
  const startTime = Date.now();
  const result: AnalysisResult = {
    url,
    // Technical SEO
    hasSSL: url.startsWith('https'),
    hasRobotsTxt: false,
    hasSitemap: false,
    hasFavicon: false,
    hasCanonical: false,
    metaTags: { title: null, description: null, keywords: null, viewport: null },
    headings: { h1: [], h2: [], h3: [] },
    images: { total: 0, withAlt: 0, withoutAlt: 0 },
    links: { total: 0, internal: 0, external: 0, broken: [] },
    pageSize: 0,
    loadTime: 0,
    isMobileFriendly: false,
    
    // UI/Design
    uiModernScore: 50,
    isModernDesign: false,
    outdatedElements: [],
    designIssues: [],
    uiRecommendations: [],
    
    // Final
    score: 0,
    quality: 'cold'
  };
  
  try {
    // ============================================
    // 1. Run Impeccable UI Detection (Modern vs Outdated)
    // ============================================
    const uiResult = await runImpeccableUI(url);
    result.uiModernScore = uiResult.modernScore;
    result.isModernDesign = uiResult.isModern;
    result.outdatedElements = uiResult.outdatedElements;
    result.designIssues = uiResult.designIssues;
    result.uiRecommendations = uiResult.recommendations;
    
    logger.info(`UI Analysis: Modern Score ${result.uiModernScore}, Is Modern: ${result.isModernDesign}`);
    
    // ============================================
    // 2. Fetch and parse website
    // ============================================
    const response = await axios.get(url, { 
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const html = response.data;
    const $ = cheerio.load(html);
    
    result.loadTime = Date.now() - startTime;
    result.pageSize = html.length;
    
    // ============================================
    // 3. Technical SEO Checks
    // ============================================
    // Check robots.txt
    try {
      const robotsRes = await axios.get(`${new URL(url).origin}/robots.txt`, { timeout: 5000 });
      result.hasRobotsTxt = robotsRes.status === 200;
    } catch { /* not found */ }
    
    // Check sitemap.xml
    try {
      const sitemapRes = await axios.get(`${new URL(url).origin}/sitemap.xml`, { timeout: 5000 });
      result.hasSitemap = sitemapRes.status === 200;
    } catch { /* not found */ }
    
    // Check favicon
    result.hasFavicon = $('link[rel*="icon"]').length > 0;
    
    // Check canonical
    result.hasCanonical = $('link[rel="canonical"]').length > 0;
    
    // Extract meta tags
    result.metaTags.title = $('title').text().trim() || null;
    result.metaTags.description = $('meta[name="description"]').attr('content') || null;
    result.metaTags.keywords = $('meta[name="keywords"]').attr('content') || null;
    result.metaTags.viewport = $('meta[name="viewport"]').attr('content') || null;
    
    // Check mobile friendliness
    result.isMobileFriendly = !!result.metaTags.viewport;
    
    // Extract headings
    $('h1').each((_, el) => result.headings.h1.push($(el).text().trim()));
    $('h2').each((_, el) => result.headings.h2.push($(el).text().trim()));
    $('h3').each((_, el) => result.headings.h3.push($(el).text().trim()));
    
    // Analyze images
    $('img').each((_, el) => {
      result.images.total++;
      if ($(el).attr('alt')) {
        result.images.withAlt++;
      } else {
        result.images.withoutAlt++;
      }
    });
    
    // Analyze links
    const baseUrl = new URL(url);
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
      
      result.links.total++;
      
      try {
        const linkUrl = new URL(href, url);
        if (linkUrl.hostname === baseUrl.hostname) {
          result.links.internal++;
        } else {
          result.links.external++;
        }
      } catch {
        result.links.external++;
      }
    });
    
    // ============================================
    // 4. Calculate Final Score
    // ============================================
    let score = 0;
    
    // SSL (10 points)
    if (result.hasSSL) score += 10;
    
    // Technical SEO (25 points)
    if (result.hasRobotsTxt) score += 5;
    if (result.hasSitemap) score += 5;
    if (result.hasFavicon) score += 5;
    if (result.hasCanonical) score += 5;
    if (result.metaTags.title) score += 5;
    
    // Content SEO (20 points)
    if (result.metaTags.description) score += 10;
    if (result.headings.h1.length === 1) score += 5;
    if (result.headings.h2.length > 0) score += 5;
    
    // Mobile & Performance (20 points)
    if (result.metaTags.viewport) score += 10;
    if (result.loadTime < 2000) score += 10;
    else if (result.loadTime < 3000) score += 7;
    else if (result.loadTime < 5000) score += 5;
    
    // Images (10 points)
    const altRatio = result.images.total > 0 ? result.images.withAlt / result.images.total : 1;
    if (altRatio > 0.8) score += 10;
    else if (altRatio > 0.5) score += 5;
    
    // UI Modern Score (15 points)
    score += Math.round(result.uiModernScore * 0.15);
    
    result.score = Math.min(100, Math.round(score));
    
    // Determine quality
    if (result.score >= 70) {
      result.quality = 'hot';
    } else if (result.score >= 40) {
      result.quality = 'warm';
    } else {
      result.quality = 'cold';
    }
    
    logger.info(`✅ Analysis complete: ${result.score}/100 (${result.quality})`);
    
  } catch (error: any) {
    logger.error('Analysis failed:', error.message);
    result.score = 0;
    result.quality = 'cold';
  }
  
  return result;
}

/**
 * Quick analysis (faster, for bulk processing)
 */
export async function quickAnalyzeWebsite(url: string): Promise<Pick<AnalysisResult, 'url' | 'score' | 'quality' | 'isModernDesign' | 'uiModernScore'>> {
  const startTime = Date.now();
  
  try {
    // Run quick UI check with --fast flag
    const command = `npx impeccable detect --fast --json ${url}`;
    const { stdout } = await execAsync(command, { timeout: 30000 });
    const result = JSON.parse(stdout);
    const findings = result.findings || [];
    const uiModernScore = Math.max(0, Math.min(100, 100 - (findings.length * 4)));
    const isModernDesign = uiModernScore >= 60;
    
    // Quick HTTP check
    let score = uiModernScore * 0.6;
    try {
      const response = await axios.get(url, { timeout: 10000 });
      score += response.data.includes('viewport') ? 20 : 0;
      score += url.startsWith('https') ? 20 : 0;
    } catch {
      score = uiModernScore * 0.5;
    }
    
    const finalScore = Math.min(100, Math.round(score));
    const quality = finalScore >= 70 ? 'hot' : finalScore >= 40 ? 'warm' : 'cold';
    
    return {
      url,
      score: finalScore,
      quality,
      isModernDesign,
      uiModernScore
    };
    
  } catch (error: any) {
    return {
      url,
      score: 0,
      quality: 'cold',
      isModernDesign: false,
      uiModernScore: 0
    };
  }
}