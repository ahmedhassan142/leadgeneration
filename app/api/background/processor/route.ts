// app/api/background/processor/route.ts
import { NextResponse } from 'next/server';
import { getNextJob, completeJob, failJob } from '@/lib/queue/mongo-queue';
import { scrapeGoogleMaps } from '@/lib/scraper/googleMapsScraper';
import { analyzeWebsite } from '@/lib/analyzer/website-Analyzer';
import { extractEmails } from '@/lib/analyzer/emailExtractor';
import { analyzeWithAI } from '@/lib/analyzer/geminiAnalyzer';
import { calculateScore } from '@/lib/scoring/leadScorer';
import { logger } from '@/lib/scraper/utils/logger';

export const maxDuration = 900;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const results = [];
  const { waitUntil } = request as any;
  
  const jobTypes = ['scrape', 'analyze', 'email', 'ai', 'score'];
  
  for (const type of jobTypes) {
    const job = await getNextJob(type);
    
    if (job) {
      waitUntil(
        (async () => {
          try {
            logger.info(`Processing ${type} job`, { jobId: job._id });
            
            let result;
            switch (type) {
              case 'scrape':
                result = await scrapeGoogleMaps(
                  job.data.niche, 
                  job.data.location, 
                  20
                );
                break;
              case 'analyze':
                result = await analyzeWebsite(
                  job.data.website
                );
                break;
              case 'email':
                result = await extractEmails(
                  job.data.leadId, 
                  job.data.website
                );
                break;
              case 'ai':
                result = await analyzeWithAI(
                  job.data.leadId, 
                  job.data.website
                );
                break;
              case 'score':
                result = await calculateScore(job.data.leadId);
                break;
            }
            
            await completeJob(job._id, result);
            logger.info(`Completed ${type} job`, { jobId: job._id });
            
          } catch (error) {
            logger.error(`Failed ${type} job`, error);
            await failJob(
              job._id, 
              error instanceof Error ? error.message : 'Unknown error'
            );
          }
        })()
      );
      
      results.push({ type, jobId: job._id, status: 'processing' });
    }
  }
  
  return NextResponse.json({ 
    processed: results.length,
    jobs: results 
  });
}