// workers/social-enrich-worker.ts
import connectToDatabase from '@/lib/db/connect';
import { Job } from '@/lib/db/models/Job';
import { enrichLeadWithSocialData } from '../../lib/scraper/linkedinAlternatives';

console.log('👥 Social Enrichment Worker Started');

async function processSocialEnrichment() {
  await connectToDatabase();
  
  const job = await Job.findOneAndUpdate(
    { type: 'social-enrich', status: 'pending' },
    { status: 'processing', updatedAt: new Date() },
    { sort: { createdAt: 1 }, new: true }
  );
  
  if (job) {
    console.log(`📦 Processing social enrichment job: ${job._id}`);
    
    try {
      const result = await enrichLeadWithSocialData(job.data.leadId);
      
      await Job.findByIdAndUpdate(job._id, {
        status: 'completed',
        result,
        completedAt: new Date()
      });
      
      console.log(`✅ Social enrichment completed for ${job.data.leadId}`);
      
    } catch (error) {
      console.error(`❌ Job ${job._id} failed:`, error);
      await Job.findByIdAndUpdate(job._id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date()
      });
    }
  }
}

// Run every 10 seconds
setInterval(processSocialEnrichment, 10000);
processSocialEnrichment();