// lib/queue/micro-batch-processor.ts - FIXED (removed aiDone)
import connectToDatabase from '@/lib/db/connect';
import { Job } from '../db/models/Job';
import { Lead } from '../db/models/Lead';
import { analyzeWebsite } from '@/lib/analyzer/website-Analyzer';
import { extractEmails } from '@/lib/analyzer/emailExtractor';
import { calculateScore } from '@/lib/scoring/leadScorer';
import { addJob } from './mongo-queue';
import { logger } from '@/lib/scraper/utils/logger';

// ✅ Initial message - shows once on server start
console.log('\n' + '='.repeat(70));
console.log('🚀 MICRO-BATCH PROCESSOR (UI/SEO + EMAIL + SCORING)');
console.log('📊 5 Parallel Workers | 20-100 Leads per Wave');
console.log('🎨 UI Detection via Impeccable | SEO via Cheerio');
console.log('📧 Email Extraction | 📊 Direct Lead Scoring');
console.log('⚠️  WAITING FOR SCRAPE TRIGGER - Click a button to start');
console.log('='.repeat(70) + '\n');

// ============================================
// GLOBAL STATS FOR API - FIXED (NO aiDone)
// ============================================
declare global {
  var microBatchRunning: boolean | undefined;
  var microBatchStartTime: number | undefined;
  var currentWaveStats: {
    waveNumber: number;
    totalLeads: number;
    analyzeDone: number;
    emailDone: number;
    // ✅ REMOVED aiDone
    scoreDone: number;
    hotLeads: number;
  } | undefined;
  var processorConfig: {
    waveSize: number;
    maxWorkers: number;
  } | undefined;
}

// ============================================
// CONFIGURATION
// ============================================
let CONFIG = {
  waveSize: 20,
  maxWorkers: 5
};

global.processorConfig = CONFIG;

// ============================================
// STATS TRACKING
// ============================================
let stats = {
  jobsProcessed: 0,
  hotLeads: 0,
  startTime: 0,
  waves: { current: 1 },
  workers: { 
    active: new Set<string>(),
    max: CONFIG.maxWorkers 
  }
};

let isProcessing = false;
let processorInterval: NodeJS.Timeout | null = null;
let isStarted = false;

// Track wave leads with status (NO AI)
interface WaveLead {
  id: string;
  analyzeDone: boolean;
  emailDone: boolean;
  // ✅ REMOVED aiDone
  scoreDone: boolean;
}

let currentWaveLeads: Map<string, WaveLead> = new Map();
let waveStartTime: number = 0;

// ✅ FIXED: Removed aiDone from global stats
global.currentWaveStats = {
  waveNumber: 1,
  totalLeads: 0,
  analyzeDone: 0,
  emailDone: 0,
  // ✅ REMOVED aiDone
  scoreDone: 0,
  hotLeads: 0
};

// ============================================
// CONFIGURATION FUNCTIONS
// ============================================

export function setWaveSize(size: number): boolean {
  const validSizes = [20, 40, 60, 80, 100];
  if (!validSizes.includes(size)) return false;
  
  CONFIG.waveSize = size;
  global.processorConfig = CONFIG;
  console.log(`\n📊 Wave size set to: ${size} leads per wave`);
  return true;
}

export function setMaxWorkers(workers: number): boolean {
  if (workers < 1 || workers > 10) return false;
  
  CONFIG.maxWorkers = workers;
  stats.workers.max = workers;
  global.processorConfig = CONFIG;
  console.log(`\n👥 Max workers set to: ${workers}`);
  return true;
}

export function getConfig() {
  return { ...CONFIG };
}

export function autoConfigure() {
  setMaxWorkers(5);
  setWaveSize(20);
  console.log(`\n🔧 Auto-configured: 5 workers, 20 leads per wave`);
  return CONFIG;
}

// ============================================
// AUTO-RECOVERY FOR STUCK JOBS
// ============================================
async function recoverStuckJobs() {
  try {
    await connectToDatabase();
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const stuckJobs = await Job.find({
      status: 'processing',
      startedAt: { $lt: fiveMinutesAgo }
    });
    
    if (stuckJobs.length > 0) {
      console.log(`\n🔄 Auto-recovering ${stuckJobs.length} stuck jobs...`);
      
      for (const job of stuckJobs) {
        job.status = 'pending';
        job.retries += 1;
        job.error = `Job auto-recovered after timeout`;
        await job.save();
        
        console.log(`   ✅ Recovered ${job.type} job ${job._id.toString().slice(-8)}`);
      }
    }
  } catch (error) {
    console.error('❌ Auto-recovery failed:', error);
  }
}

