// lib/queue/mongo-queue.ts - COMPLETE UPDATED VERSION with Auto-Cleanup
import connectToDatabase from '../db/connect';
import { Job } from '../db/models/Job';
import { logger } from '@/lib/scraper/utils/logger';

// Define source type
type SourceType = 'serp_api' | 'scrapingdog' | 'yellowpages' | 'puppeteer_fallback' | 'analyze' | 'email' | 'ai' | 'score' | 'unknown';

// Source icons mapping
const sourceIcons: Record<string, string> = {
  serp_api: '🔵',
  scrapingdog: '🟢',
  yellowpages: '🟡',
  puppeteer_fallback: '🟣',
  analyze: '🌐',
  email: '📧',
  ai: '🤖',
  score: '📊',
  unknown: '⚪'
};

// Track current scrape session ID
let currentSessionId: string | null = null;
let sessionStartTime: number | null = null;

// ============================================
// SESSION MANAGEMENT - Clear old jobs on new scrape
// ============================================

/**
 * Start a new scraping session - call this before adding jobs
 * This will clear all old pending/completed jobs from previous sessions
 */
export async function startNewScrapeSession(): Promise<string> {
  await connectToDatabase();
  
  // Generate new session ID
  currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  sessionStartTime = Date.now();
  
  console.log('\n' + '='.repeat(70));
  console.log(`🆕 NEW SCRAPE SESSION STARTED: ${currentSessionId}`);
  console.log('='.repeat(70));
  
  // Clear ALL old jobs from previous sessions
  const deleteResult = await Job.deleteMany({
    // Delete all jobs except those from the last 5 minutes (in case processor is still working)
    createdAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) }
  });
  
  console.log(`🧹 Cleaned up ${deleteResult.deletedCount} old jobs from previous sessions`);
  
  // Reset all processing jobs to pending (in case they were stuck)
  const resetResult = await Job.updateMany(
    { status: 'processing' },
    { 
      status: 'pending',
      $set: { 
        'data.sessionId': currentSessionId,
        error: 'Job reset for new session'
      }
    }
  );
  
  if (resetResult.modifiedCount > 0) {
    console.log(`🔄 Reset ${resetResult.modifiedCount} stuck processing jobs to pending`);
  }
  
  console.log('='.repeat(70) + '\n');
  
  return currentSessionId;
}

/**
 * Get current session ID
 */
export function getCurrentSessionId(): string | null {
  return currentSessionId;
}

/**
 * Clear old jobs manually
 */
export async function clearOldJobs(): Promise<number> {
  await connectToDatabase();
  
  // Delete jobs older than 1 hour that are completed/failed
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const result = await Job.deleteMany({
    status: { $in: ['completed', 'failed'] },
    completedAt: { $lt: oneHourAgo }
  });
  
  console.log(`🧹 Auto-cleaned ${result.deletedCount} old jobs`);
  
  return result.deletedCount;
}

// Run cleanup every 30 minutes
setInterval(clearOldJobs, 30 * 60 * 1000);

// ============================================
// ADD JOB TO QUEUE - WITH SMART DEDUPLICATION
// ============================================

