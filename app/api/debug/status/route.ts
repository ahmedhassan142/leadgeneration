// app/api/debug/status/route.ts - UPDATED with processor status
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/connect';
import { Job } from '@/lib/db/models/Job';
import { Lead } from '@/lib/db/models/Lead';

declare global {
  var microBatchRunning: boolean | undefined;
  var microBatchStartTime: number | undefined;
  var currentWaveStats: {
    waveNumber: number;
    totalLeads: number;
    analyzeDone: number;
    emailDone: number;
    scoreDone: number;
    hotLeads: number;
  } | undefined;
  var processorConfig: {
    waveSize: number;
    maxWorkers: number;
  } | undefined;
}

export async function GET() {
  await connectToDatabase();

  // Get all job counts
  const [
    totalLeads,
    hotLeads,
    warmLeads,
    coldLeads,
    rawLeads,
    analyzedLeads,
    scoredLeads,
    pendingJobs,
    processingJobs,
    completedJobs,
    failedJobs,
    pendingAnalyze,
    pendingEmail,
    pendingScore,
    processingAnalyze,
    processingEmail,
    processingScore,
    recentJobs
  ] = await Promise.all([
    Lead.countDocuments(),
    Lead.countDocuments({ quality: 'hot' }),
    Lead.countDocuments({ quality: 'warm' }),
    Lead.countDocuments({ quality: 'cold' }),
    Lead.countDocuments({ status: 'raw' }),
    Lead.countDocuments({ status: 'analyzed' }),
    Lead.countDocuments({ status: 'scored' }),
    Job.countDocuments({ status: 'pending' }),
    Job.countDocuments({ status: 'processing' }),
    Job.countDocuments({ status: 'completed' }),
    Job.countDocuments({ status: 'failed' }),
    Job.countDocuments({ type: 'analyze', status: 'pending' }),
    Job.countDocuments({ type: 'email', status: 'pending' }),
    Job.countDocuments({ type: 'score', status: 'pending' }),
    Job.countDocuments({ type: 'analyze', status: 'processing' }),
    Job.countDocuments({ type: 'email', status: 'processing' }),
    Job.countDocuments({ type: 'score', status: 'processing' }),
    Job.find().sort({ createdAt: -1 }).limit(20).lean()
  ]);

  // Get processor status from global
  const processorRunning = global.microBatchRunning || false;
  const processorStartTime = global.microBatchStartTime;
  const waveStats = global.currentWaveStats;
  const config = global.processorConfig || { waveSize: 20, maxWorkers: 5 };

  // Calculate wave progress
  let waveProgress = {
    currentWave: waveStats?.waveNumber || 1,
    totalLeads: waveStats?.totalLeads || 0,
    analyzeDone: waveStats?.analyzeDone || 0,
    emailDone: waveStats?.emailDone || 0,
    scoreDone: waveStats?.scoreDone || 0,
    hotLeads: waveStats?.hotLeads || 0,
    progressPercent: 0
  };

  if (waveStats && waveStats.totalLeads > 0) {
    waveProgress.progressPercent = Math.round((waveStats.scoreDone / waveStats.totalLeads) * 100);
  }

  // Get job counts by type
  const jobCounts = {
    analyze: {
      pending: pendingAnalyze,
      processing: processingAnalyze,
      completed: await Job.countDocuments({ type: 'analyze', status: 'completed' }),
      failed: await Job.countDocuments({ type: 'analyze', status: 'failed' })
    },
    email: {
      pending: pendingEmail,
      processing: processingEmail,
      completed: await Job.countDocuments({ type: 'email', status: 'completed' }),
      failed: await Job.countDocuments({ type: 'email', status: 'failed' })
    },
    score: {
      pending: pendingScore,
      processing: processingScore,
      completed: await Job.countDocuments({ type: 'score', status: 'completed' }),
      failed: await Job.countDocuments({ type: 'score', status: 'failed' })
    },
    scrape: {
      pending: await Job.countDocuments({ type: 'scrape', status: 'pending' }),
      processing: await Job.countDocuments({ type: 'scrape', status: 'processing' }),
      completed: await Job.countDocuments({ type: 'scrape', status: 'completed' }),
      failed: await Job.countDocuments({ type: 'scrape', status: 'failed' })
    }
  };

  const totalJobs = pendingJobs + processingJobs + completedJobs + failedJobs;

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    
    // ✅ Processor Status
    processor: {
      running: processorRunning,
      started: processorRunning,
      type: 'micro-batch',
      workers: config.maxWorkers,
      waveSize: config.waveSize,
      startTime: processorStartTime ? new Date(processorStartTime).toISOString() : null,
      uptime: processorStartTime ? Math.round((Date.now() - processorStartTime) / 1000) : 0,
      uptimeFormatted: processorStartTime 
        ? `${Math.floor((Date.now() - processorStartTime) / 60000)}m ${Math.floor(((Date.now() - processorStartTime) % 60000) / 1000)}s`
        : '0m 0s',
      message: processorRunning 
        ? `✅ Processing with ${config.maxWorkers} workers, ${config.waveSize} leads per wave`
        : '⏳ Processor stopped - Click a scrape button to start'
    },

    // ✅ Wave Progress
    waveProgress: waveProgress,

    // ✅ Job Counts by Stage
    jobs: jobCounts,

    // ✅ Summary
    summary: {
      totalJobs,
      pendingJobs,
      processingJobs,
      completedJobs,
      failedJobs,
      health: failedJobs < totalJobs * 0.1 ? 'healthy' : 'degraded'
    },

    // ✅ Lead Stats
    leads: {
      total: totalLeads,
      raw: rawLeads,
      analyzed: analyzedLeads,
      scored: scoredLeads,
      byQuality: {
        hot: hotLeads,
        warm: warmLeads,
        cold: coldLeads
      }
    },

    // ✅ Recent Jobs
    recentJobs: recentJobs.map((job: any) => ({
      id: job._id,
      type: job.type,
      status: job.status,
      data: job.data,
      createdAt: job.createdAt,
      completedAt: job.completedAt
    }))
  });
}