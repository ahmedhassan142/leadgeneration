// scripts/cleanup.ts
import  connectToDatabase  from '@/lib/db/connect';
import { Lead } from '@/lib/db/models/Lead';
import { Job } from '@/lib/db/models/Job';

async function cleanup() {
  console.log('🧹 Starting cleanup...');
  
  await connectToDatabase();
  
  // Delete leads older than 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  const oldLeads = await Lead.deleteMany({
    createdAt: { $lt: ninetyDaysAgo },
    status: { $ne: 'contacted' } // Keep contacted leads
  });
  
  console.log(`✅ Deleted ${oldLeads.deletedCount} old leads`);
  
  // Delete failed jobs older than 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const oldJobs = await Job.deleteMany({
    status: 'failed',
    createdAt: { $lt: thirtyDaysAgo }
  });
  
  console.log(`✅ Deleted ${oldJobs.deletedCount} old failed jobs`);
  
  // Archive completed jobs (mark them as archived instead of deleting)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  await Job.updateMany(
    {
      status: 'completed',
      createdAt: { $lt: sevenDaysAgo }
    },
    {
      $set: { status: 'archived' }
    }
  );
  
  console.log(`✅ Archived old completed jobs`);
  
  // Remove duplicate leads (keep the one with most data)
  const duplicates = await Lead.aggregate([
    {
      $group: {
        _id: { website: '$website' },
        count: { $sum: 1 },
        ids: { $push: '$_id' }
      }
    },
    {
      $match: {
        count: { $gt: 1 }
      }
    }
  ]);
  
  for (const dup of duplicates) {
    // Keep the first one (oldest), delete others
    const [keep, ...remove] = dup.ids;
    await Lead.deleteMany({ _id: { $in: remove } });
    console.log(`✅ Removed ${remove.length} duplicates for ${dup._id.website}`);
  }
  
  console.log('🧹 Cleanup complete!');
}

cleanup()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  });