export async function addJob(type: string, data: any, options?: { maxRetries?: number }) {
  await connectToDatabase();
  
  // 🔥 FIX: Add session ID to all jobs from current scrape
  if (currentSessionId && !data.sessionId) {
    data.sessionId = currentSessionId;
  }
  
  // For scrape jobs, they create their own session
  if (type === 'scrape' && !data.sessionId) {
    data.sessionId = `scrape_${Date.now()}`;
  }
  
  // 🔥 CRITICAL: Only deduplicate within the CURRENT SESSION
  if (data.leadId) {
    // Check for ANY existing job for this lead of the same type (not just pending/processing)
    const existingJob = await Job.findOne({
      type,
      'data.leadId': data.leadId,
      'data.sessionId': data.sessionId,
      // Don't create new job if any exists (even completed) in last hour
      createdAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) }
    });
    
    if (existingJob) {
      console.log(`   ⚠️ Duplicate ${type} job prevented for lead ${data.leadId.slice(-6)}`);
      return existingJob;
    }
  
    
    // DON'T block based on old completed jobs from previous sessions
    // Only check for completed jobs in the LAST 5 MINUTES (maybe still processing)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentCompleted = await Job.findOne({
      type,
      'data.leadId': data.leadId,
      'data.sessionId': data.sessionId, // Only same session
      status: 'completed',
      completedAt: { $gt: fiveMinutesAgo }
    });
    
    if (recentCompleted) {
      logger.info(`ℹ️ Lead ${data.leadId.slice(-6)} already completed in this session`);
      return recentCompleted;
    }
  }
  
  // Check for duplicate website in analyze/email jobs (within current session only)
  if ((type === 'analyze' || type === 'email') && data.website) {
    const existingWebsiteJob = await Job.findOne({
      type,
      'data.website': data.website,
      'data.sessionId': data.sessionId, // Only same session
      status: { $in: ['pending', 'processing'] },
      createdAt: { $gt: new Date(Date.now() - 10 * 60 * 1000) } // Last 10 minutes
    });
    
    if (existingWebsiteJob) {
      logger.info(`ℹ️ Website already has ${type} job in current session: ${data.website}`);
      return existingWebsiteJob;
    }
  }
  
  // Create new job
  const job = await Job.create({
    type,
    data,
    status: 'pending',
    retries: 0,
    maxRetries: options?.maxRetries || 3,
    createdAt: new Date()
  });
  
  // Get source with type safety
  const source = data.source as string || 'unknown';
  const sourceIcon = sourceIcons[source] || sourceIcons.unknown;
  
  // Special format for AI jobs
  if (type === 'ai') {
    console.log('\n' + '🎯'.repeat(10));
    console.log(`🎯 AI JOB CREATED! 🎯`);
    console.log('🎯'.repeat(10));
    console.log(`   Job ID: ${job._id.toString().slice(-8)}`);
    console.log(`   Lead ID: ${data.leadId?.slice(-6) || 'N/A'}`);
    console.log(`   Website: ${data.website?.substring(0, 50) || 'N/A'}`);
    console.log(`   Source: ${source}`);
    console.log(`   Session: ${data.sessionId?.slice(-8) || 'N/A'}`);
    console.log(`   Time: ${new Date().toLocaleTimeString()}`);
    console.log(`   Status: Pending`);
    console.log('🎯'.repeat(10) + '\n');
  } 
  // Scrape jobs
  else if (type === 'scrape') {
    console.log(`\n${sourceIcon} SCRAPE JOB CREATED:`);
    console.log(`   Job ID: ${job._id.toString().slice(-8)}`);
    console.log(`   Source: ${source}`);
    console.log(`   Niche: ${data.niche}`);
    console.log(`   Location: ${data.location}`);
    console.log(`   Pages: ${data.pages || data.maxResults || 'default'}`);
    console.log(`   Session: ${data.sessionId?.slice(-8) || 'N/A'}`);
    console.log(`   Time: ${new Date().toLocaleTimeString()}`);
    console.log(`   Status: Pending\n`);
  }
  // Analyze jobs
  else if (type === 'analyze') {
    console.log(`\n🌐 ANALYZE JOB CREATED:`);
    console.log(`   Job ID: ${job._id.toString().slice(-8)}`);
    console.log(`   Lead ID: ${data.leadId?.slice(-6) || 'N/A'}`);
    console.log(`   Website: ${data.website?.substring(0, 50) || 'N/A'}`);
    console.log(`   Source: ${source}`);
    console.log(`   Session: ${data.sessionId?.slice(-8) || 'N/A'}`);
    console.log(`   Time: ${new Date().toLocaleTimeString()}\n`);
  }
  // Email jobs
  else if (type === 'email') {
    console.log(`\n📧 EMAIL JOB CREATED:`);
    console.log(`   Job ID: ${job._id.toString().slice(-8)}`);
    console.log(`   Lead ID: ${data.leadId?.slice(-6) || 'N/A'}`);
    console.log(`   Website: ${data.website?.substring(0, 50) || 'N/A'}`);
    console.log(`   Source: ${source}`);
    console.log(`   Session: ${data.sessionId?.slice(-8) || 'N/A'}`);
    console.log(`   Time: ${new Date().toLocaleTimeString()}\n`);
  }
  // Score jobs
  else if (type === 'score') {
    console.log(`\n📊 SCORE JOB CREATED:`);
    console.log(`   Job ID: ${job._id.toString().slice(-8)}`);
    console.log(`   Lead ID: ${data.leadId?.slice(-6) || 'N/A'}`);
    console.log(`   Source: ${source}`);
    console.log(`   Session: ${data.sessionId?.slice(-8) || 'N/A'}`);
    console.log(`   Time: ${new Date().toLocaleTimeString()}\n`);
  }
  // Default
  else {
    logger.info(`📦 Job added to queue`, { 
      jobId: job._id.toString().slice(-8), 
      type, 
      source,
      sessionId: data.sessionId?.slice(-8)
    });
  }
  
  return job;
}

// ============================================
// JOB PROCESSING FUNCTIONS
// ============================================

