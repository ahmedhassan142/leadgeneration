// app/api/debug/retry-failed/route.ts
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/connect';
import { Job } from '@/lib/db/models/Job';

export async function POST() {
  try {
    await connectToDatabase();
    
    // Find failed jobs that can be retried
    const failedJobs = await Job.find({
      status: 'failed',
      retries: { $lt: 3 } // Less than max retries
    });
    
    let retried = 0;
    for (const job of failedJobs) {
      job.status = 'pending';
      job.error = null;
      job.retries += 1;
      await job.save();
      retried++;
    }
    
    return NextResponse.json({
      success: true,
      retried,
      message: `Retried ${retried} failed jobs`
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to retry jobs' },
      { status: 500 }
    );
  }
}