// Start recovery
setInterval(recoverStuckJobs, 2 * 60 * 1000);

// ============================================
// HELPER FUNCTIONS
// ============================================

function updateWaveStats() {
  if (currentWaveLeads.size > 0 && global.currentWaveStats) {
    global.currentWaveStats.analyzeDone = Array.from(currentWaveLeads.values()).filter(l => l.analyzeDone).length;
    global.currentWaveStats.emailDone = Array.from(currentWaveLeads.values()).filter(l => l.emailDone).length;
    // ✅ REMOVED aiDone
    global.currentWaveStats.scoreDone = Array.from(currentWaveLeads.values()).filter(l => l.scoreDone).length;
    global.currentWaveStats.totalLeads = currentWaveLeads.size;
  }
}

// ============================================
// CORE PROCESSING FUNCTIONS
// ============================================

async function processJobs() {
  if (!isStarted) return;
  if (isProcessing) return;
  
  isProcessing = true;
  
  try {
    await connectToDatabase();
    
    // Check if we need to start a wave
    if (currentWaveLeads.size === 0) {
      const started = await checkAndStartNewWave();
      if (started) {
        console.log(`\n✅ Wave ${stats.waves.current} started with ${currentWaveLeads.size} leads`);
      }
    }
    
    // Count pending jobs
    const pendingAnalyze = await Job.countDocuments({ type: 'analyze', status: 'pending' });
    const pendingEmail = await Job.countDocuments({ type: 'email', status: 'pending' });
    const pendingScore = await Job.countDocuments({ type: 'score', status: 'pending' });
    
    // Check if wave is complete
    if (currentWaveLeads.size > 0) {
      const allAnalyzeDone = Array.from(currentWaveLeads.values()).every(l => l.analyzeDone);
      const allEmailDone = Array.from(currentWaveLeads.values()).every(l => l.emailDone);
      const allScoreDone = Array.from(currentWaveLeads.values()).every(l => l.scoreDone);
      
      if (allAnalyzeDone && allEmailDone && allScoreDone) {
        const waveDuration = Math.round((Date.now() - waveStartTime) / 1000);
        console.log(`\n✅ WAVE ${stats.waves.current} COMPLETE in ${waveDuration}s`);
        console.log(`   Total Leads: ${currentWaveLeads.size}`);
        console.log(`   Hot Leads: ${stats.hotLeads - (global.currentWaveStats?.hotLeads || 0)}`);
        
        stats.waves.current++;
        currentWaveLeads.clear();
        waveStartTime = 0;
        
        // Stop processor when wave is complete
        if (pendingAnalyze === 0 && pendingEmail === 0 && pendingScore === 0) {
          console.log(`\n🛑 All jobs complete - stopping processor...`);
          stopMicroBatchProcessor();
        }
      }
    }
    
    // Get pending jobs
    const pendingJobs = await Job.find({
      status: 'pending',
      $expr: { $lt: ['$retries', '$maxRetries'] }
    }).sort({ createdAt: 1 }).limit(50);
    
    if (pendingJobs.length === 0) {
      if (currentWaveLeads.size === 0) {
        console.log(`\n🛑 No jobs pending - stopping processor...`);
        stopMicroBatchProcessor();
      }
      isProcessing = false;
      return;
    }
    
    console.log(`\n🔄 PROCESSING ${pendingJobs.length} jobs with ${CONFIG.maxWorkers} workers`);
    console.log(`   Analyze: ${pendingAnalyze} | Email: ${pendingEmail} | Score: ${pendingScore}`);
    
    // Process jobs in parallel
    const jobQueue = [...pendingJobs];
    const activePromises: Promise<void>[] = [];
    
    while (jobQueue.length > 0 || activePromises.length > 0) {
      while (stats.workers.active.size < CONFIG.maxWorkers && jobQueue.length > 0) {
        const job = jobQueue.shift()!;
        const workerId = `worker-${Date.now()}-${Math.random()}`;
        stats.workers.active.add(workerId);
        
        console.log(`   🚀 Worker ${stats.workers.active.size}/${CONFIG.maxWorkers} starting ${job.type} job`);
        
        const promise = processJob(job).finally(() => {
          stats.workers.active.delete(workerId);
          const index = activePromises.indexOf(promise);
          if (index > -1) activePromises.splice(index, 1);
        });
        
        activePromises.push(promise);
      }
      
      if (activePromises.length > 0) {
        await Promise.race(activePromises);
      }
    }
    
  } catch (error: any) {
    logger.error(`❌ Processor error`, { error: error.message });
  } finally {
    isProcessing = false;
  }
}