// Get next pending job
export async function getNextJob(type: string) {
  await connectToDatabase();
  
  const job = await Job.findOneAndUpdate(
    { 
      type, 
      status: 'pending',
      $expr: { $lt: ['$retries', '$maxRetries'] }
    },
    { 
      status: 'processing', 
      startedAt: new Date(),
      $inc: { retries: 1 }
    },
    { 
      sort: { createdAt: 1 }, 
      returnDocument: 'after'
    }
  );
  
  if (job) {
    logger.info(`🔄 Processing job: ${job._id.toString().slice(-8)}`, { 
      type, 
      source: job.data.source,
      sessionId: job.data.sessionId?.slice(-8)
    });
  }
  
  return job;
}

// Mark job as completed
export async function completeJob(jobId: string, result: any) {
  await connectToDatabase();
  
  const job = await Job.findByIdAndUpdate(
    jobId,
    {
      status: 'completed',
      result,
      completedAt: new Date()
    },
    { returnDocument: 'after' }
  );
  
  if (job) {
    const emoji = job.type === 'ai' ? '🤖' : 
                  job.type === 'scrape' ? '🔍' :
                  job.type === 'analyze' ? '🌐' :
                  job.type === 'email' ? '📧' :
                  job.type === 'score' ? '📊' : '✅';
    
    const source = job.data.source as string || 'unknown';
    const sourceIcon = sourceIcons[source] || sourceIcons.unknown;
    
    console.log(`\n${emoji} JOB COMPLETED: ${job._id.toString().slice(-8)}`);
    console.log(`   Type: ${job.type}`);
    console.log(`   Source: ${sourceIcon} ${source}`);
    console.log(`   Session: ${job.data.sessionId?.slice(-8) || 'N/A'}`);
    console.log(`   Time: ${new Date().toLocaleTimeString()}`);
    
    if (job.type === 'scrape' && result?.leadsFound) {
      console.log(`   Leads found: ${result.leadsFound}`);
    }
    if (job.type === 'ai' && result?.designScore) {
      console.log(`   Design score: ${result.designScore}`);
    }
    if (job.type === 'score' && result?.quality) {
      console.log(`   Quality: ${result.quality} (${result.score})`);
    }
    console.log('');
  }
  
  return job;
}

// Mark job as failed
export async function failJob(jobId: string, error: string) {
  await connectToDatabase();
  
  const job = await Job.findById(jobId);
  
  if (!job) return null;
  
  if (job.retries < job.maxRetries) {
    const updated = await Job.findByIdAndUpdate(
      jobId,
      {
        status: 'pending',
        error: `Attempt ${job.retries + 1}/${job.maxRetries} failed: ${error}`,
        updatedAt: new Date()
      },
      { returnDocument: 'after' }
    );
    
    const source = job.data.source as string || 'unknown';
    const sourceIcon = sourceIcons[source] || sourceIcons.unknown;
    
    console.log(`\n🔄 RETRYING JOB ${job._id.toString().slice(-8)}`);
    console.log(`   Type: ${job.type}`);
    console.log(`   Source: ${sourceIcon} ${source}`);
    console.log(`   Attempt: ${job.retries + 1}/${job.maxRetries}`);
    console.log(`   Session: ${job.data.sessionId?.slice(-8) || 'N/A'}`);
    console.log(`   Error: ${error.substring(0, 100)}`);
    console.log('');
    
    return updated;
  } else {
    const updated = await Job.findByIdAndUpdate(
      jobId,
      {
        status: 'failed',
        error,
        completedAt: new Date()
      },
      { returnDocument: 'after' }
    );
    
    const source = job.data.source as string || 'unknown';
    const sourceIcon = sourceIcons[source] || sourceIcons.unknown;
    
    console.log(`\n❌ JOB FAILED PERMANENTLY ${job._id.toString().slice(-8)}`);
    console.log(`   Type: ${job.type}`);
    console.log(`   Source: ${sourceIcon} ${source}`);
    console.log(`   Session: ${job.data.sessionId?.slice(-8) || 'N/A'}`);
    console.log(`   Error: ${error.substring(0, 200)}`);
    console.log('');
    
    return updated;
  }
}

// Update job progress
export async function updateJobProgress(jobId: string, progress: number, metadata?: any) {
  await connectToDatabase();
  
  return Job.findByIdAndUpdate(
    jobId,
    {
      $set: {
        'data.progress': progress,
        'data.metadata': { ...metadata, updatedAt: new Date() }
      }
    },
    { returnDocument: 'after' }
  );
}

// ============================================
// QUEUE STATISTICS
// ============================================

