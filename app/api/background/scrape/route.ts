// app/api/background/scrape/route.ts
import { NextResponse } from 'next/server';
import { addJob } from '@/lib/queue/mongo-queue';
import { logger } from '@/lib/scraper/utils/logger';
import { NICHES } from '@/lib/constants/niches';

export const maxDuration = 300; // 5 minutes for Vercel
export const dynamic = 'force-dynamic';

// Valid niche types
type NicheType = 'real-estate' | 'restaurant' | 'financial';

// Validation function
function validateNiche(niche: string): niche is NicheType {
  return ['real-estate', 'restaurant', 'financial'].includes(niche);
}

// POST /api/background/scrape - Start a scraping job
export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { niche, location, source = 'both' } = body;

    // Validate required fields
    if (!niche || !location) {
      logger.warn('Scrape API: Missing required fields', { niche, location });
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          details: 'niche and location are required'
        },
        { status: 400 }
      );
    }

    // Validate niche
    if (!validateNiche(niche)) {
      logger.warn('Scrape API: Invalid niche', { niche });
      return NextResponse.json(
        { 
          error: 'Invalid niche',
          details: 'niche must be: real-estate, restaurant, or financial'
        },
        { status: 400 }
      );
    }

    // Validate source
    if (!['google', 'yellowpages', 'both'].includes(source)) {
      logger.warn('Scrape API: Invalid source', { source });
      return NextResponse.json(
        { 
          error: 'Invalid source',
          details: 'source must be: google, yellowpages, or both'
        },
        { status: 400 }
      );
    }

    logger.info('🎯 Scrape job requested', { 
      niche, 
      location, 
      source,
      timestamp: new Date().toISOString()
    });

    // Add job to queue
    const job = await addJob('scrape', {
      niche,
      location,
      source,
      requestedAt: new Date().toISOString()
    });

    const processingTime = Date.now() - startTime;

    logger.info('✅ Scrape job queued successfully', {
      jobId: job._id.toString(),
      niche,
      location,
      source,
      processingTime: `${processingTime}ms`
    });

    return NextResponse.json({
      success: true,
      message: `Scraping job queued for ${niche} in ${location}`,
      jobId: job._id.toString(),
      details: {
        niche,
        location,
        source,
        queuedAt: new Date().toISOString(),
        estimatedCompletion: new Date(Date.now() + 5 * 60000).toISOString() // +5 min
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error('❌ Failed to queue scrape job', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${processingTime}ms`
    });

    return NextResponse.json(
      { 
        error: 'Failed to queue scrape job',
        details: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// GET /api/background/scrape - Get scraping status or available niches
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const action = searchParams.get('action');

    // Return available niches
    if (action === 'niches') {
      return NextResponse.json({
        niches: NICHES.filter(n => ['real-estate', 'restaurant', 'financial'].includes(n.id)),
        sources: ['google', 'yellowpages', 'both']
      });
    }

    // Get job status
    if (jobId) {
      const { Job } = await import('@/lib/db/models/Job');
      await (await import('@/lib/db/connect')).default();
      
      const job = await Job.findById(jobId);
      
      if (!job) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        jobId: job._id,
        status: job.status,
        type: job.type,
        data: job.data,
        result: job.result,
        error: job.error,
        createdAt: job.createdAt,
        completedAt: job.completedAt
      });
    }

    // Return default info
    return NextResponse.json({
      message: 'Scrape API is running',
      endpoints: {
        POST: 'Start a new scrape job',
        GET: 'Get job status or available niches'
      },
      examples: {
        POST: {
          niche: 'real-estate',
          location: 'Austin, TX',
          source: 'both'
        },
        GET: '/api/background/scrape?jobId=123'
      }
    });

  } catch (error) {
    logger.error('❌ Failed to get scrape status', error);
    return NextResponse.json(
      { error: 'Failed to get scrape status' },
      { status: 500 }
    );
  }
}

// DELETE /api/background/scrape - Cancel a scraping job
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId is required' },
        { status: 400 }
      );
    }

    const { Job } = await import('@/lib/db/models/Job');
    await (await import('@/lib/db/connect')).default();

    const job = await Job.findByIdAndUpdate(jobId, {
      status: 'failed',
      error: 'Job cancelled by user',
      completedAt: new Date()
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    logger.info('🛑 Scrape job cancelled', { jobId });

    return NextResponse.json({
      success: true,
      message: 'Job cancelled successfully',
      jobId
    });

  } catch (error) {
    logger.error('❌ Failed to cancel job', error);
    return NextResponse.json(
      { error: 'Failed to cancel job' },
      { status: 500 }
    );
  }
}