async function checkAndStartNewWave(): Promise<boolean> {
  const leadsWithJobs = await Job.distinct('data.leadId', {
    type: { $in: ['analyze', 'email', 'score'] },
    status: { $in: ['pending', 'processing'] }
  });
  
  const leads = await Lead.find({
    $or: [
      { status: 'raw', analyzedAt: { $exists: false } },
      { _id: { $in: leadsWithJobs } }
    ]
  }).limit(CONFIG.waveSize);
  
  if (leads.length === 0) return false;
  
  const rawLeads = leads.filter(l => l.status === 'raw' && !l.analyzedAt);
  for (const lead of rawLeads) {
    await addJob('analyze', {
      leadId: lead._id.toString(),
      website: lead.website,
      source: lead.source || 'serp_api'
    });
  }
  
  await startNewWave(leads);
  return true;
}

async function startNewWave(leads: any[]) {
  currentWaveLeads.clear();
  waveStartTime = Date.now();
  
  for (const lead of leads) {
    currentWaveLeads.set(lead._id.toString(), {
      id: lead._id.toString(),
      analyzeDone: false,
      emailDone: false,
      scoreDone: false
    });
  }
  
  // ✅ FIXED: Removed aiDone
  global.currentWaveStats = {
    waveNumber: stats.waves.current,
    totalLeads: currentWaveLeads.size,
    analyzeDone: 0,
    emailDone: 0,
    scoreDone: 0,
    hotLeads: stats.hotLeads
  };
  
  console.log(`\n📦 NEW WAVE ${stats.waves.current} STARTED with ${currentWaveLeads.size} leads`);
  console.log(`   Wave size: ${CONFIG.waveSize} | Workers: ${CONFIG.maxWorkers}`);
}

async function processJob(job: any) {
  const startTime = Date.now();
  const leadId = job.data.leadId;
  
  console.log(`   👤 Worker processing ${job.type.toUpperCase()}: ${job._id.toString().slice(-8)}`);
  
  try {
    job.status = 'processing';
    job.startedAt = new Date();
    await job.save();
    
    if (!currentWaveLeads.has(leadId)) {
      const lead = await Lead.findById(leadId);
      if (lead) {
        currentWaveLeads.set(leadId, {
          id: leadId,
          analyzeDone: false,
          emailDone: false,
          scoreDone: false
        });
        console.log(`   📝 Added missing lead ${leadId.slice(-6)} to wave tracking`);
      }
    }
    
    let result;
    
    switch (job.type) {
      case 'analyze':
        console.log(`      🌐 Analyzing website (UI + SEO + Design): ${job.data.website?.substring(0, 50)}...`);
        result = await analyzeWebsite(job.data.website);
        
        await Lead.findByIdAndUpdate(
          leadId, 
          { 
            status: 'analyzed',
            analyzedAt: new Date(),
            'analysis.uiModernScore': result.uiModernScore,
            'analysis.isModernDesign': result.isModernDesign,
            'analysis.outdatedElements': result.outdatedElements,
            'analysis.designIssues': result.designIssues,
            'analysis.uiRecommendations': result.uiRecommendations,
            'analysis.seoScore': result.score,
            'analysis.metaTags': result.metaTags,
            'analysis.hasSSL': result.hasSSL,
            'analysis.isMobileFriendly': result.isMobileFriendly,
            'analysis.loadTime': result.loadTime
          },
          { returnDocument: 'after' }
        );
        
        await addJob('email', {
          leadId,
          website: job.data.website,
          source: job.data.source
        });
        
        const waveLead = currentWaveLeads.get(leadId);
        if (waveLead) {
          waveLead.analyzeDone = true;
          updateWaveStats();
        }
        break;
        
      case 'email':
        console.log(`      📧 Extracting emails from: ${job.data.website?.substring(0, 50)}...`);
        result = await extractEmails(leadId, job.data.website);
        
        await addJob('score', { 
          leadId, 
          source: job.data.source,
          emailCount: result?.count || 0,
          emailsFound: result?.emailsFound || []
        });
        
        await Lead.findByIdAndUpdate(
          leadId,
          { 
            emailsExtracted: true,
            emailCount: result?.count || 0,
            emails: result?.emailsFound || [],
            callNeeded: result?.callNeeded || false,
            callPriority: result?.callPriority || 'low',
            callStatus: result?.callNeeded ? 'pending' : 'not_needed'
          },
          { returnDocument: 'after' }
        );
        
        const waveLeadEmail = currentWaveLeads.get(leadId);
        if (waveLeadEmail) {
          waveLeadEmail.emailDone = true;
          updateWaveStats();
        }
        break;
        
      case 'score':
        console.log(`      📊 Scoring lead: ${leadId.slice(-6)}`);
        result = await calculateScore(leadId);
        
        if (result.quality === 'hot') {
          stats.hotLeads++;
          if (global.currentWaveStats) {
            global.currentWaveStats.hotLeads++;
          }
          console.log(`      🔥 HOT LEAD! Score: ${result.score}, Quality: ${result.quality}`);
        } else {
          console.log(`      📊 Lead scored: ${result.score}/100 (${result.quality})`);
        }
        
        await Lead.findByIdAndUpdate(
          leadId,
          {
            status: 'scored',
            quality: result.quality,
            score: result.score,
            scoredAt: new Date()
          },
          { returnDocument: 'after' }
        );
        
        const waveLeadScore = currentWaveLeads.get(leadId);
        if (waveLeadScore) {
          waveLeadScore.scoreDone = true;
          updateWaveStats();
        }
        break;
    }
    
    await Job.findByIdAndUpdate(
      job._id,
      {
        status: 'completed',
        result,
        completedAt: new Date()
      },
      { returnDocument: 'after' }
    );
    
    stats.jobsProcessed++;
    
    if (currentWaveLeads.size > 0) {
      const analyzeCount = Array.from(currentWaveLeads.values()).filter(l => l.analyzeDone).length;
      const emailCount = Array.from(currentWaveLeads.values()).filter(l => l.emailDone).length;
      const scoreCount = Array.from(currentWaveLeads.values()).filter(l => l.scoreDone).length;
      
      console.log(`      📊 Wave Progress: A:${analyzeCount}/${currentWaveLeads.size} E:${emailCount} S:${scoreCount}`);
    }
    console.log(`      ✅ Done in ${Date.now() - startTime}ms`);
    
  } catch (error: any) {
    console.log(`      ❌ Failed: ${error.message}`);
    
    if (job.retries < job.maxRetries) {
      await Job.findByIdAndUpdate(
        job._id,
        {
          status: 'pending',
          $inc: { retries: 1 },
          error: error.message
        },
        { returnDocument: 'after' }
      );
      console.log(`      🔄 Will retry (${job.retries + 1}/${job.maxRetries})`);
    } else {
      await Job.findByIdAndUpdate(
        job._id,
        {
          status: 'failed',
          error: error.message,
          completedAt: new Date()
        },
        { returnDocument: 'after' }
      );
    }
  }
}

