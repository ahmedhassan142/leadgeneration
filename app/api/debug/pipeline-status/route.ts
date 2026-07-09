// app/api/debug/pipeline-status/route.ts - UPDATED
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/connect';
import { Lead } from '@/lib/db/models/Lead';
import { Job } from '@/lib/db/models/Job';

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

  // Get all job counts by type and status
  const jobStats = await Job.aggregate([
    {
      $group: {
        _id: { type: '$type', status: '$status' },
        count: { $sum: 1 }
      }
    }
  ]);

  const jobCounts: any = {
    scrape: { pending: 0, processing: 0, completed: 0, failed: 0 },
    analyze: { pending: 0, processing: 0, completed: 0, failed: 0 },
    email: { pending: 0, processing: 0, completed: 0, failed: 0 },
    score: { pending: 0, processing: 0, completed: 0, failed: 0 }
  };

  jobStats.forEach((stat: any) => {
    const { type, status } = stat._id;
    if (jobCounts[type]) {
      jobCounts[type][status] = stat.count;
    }
  });

  // Get pending counts
  const pendingAnalyze = await Job.countDocuments({ type: 'analyze', status: 'pending' });
  const pendingEmail = await Job.countDocuments({ type: 'email', status: 'pending' });
  const pendingScore = await Job.countDocuments({ type: 'score', status: 'pending' });

  // Get processing counts
  const processingAnalyze = await Job.countDocuments({ type: 'analyze', status: 'processing' });
  const processingEmail = await Job.countDocuments({ type: 'email', status: 'processing' });
  const processingScore = await Job.countDocuments({ type: 'score', status: 'processing' });

  // Get completed counts
  const completedAnalyze = await Job.countDocuments({ type: 'analyze', status: 'completed' });
  const completedEmail = await Job.countDocuments({ type: 'email', status: 'completed' });
  const completedScore = await Job.countDocuments({ type: 'score', status: 'completed' });

  // Get recent jobs
  const recentJobs = await Job.find()
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  // Calculate totals
  const totalJobs = await Job.countDocuments();
  const failedJobs = await Job.countDocuments({ status: 'failed' });
  const completedJobs = await Job.countDocuments({ status: 'completed' });
  const processingJobs = await Job.countDocuments({ status: 'processing' });
  const pendingJobs = await Job.countDocuments({ status: 'pending' });

  // Get lead quality stats
  const leadQualityStats = await Lead.aggregate([
    { $group: { _id: '$quality', count: { $sum: 1 } } }
  ]);

  const qualityCounts: any = { hot: 0, warm: 0, cold: 0, unknown: 0 };
  leadQualityStats.forEach((stat: any) => {
    if (stat._id) qualityCounts[stat._id] = stat.count;
    else qualityCounts.unknown = stat.count;
  });

  // Get raw leads count
  const rawLeads = await Lead.countDocuments({ status: 'raw' });

  // Get processor status
  const processorRunning = global.microBatchRunning || false;
  const processorStartTime = global.microBatchStartTime;
  const waveStats = global.currentWaveStats;
  const config = global.processorConfig || { waveSize: 20, maxWorkers: 5 };

  // Check if there are any processing jobs
  const hasProcessingJobs = jobCounts.scrape.processing > 0 ||
    jobCounts.analyze.processing > 0 ||
    jobCounts.email.processing > 0 ||
    jobCounts.score.processing > 0;

  const effectiveRunning = processorRunning || hasProcessingJobs;

  // Calculate wave progress
  let waveProgressPercent = 0;
  let estimatedTimeRemaining = null;

  if (waveStats && waveStats.totalLeads > 0) {
    waveProgressPercent = Math.round((waveStats.scoreDone / waveStats.totalLeads) * 100);
    const remainingLeads = waveStats.totalLeads - waveStats.scoreDone;
    estimatedTimeRemaining = Math.round(remainingLeads * 80 / config.maxWorkers);
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),

    // ✅ Processor Status
    processor: {
      running: effectiveRunning,
      type: 'micro-batch',
      workers: config.maxWorkers,
      waveSize: config.waveSize,
      status: effectiveRunning ? 'active' : 'waiting',
      message: !processorRunning && !hasProcessingJobs
        ? '⏳ Processor is waiting - Click a scrape button to start'
        : (effectiveRunning
          ? `✅ Processing with ${config.maxWorkers} workers, ${config.waveSize} leads per wave`
          : '⏳ Waiting for leads'),
      startedAt: processorStartTime ? new Date(processorStartTime).toISOString() : null,
      uptime: processorStartTime ? Math.round((Date.now() - processorStartTime) / 1000) : 0,
      uptimeFormatted: processorStartTime
        ? `${Math.floor((Date.now() - processorStartTime) / 60000)}m ${Math.floor(((Date.now() - processorStartTime) % 60000) / 1000)}s`
        : '0m 0s',
      hasProcessingJobs,
      config
    },

    // ✅ Current Wave Progress
    currentWave: waveStats && waveStats.totalLeads > 0 ? {
      waveNumber: waveStats.waveNumber,
      totalLeads: waveStats.totalLeads,
      waveSize: config.waveSize,
      progress: {
        analyze: waveStats.analyzeDone,
        email: waveStats.emailDone,
        score: waveStats.scoreDone
      },
      percentages: {
        analyze: Math.round((waveStats.analyzeDone / waveStats.totalLeads) * 100) || 0,
        email: Math.round((waveStats.emailDone / waveStats.totalLeads) * 100) || 0,
        score: Math.round((waveStats.scoreDone / waveStats.totalLeads) * 100) || 0
      },
      hotLeadsInWave: waveStats.hotLeads,
      overallProgress: waveProgressPercent,
      remainingLeads: waveStats.totalLeads - waveStats.scoreDone,
      estimatedTimeRemaining,
      estimatedTimeFormatted: estimatedTimeRemaining
        ? `${Math.floor(estimatedTimeRemaining / 60)}m ${estimatedTimeRemaining % 60}s`
        : null
    } : null,

    // ✅ Jobs by type
    jobs: jobCounts,

    // ✅ Pending counts
    pending: {
      analyze: pendingAnalyze,
      email: pendingEmail,
      score: pendingScore,
      total: pendingAnalyze + pendingEmail + pendingScore
    },

    // ✅ Processing counts
    processing: {
      analyze: processingAnalyze,
      email: processingEmail,
      score: processingScore,
      total: processingAnalyze + processingEmail + processingScore
    },

    // ✅ Completed counts
    completed: {
      analyze: completedAnalyze,
      email: completedEmail,
      score: completedScore,
      total: completedAnalyze + completedEmail + completedScore
    },

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
      total: await Lead.countDocuments(),
      raw: rawLeads,
      analyzed: await Lead.countDocuments({ status: 'analyzed' }),
      scored: await Lead.countDocuments({ status: 'scored' }),
      blocked: await Lead.countDocuments({ blocked: true }),
      byQuality: qualityCounts
    },

    // ✅ Recent Jobs
    recentJobs: recentJobs.map((j: any) => ({
      id: j._id,
      type: j.type,
      status: j.status,
      source: j.data?.source || 'unknown',
      createdAt: j.createdAt,
      completedAt: j.completedAt,
      duration: j.completedAt ? (new Date(j.completedAt).getTime() - new Date(j.createdAt).getTime()) : null,
      data: {
        website: j.data?.website,
        leadId: j.data?.leadId
      }
    }))
  });
}