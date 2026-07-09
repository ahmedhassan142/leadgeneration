// app/api/debug/processor-status/route.ts - FIXED - NO AUTO-START
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/connect';
import { Job } from '@/lib/db/models/Job';

declare global {
  var microBatchRunning: boolean | undefined;
  var microBatchStartTime: number | undefined;
}

export async function GET() {
  try {
    // ✅ Just read status - DON'T execute any commands
    await connectToDatabase();
    
    const pendingJobs = await Job.countDocuments({ status: 'pending' });
    const processingJobs = await Job.countDocuments({ status: 'processing' });
    const completedJobs = await Job.countDocuments({ status: 'completed' });
    const failedJobs = await Job.countDocuments({ status: 'failed' });
    
    // Get last activity
    const lastJob = await Job.findOne().sort({ createdAt: -1 }).lean();
    
    const isRunning = global.microBatchRunning || false;
    const startTime = global.microBatchStartTime;
    
    return NextResponse.json({
      processorRunning: isRunning,
      details: isRunning 
        ? 'Processor is active' 
        : 'Processor is not running - Click a scrape button to start',
      suggestion: isRunning 
        ? '✅ Processor is running - check queue status below'
        : '🎯 Click a scrape button (SERP or Local Scraper) to start the processor',
      queue: {
        pending: pendingJobs,
        processing: processingJobs,
        completed: completedJobs,
        failed: failedJobs,
        total: pendingJobs + processingJobs + completedJobs + failedJobs
      },
      startTime: startTime ? new Date(startTime).toISOString() : null,
      uptime: startTime ? Math.round((Date.now() - startTime) / 1000) : 0,
      uptimeFormatted: startTime 
        ? `${Math.floor((Date.now() - startTime) / 60000)}m ${Math.floor(((Date.now() - startTime) % 60000) / 1000)}s`
        : '0m 0s',
      lastActivity: lastJob ? {
        type: lastJob.type,
        status: lastJob.status,
        createdAt: lastJob.createdAt,
        source: lastJob.data?.source || 'unknown'
      } : null,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    return NextResponse.json({
      processorRunning: false,
      error: 'Could not check processor status',
      suggestion: 'Click a scrape button to start the processor',
      queue: {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        total: 0
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}