// ============================================
// ✅ MINIMAL INTERVALS
// ============================================

let statusInterval: NodeJS.Timeout | null = null;
let idleInterval: NodeJS.Timeout | null = null;

function startStatusInterval() {
  if (statusInterval) return;
  
  statusInterval = setInterval(() => {
    if (!isStarted && currentWaveLeads.size === 0) {
      return;
    }
    
    if (isStarted && stats.workers.active.size > 0) {
      const uptime = Math.round((Date.now() - stats.startTime) / 1000);
      
      Promise.race([
        Promise.all([
          Job.countDocuments({ type: 'analyze', status: 'pending' }),
          Job.countDocuments({ type: 'email', status: 'pending' }),
          Job.countDocuments({ type: 'score', status: 'pending' })
        ]),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
      ]).then(([pendingAnalyze, pendingEmail, pendingScore]: any) => {
        
        console.log('\n' + '═'.repeat(70));
        console.log(`📊 MICRO-BATCH PROCESSOR STATUS - Wave ${stats.waves.current}`);
        console.log('═'.repeat(70));
        console.log(`⏱️  Uptime: ${Math.floor(uptime / 60)}m ${uptime % 60}s`);
        console.log(`📈 Jobs processed: ${stats.jobsProcessed}`);
        console.log(`🔥 Hot leads: ${stats.hotLeads}`);
        console.log(`👥 Active workers: ${stats.workers.active.size}/${CONFIG.maxWorkers}`);
        
        if (currentWaveLeads.size > 0) {
          const analyzeCount = Array.from(currentWaveLeads.values()).filter(l => l.analyzeDone).length;
          const emailCount = Array.from(currentWaveLeads.values()).filter(l => l.emailDone).length;
          const scoreCount = Array.from(currentWaveLeads.values()).filter(l => l.scoreDone).length;
          
          console.log(`📊 Wave ${stats.waves.current} progress (${currentWaveLeads.size} leads):`);
          console.log(`   ✅ Analyze (UI/SEO): ${analyzeCount}/${currentWaveLeads.size}`);
          console.log(`   📧 Email Extraction: ${emailCount}/${currentWaveLeads.size}`);
          console.log(`   📊 Lead Scoring: ${scoreCount}/${currentWaveLeads.size}`);
          console.log(`   🔥 Hot leads in wave: ${global.currentWaveStats?.hotLeads || 0}`);
          
          if (global.currentWaveStats) {
            global.currentWaveStats.analyzeDone = analyzeCount;
            global.currentWaveStats.emailDone = emailCount;
            global.currentWaveStats.scoreDone = scoreCount;
          }
        } else {
          console.log(`📊 No active wave - waiting for leads`);
        }
        
        console.log(`📊 Pending jobs:`);
        console.log(`   Analyze (UI/SEO): ${pendingAnalyze}`);
        console.log(`   Email Extraction: ${pendingEmail}`);
        console.log(`   Lead Scoring: ${pendingScore}`);
        console.log('═'.repeat(70) + '\n');
      }).catch(() => {});
    }
    
  }, 60000);
}