// Get queue statistics
export async function getQueueStats() {
  await connectToDatabase();
  
  const stats = await Job.aggregate([
    {
      $group: {
        _id: { type: '$type', status: '$status' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  const result: any = {
    total: 0,
    byType: {},
    byStatus: {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    }
  };
  
  stats.forEach((stat: any) => {
    const { type, status } = stat._id;
    const count = stat.count;
    
    if (!result.byType[type]) {
      result.byType[type] = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        total: 0
      };
    }
    
    result.byType[type][status] = count;
    result.byType[type].total += count;
    
    if (result.byStatus[status] !== undefined) {
      result.byStatus[status] += count;
    }
    
    result.total += count;
  });
  
  return result;
}

// Get queue status summary
export async function getQueueStatus() {
  const stats = await getQueueStats();
  
  return {
    isHealthy: stats.byStatus.failed < stats.total * 0.1,
    pendingJobs: stats.byStatus.pending,
    processingJobs: stats.byStatus.processing,
    completedJobs: stats.byStatus.completed,
    failedJobs: stats.byStatus.failed,
    totalJobs: stats.total,
    byType: stats.byType,
    currentSession: currentSessionId?.slice(-8) || null,
    sessionActive: sessionStartTime ? (Date.now() - sessionStartTime) < 30 * 60 * 1000 : false,
    timestamp: new Date().toISOString()
  };
}

// Get jobs by status
export async function getJobsByStatus(status: string, limit: number = 100) {
  await connectToDatabase();
  
  return Job.find({ status })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

// Get failed jobs with retry available
export async function getRetryableJobs() {
  await connectToDatabase();
  
  return Job.find({
    status: 'failed',
    $expr: { $lt: ['$retries', '$maxRetries'] }
  }).sort({ updatedAt: -1 });
}

// Clean old jobs
export async function cleanOldJobs(daysOld: number = 7) {
  await connectToDatabase();
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  const result = await Job.deleteMany({
    status: { $in: ['completed', 'failed'] },
    completedAt: { $lt: cutoffDate }
  });
  
  logger.info(`🧹 Cleaned up ${result.deletedCount} old jobs`);
  
  return result;
}

// Retry failed jobs
export async function retryFailedJobs(type?: string) {
  await connectToDatabase();
  
  const query: any = { 
    status: 'failed', 
    $expr: { $lt: ['$retries', '$maxRetries'] }
  };
  
  if (type) query.type = type;
  
  const jobs = await Job.find(query);
  
  for (const job of jobs) {
    await Job.findByIdAndUpdate(job._id, {
      status: 'pending',
      error: null,
      updatedAt: new Date()
    });
  }
  
  logger.info(`🔄 Retrying ${jobs.length} failed jobs`);
  
  return jobs.length;
}

// Cancel a running job
export async function cancelJob(jobId: string) {
  await connectToDatabase();
  
  const job = await Job.findByIdAndUpdate(
    jobId,
    {
      status: 'failed',
      error: 'Job cancelled by user',
      completedAt: new Date()
    },
    { returnDocument: 'after' }
  );
  
  if (job) {
    logger.info(`🛑 Job cancelled: ${jobId}`);
  }
  
  return job;
}

// Pause queue for a type
export async function pauseQueue(type: string) {
  await connectToDatabase();
  
  const result = await Job.updateMany(
    { type, status: 'pending' },
    { status: 'delayed' }
  );
  
  logger.info(`⏸️ Paused queue for ${type}, delayed ${result.modifiedCount} jobs`);
  
  return result;
}

// Resume queue for a type
export async function resumeQueue(type: string) {
  await connectToDatabase();
  
  const result = await Job.updateMany(
    { type, status: 'delayed' },
    { status: 'pending' }
  );
  
  logger.info(`▶️ Resumed queue for ${type}, reactivated ${result.modifiedCount} jobs`);
  
  return result;
}

// Get queue health metrics
export async function getQueueHealth() {
  const stats = await getQueueStats();
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60000);
  
  await connectToDatabase();
  
  const stalledJobs = await Job.find({
    status: 'processing',
    startedAt: { $lt: fiveMinutesAgo }
  });
  
  for (const job of stalledJobs) {
    await Job.findByIdAndUpdate(job._id, {
      status: 'pending',
      error: `Job stalled and was reset (started at ${job.startedAt})`
    });
    
    logger.warn(`⚠️ Job ${job._id} was stalled, reset to pending`);
  }
  
  return {
    healthy: stalledJobs.length === 0 && stats.byStatus.failed < stats.total * 0.1,
    totalJobs: stats.total,
    stalledJobs: stalledJobs.length,
    pendingJobs: stats.byStatus.pending,
    processingJobs: stats.byStatus.processing,
    failedJobs: stats.byStatus.failed,
    successRate: stats.total > 0 
      ? Math.round((stats.byStatus.completed / stats.total) * 100) 
      : 100,
    recoveredStalled: stalledJobs.length,
    currentSession: currentSessionId?.slice(-8) || null
  };
}

// Clean up on process exit
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    console.log('\n🧹 Cleaning up queue before exit...');
    await clearOldJobs();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n🧹 Cleaning up queue before exit...');
    await clearOldJobs();
    process.exit(0);
  });
}