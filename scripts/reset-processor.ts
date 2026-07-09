// scripts/reset-processor.ts
import connectToDatabase from '@/lib/db/connect';
import { Job } from '@/lib/db/models/Job';

async function resetProcessor() {
  console.log('\n' + '='.repeat(60));
  console.log('🔄 PROCESSOR STATE RESET');
  console.log('='.repeat(60));
  
  await connectToDatabase();
  
  // Find stuck processing jobs (older than 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  const stuckJobs = await Job.find({
    status: 'processing',
    startedAt: { $lt: fiveMinutesAgo }
  });
  
  if (stuckJobs.length > 0) {
    console.log(`\n📊 Found ${stuckJobs.length} stuck jobs:`);
    stuckJobs.forEach(job => {
      const started = job.startedAt ? new Date(job.startedAt).toLocaleTimeString() : 'unknown';
      console.log(`   ├─ ${job.type} job (started at ${started})`);
    });
    
    // Reset them to pending
    const result = await Job.updateMany(
      { status: 'processing', startedAt: { $lt: fiveMinutesAgo } },
      { 
        status: 'pending',
        $inc: { retries: 1 },
        error: 'Job timed out and was reset'
      }
    );
    
    console.log(`\n✅ Reset ${result.modifiedCount} stuck jobs to pending`);
  } else {
    console.log('\n✅ No stuck jobs found');
  }
  
  // Also reset any jobs with too many retries
  const maxRetryJobs = await Job.find({
    $expr: { $gte: ['$retries', '$maxRetries'] },
    status: { $in: ['pending', 'processing'] }
  });
  
  if (maxRetryJobs.length > 0) {
    console.log(`\n📊 Found ${maxRetryJobs.length} jobs with max retries exceeded`);
    
    for (const job of maxRetryJobs) {
      job.status = 'failed';
      job.error = 'Max retries exceeded';
      await job.save();
    }
    
    console.log(`✅ Marked ${maxRetryJobs.length} jobs as failed`);
  }
  
  console.log('\n✅ Processor state reset complete\n');
  process.exit(0);
}

resetProcessor().catch(console.error);