function startIdleInterval() {
  if (idleInterval) return;
  
  let idleCounter = 0;
  
  idleInterval = setInterval(() => {
    if (!isStarted && currentWaveLeads.size === 0) {
      idleCounter++;
      if (idleCounter % 2 === 0) {
        console.log('\n' + '═'.repeat(70));
        console.log(`⏳ MICRO-BATCH PROCESSOR - WAITING FOR SCRAPE TRIGGER`);
        console.log('═'.repeat(70));
        console.log(`📋 Click a scrape button to start processing`);
        console.log(`📊 Configuration: ${CONFIG.maxWorkers} workers, ${CONFIG.waveSize} leads per wave`);
        console.log('═'.repeat(70) + '\n');
      }
    } else {
      idleCounter = 0;
    }
  }, 300000);
}

// Start idle interval only
startIdleInterval();

// ============================================
// EXPORT FUNCTIONS
// ============================================

export function startMicroBatchProcessor() {
  if (isStarted) {
    console.log('📦 Micro-batch processor already running');
    global.microBatchRunning = true;
    return;
  }
  
  console.log('🚀 Starting micro-batch processor...');
  console.log(`📊 Configuration: ${CONFIG.maxWorkers} workers, ${CONFIG.waveSize} leads per wave`);
  console.log(`🎨 Features: UI/Design detection, SEO analysis, Email extraction, Lead scoring`);
  
  isStarted = true;
  stats.startTime = Date.now();
  global.microBatchRunning = true;
  global.microBatchStartTime = Date.now();
  global.processorConfig = CONFIG;
  global.currentWaveStats = {
    waveNumber: 1,
    totalLeads: 0,
    analyzeDone: 0,
    emailDone: 0,
    scoreDone: 0,
    hotLeads: 0
  };
  
  if (!processorInterval) {
    processorInterval = setInterval(processJobs, 3000);
  }
  processJobs();
  
  startStatusInterval();
  
  console.log(`✅ Micro-batch processor started at ${new Date().toLocaleTimeString()}`);
  
  setTimeout(recoverStuckJobs, 5000);
}

export function stopMicroBatchProcessor() {
  if (processorInterval) {
    clearInterval(processorInterval);
    processorInterval = null;
    isStarted = false;
    global.microBatchRunning = false;
    console.log('🛑 Micro-batch processor stopped');
  }
}

export function isProcessorStarted(): boolean {
  return isStarted;
}

export function getWaveStats() {
  return {
    currentWave: stats.waves.current,
    waveLeads: currentWaveLeads.size,
    waveStats: global.currentWaveStats,
    jobsProcessed: stats.jobsProcessed,
    hotLeads: stats.hotLeads,
    activeWorkers: stats.workers.active.size
  };
}

// ============================================
// CLEANUP ON PROCESS EXIT
// ============================================
process.on('SIGINT', () => {
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
  if (idleInterval) {
    clearInterval(idleInterval);
    idleInterval = null;
  }
  if (processorInterval) {
    clearInterval(processorInterval);
    processorInterval = null;
  }
  console.log('\n🛑 Processor cleaned up on exit');
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
  if (idleInterval) {
    clearInterval(idleInterval);
    idleInterval = null;
  }
  if (processorInterval) {
    clearInterval(processorInterval);
    processorInterval = null;
  }
  console.log('\n🛑 Processor cleaned up on termination');
  process.exit(0);
});