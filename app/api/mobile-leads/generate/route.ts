// app/api/mobile-leads/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { mobileAppLeadGenerator } from '@/lib/scraper/MobileScraper';
import { logger } from '@/lib/scraper/utils/logger';

// Store active generation jobs
const activeJobs = new Map();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      categories = ['finance', 'business', 'health', 'education', 'shopping', 'food'],
      countries = ['us', 'ca', 'gb', 'au'],
      maxAppsPerCategory = 100,
      debug = true 
    } = body;

    // Generate unique job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Start generation in background (don't await)
    const generationPromise = mobileAppLeadGenerator.generateLeads({
      categories,
      countries,
      maxAppsPerCategory,
      debug
    }).then(result => {
      // Store result when done
      activeJobs.set(jobId, {
        status: 'completed',
        result,
        completedAt: new Date().toISOString()
      });
      
      // Clean up after 1 hour
      setTimeout(() => activeJobs.delete(jobId), 60 * 60 * 1000);
      
      return result;
    }).catch(error => {
      activeJobs.set(jobId, {
        status: 'failed',
        error: error.message,
        failedAt: new Date().toISOString()
      });
    });

    // Store initial job status
    activeJobs.set(jobId, {
      status: 'running',
      startedAt: new Date().toISOString(),
      promise: generationPromise
    });

    return NextResponse.json({
      success: true,
      message: 'Lead generation started',
      jobId,
      status: 'running',
      config: { categories, countries, maxAppsPerCategory }
    });

  } catch (error:any) {
    logger.error('Failed to start lead generation:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to check job status
export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId');
  
  if (!jobId) {
    return NextResponse.json(
      { success: false, error: 'jobId required' },
      { status: 400 }
    );
  }

  const job = activeJobs.get(jobId);
  
  if (!job) {
    return NextResponse.json(
      { success: false, error: 'Job not found' },
      { status: 404 }
    );
  }

  // Don't send the promise in response
  const { promise, ...jobInfo } = job;
  
  return NextResponse.json({
    success: true,
    job: jobInfo
  });
}