// lib/utils/logger.ts

// Add ScraperType to existing types
export type ScraperType = 
  | 'linkedin' 
  | 'twitter' 
  | 'facebook' 
  | 'discord' 
  | 'slack'
  | 'reddit'
  | 'indiehackers'
  | 'jobboards'
  | 'forums'
  | 'googlealerts'
  | 'hackernews'
  | 'press'
  | 'wordpress'
  | 'unknown';

// Extend LogLevel to include scraper-specific levels (keeping existing ones)
type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success';

// Extend LogEntry with scraper fields (keeping existing structure)
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  jobId?: string;
  leadId?: string;
  // NEW FIELDS - optional to not break existing code
  scraper?: ScraperType;
  platform?: string;
  action?: string;
  duration?: number;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  
  // NEW: Scraper-specific stats tracking
  private scraperStats: Map<ScraperType, {
    total: number;
    success: number;
    errors: number;
    leadsFound: number;
    lastRun?: Date;
    avgDuration?: number;
  }> = new Map();

  // Existing methods remain EXACTLY the same
  info(message: string, data?: any, meta?: { jobId?: string; leadId?: string }) {
    this.log('info', message, data, meta);
  }

  warn(message: string, data?: any, meta?: { jobId?: string; leadId?: string }) {
    this.log('warn', message, data, meta);
  }

  error(message: string, error?: any, meta?: { jobId?: string; leadId?: string }) {
    const errorData = error instanceof Error 
      ? {
          message: error.message,
          name: error.name,
          stack: error.stack,
          ...(error as any)
        }
      : error;
    
    this.log('error', message, errorData, meta);
  }

  success(message: string, data?: any, meta?: { jobId?: string; leadId?: string }) {
    this.log('success', message, data, meta);
  }

  debug(message: string, data?: any, meta?: { jobId?: string; leadId?: string }) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, data, meta);
    }
  }

  /**
   * Create a timer for performance tracking
   */
  timer(name: string, meta?: { jobId?: string; leadId?: string }) {
    const start = Date.now();
    const timerId = `timer-${name}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    this.debug(`⏱️ Timer started: ${name}`, { timerId, start }, meta);
    
    return {
      end: (message?: string, data?: any) => {
        const duration = Date.now() - start;
        this.info(message || `Timer completed: ${name}`, {
          ...data,
          duration,
          durationMs: duration,
          timerId,
          name
        }, meta);
        return duration;
      },
      cancel: () => {
        this.debug(`⏱️ Timer cancelled: ${name}`, { timerId, duration: Date.now() - start }, meta);
      }
    };
  }

  // NEW: Scraper-specific logging methods
  scraperInfo(scraper: ScraperType, message: string, data?: any, meta?: { jobId?: string; leadId?: string }) {
    this.log('info', message, data, { ...meta, scraper });
  }

  scraperWarn(scraper: ScraperType, message: string, data?: any, meta?: { jobId?: string; leadId?: string }) {
    this.log('warn', message, data, { ...meta, scraper });
  }

  scraperError(scraper: ScraperType, message: string, error?: any, meta?: { jobId?: string; leadId?: string }) {
    const errorData = error instanceof Error 
      ? {
          message: error.message,
          name: error.name,
          stack: error.stack,
          ...(error as any)
        }
      : error;
    
    this.log('error', message, errorData, { ...meta, scraper });
    
    // Update scraper stats
    const stats = this.scraperStats.get(scraper) || { total: 0, success: 0, errors: 0, leadsFound: 0 };
    stats.errors++;
    stats.total++;
    this.scraperStats.set(scraper, stats);
  }

  scraperSuccess(scraper: ScraperType, message: string, data?: any, meta?: { jobId?: string; leadId?: string }) {
    this.log('success', message, data, { ...meta, scraper });
    
    // Update scraper stats
    const stats = this.scraperStats.get(scraper) || { total: 0, success: 0, errors: 0, leadsFound: 0 };
    stats.success++;
    stats.total++;
    stats.lastRun = new Date();
    
    if (data?.leadsFound) {
      stats.leadsFound += data.leadsFound;
    }
    
    this.scraperStats.set(scraper, stats);
  }

  scraperDebug(scraper: ScraperType, message: string, data?: any, meta?: { jobId?: string; leadId?: string }) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, data, { ...meta, scraper });
    }
  }

  /**
   * Track scraper performance
   */
  trackScraperPerformance(
    scraper: ScraperType, 
    action: string, 
    duration: number,
    success: boolean,
    meta?: { jobId?: string; leadId?: string }
  ) {
    this.log('info', `Scraper performance: ${scraper}.${action}`, {
      scraper,
      action,
      duration,
      durationMs: duration,
      success,
      timestamp: new Date().toISOString()
    }, { ...meta, scraper });

    // Update average duration
    const stats = this.scraperStats.get(scraper) || { total: 0, success: 0, errors: 0, leadsFound: 0 };
    if (!stats.avgDuration) {
      stats.avgDuration = duration;
    } else {
      stats.avgDuration = (stats.avgDuration + duration) / 2;
    }
    this.scraperStats.set(scraper, stats);
  }

  /**
   * Log lead found by scraper
   */
  leadFound(scraper: ScraperType, leadId: string, requirement: string, meta?: { jobId?: string }) {
    this.log('success', `🎯 Lead found from ${scraper}`, {
      leadId,
      requirement: requirement.substring(0, 100),
      scraper
    }, { ...meta, leadId, scraper });

    // Update stats
    const stats = this.scraperStats.get(scraper) || { total: 0, success: 0, errors: 0, leadsFound: 0 };
    stats.leadsFound++;
    this.scraperStats.set(scraper, stats);
  }

  /**
   * Log scraper start
   */
  scraperStart(scraper: ScraperType, config?: any, meta?: { jobId?: string }) {
    this.log('info', `🚀 Starting ${scraper} scraper`, { 
      scraper, 
      config,
      timestamp: new Date().toISOString()
    }, { ...meta, scraper });
  }

  /**
   * Log scraper end with summary
   */
  scraperEnd(scraper: ScraperType, summary: {
    leadsFound: number;
    errors: number;
    duration: number;
    urlsVisited?: number;
  }, meta?: { jobId?: string }) {
    this.log('success', `✅ ${scraper} scraper completed`, {
      scraper,
      ...summary,
      leadsPerSecond: (summary.leadsFound / (summary.duration / 1000)).toFixed(2)
    }, { ...meta, scraper });

    // Update stats
    const stats = this.scraperStats.get(scraper) || { total: 0, success: 0, errors: 0, leadsFound: 0 };
    stats.leadsFound += summary.leadsFound;
    stats.errors += summary.errors;
    stats.lastRun = new Date();
    if (!stats.avgDuration) {
      stats.avgDuration = summary.duration;
    } else {
      stats.avgDuration = (stats.avgDuration + summary.duration) / 2;
    }
    this.scraperStats.set(scraper, stats);
  }

  // NEW: Get scraper-specific stats
  getScraperStats(scraper?: ScraperType) {
    if (scraper) {
      return this.scraperStats.get(scraper);
    }
    return Object.fromEntries(this.scraperStats);
  }

  /**
   * Log rate limiting events
   */
  rateLimitExceeded(scraper: ScraperType, retryAfter?: number, meta?: { jobId?: string }) {
    this.log('warn', `⚠️ Rate limit exceeded for ${scraper}`, {
      scraper,
      retryAfter,
      retryAfterSeconds: retryAfter,
      timestamp: new Date().toISOString()
    }, { ...meta, scraper });
  }

  /**
   * Log proxy rotation
   */
  proxyRotated(scraper: ScraperType, proxyInfo: { host: string; country?: string }, meta?: { jobId?: string }) {
    this.log('info', `🔄 Proxy rotated for ${scraper}`, {
      scraper,
      proxy: proxyInfo.host,
      country: proxyInfo.country,
      timestamp: new Date().toISOString()
    }, { ...meta, scraper });
  }

  /**
   * Log captcha encountered/solved
   */
  captchaEvent(scraper: ScraperType, action: 'detected' | 'solved' | 'failed', meta?: { jobId?: string }) {
    const emoji = action === 'solved' ? '✅' : action === 'detected' ? '🔍' : '❌';
    this.log('info', `${emoji} Captcha ${action} for ${scraper}`, {
      scraper,
      action,
      timestamp: new Date().toISOString()
    }, { ...meta, scraper });
  }

  // EXISTING METHODS - UNCHANGED
  getLogs(level?: LogLevel, limit: number = 100): LogEntry[] {
    let filtered = level 
      ? this.logs.filter(log => log.level === level)
      : [...this.logs];
    
    return filtered.slice(0, limit);
  }

  getJobLogs(jobId: string): LogEntry[] {
    return this.logs.filter(log => log.jobId === jobId);
  }

  getLeadLogs(leadId: string): LogEntry[] {
    return this.logs.filter(log => log.leadId === leadId);
  }

  // NEW: Get scraper-specific logs
  getScraperLogs(scraper: ScraperType, limit: number = 100): LogEntry[] {
    return this.logs
      .filter(log => log.scraper === scraper)
      .slice(0, limit);
  }

  clear() {
    this.logs = [];
    this.scraperStats.clear();
    this.info('🧹 Logs cleared');
  }

  getStats() {
    const stats = {
      total: this.logs.length,
      byLevel: {} as Record<LogLevel, number>,
      byHour: {} as Record<string, number>,
      // NEW: Add scraper stats
      byScraper: {} as Record<string, {
        total: number;
        byLevel: Record<LogLevel, number>;
      }>,
      scraperPerformance: Object.fromEntries(this.scraperStats)
    };

    this.logs.forEach(log => {
      // By level
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      
      // By hour
      const hour = log.timestamp.substring(0, 13);
      stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;

      // By scraper
      if (log.scraper) {
        if (!stats.byScraper[log.scraper]) {
          stats.byScraper[log.scraper] = { total: 0, byLevel: {} as Record<LogLevel, number> };
        }
        stats.byScraper[log.scraper].total++;
        stats.byScraper[log.scraper].byLevel[log.level] = 
          (stats.byScraper[log.scraper].byLevel[log.level] || 0) + 1;
      }
    });

    return stats;
  }

  private log(level: LogLevel, message: string, data?: any, meta?: { 
    jobId?: string; 
    leadId?: string;
    scraper?: ScraperType;
  }) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      jobId: meta?.jobId,
      leadId: meta?.leadId,
      scraper: meta?.scraper
    };

    this.logs.unshift(entry);
    
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    // Console output with colors
    const colors = {
      info: '\x1b[36m',
      warn: '\x1b[33m',
      error: '\x1b[31m',
      debug: '\x1b[35m',
      success: '\x1b[32m'
    };
    
    const emojis = {
      info: 'ℹ️ ',
      warn: '⚠️ ',
      error: '❌ ',
      debug: '🔧 ',
      success: '✅ '
    };
    
    const reset = '\x1b[0m';

    // Build prefix with scraper info
    let prefix = `${emojis[level]}[${level.toUpperCase()}]`;
    if (meta?.scraper) prefix += ` [${meta.scraper.toUpperCase()}]`;
    if (meta?.jobId) prefix += ` [Job:${meta.jobId}]`;
    if (meta?.leadId) prefix += ` [Lead:${meta.leadId}]`;

    console.log(
      `${colors[level]}${prefix}${reset} ${entry.timestamp} - ${message}`,
      data ? (typeof data === 'object' ? JSON.stringify(data, null, 2) : data) : ''
    );
  }
}

export const logger = new Logger();

// Export convenience methods (keeping existing ones exactly the same)
export const logInfo = (message: string, data?: any, meta?: { jobId?: string; leadId?: string }) => 
  logger.info(message, data, meta);

export const logWarn = (message: string, data?: any, meta?: { jobId?: string; leadId?: string }) => 
  logger.warn(message, data, meta);

export const logError = (message: string, error?: any, meta?: { jobId?: string; leadId?: string }) => 
  logger.error(message, error, meta);

export const logSuccess = (message: string, data?: any, meta?: { jobId?: string; leadId?: string }) => 
  logger.success(message, data, meta);

export const logDebug = (message: string, data?: any, meta?: { jobId?: string; leadId?: string }) => 
  logger.debug(message, data, meta);

export const startTimer = (name: string, meta?: { jobId?: string; leadId?: string }) => 
  logger.timer(name, meta);

// NEW: Export scraper-specific convenience methods
export const scraperLog = {
  info: (scraper: ScraperType, message: string, data?: any, meta?: { jobId?: string; leadId?: string }) =>
    logger.scraperInfo(scraper, message, data, meta),
  
  warn: (scraper: ScraperType, message: string, data?: any, meta?: { jobId?: string; leadId?: string }) =>
    logger.scraperWarn(scraper, message, data, meta),
  
  error: (scraper: ScraperType, message: string, error?: any, meta?: { jobId?: string; leadId?: string }) =>
    logger.scraperError(scraper, message, error, meta),
  
  success: (scraper: ScraperType, message: string, data?: any, meta?: { jobId?: string; leadId?: string }) =>
    logger.scraperSuccess(scraper, message, data, meta),
  
  debug: (scraper: ScraperType, message: string, data?: any, meta?: { jobId?: string; leadId?: string }) =>
    logger.scraperDebug(scraper, message, data, meta),
  
  leadFound: (scraper: ScraperType, leadId: string, requirement: string, meta?: { jobId?: string }) =>
    logger.leadFound(scraper, leadId, requirement, meta),
  
  start: (scraper: ScraperType, config?: any, meta?: { jobId?: string }) =>
    logger.scraperStart(scraper, config, meta),
  
  end: (scraper: ScraperType, summary: any, meta?: { jobId?: string }) =>
    logger.scraperEnd(scraper, summary, meta),
  
  rateLimit: (scraper: ScraperType, retryAfter?: number, meta?: { jobId?: string }) =>
    logger.rateLimitExceeded(scraper, retryAfter, meta),
  
  proxyRotated: (scraper: ScraperType, proxyInfo: any, meta?: { jobId?: string }) =>
    logger.proxyRotated(scraper, proxyInfo, meta),
  
  captcha: (scraper: ScraperType, action: 'detected' | 'solved' | 'failed', meta?: { jobId?: string }) =>
    logger.captchaEvent(scraper, action, meta),
  
  performance: (scraper: ScraperType, action: string, duration: number, success: boolean, meta?: { jobId?: string; leadId?: string }) =>
    logger.trackScraperPerformance(scraper, action, duration, success, meta)
};

// Export types
//@ts-ignore
export type { LogLevel, LogEntry, ScraperType };

export default logger;