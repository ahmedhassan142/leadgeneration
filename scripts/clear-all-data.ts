// scripts/clear-all-data.ts
import connectToDatabase from '@/lib/db/connect';
import { Job } from '@/lib/db/models/Job';
import { Lead } from '@/lib/db/models/Lead';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function clearAllData() {
  console.log('\n' + '='.repeat(60));
  console.log('🗑️ COMPLETE DATA WIPE TOOL');
  console.log('='.repeat(60));
  
  await connectToDatabase();
  
  // Count before deletion
  const totalJobs = await Job.countDocuments();
  const totalLeads = await Lead.countDocuments();
  
  const jobsByStatus = await Job.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  
  const leadsByQuality = await Lead.aggregate([
    { $group: { _id: '$quality', count: { $sum: 1 } } }
  ]);
  
  const leadsByStatus = await Lead.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  
  console.log(`\n📊 CURRENT DATABASE STATUS:`);
  console.log(`\n📦 JOBS (${totalJobs}):`);
  jobsByStatus.forEach((s: any) => {
    console.log(`   ├─ ${s._id || 'unknown'}: ${s.count}`);
  });
  
  console.log(`\n👤 LEADS (${totalLeads}):`);
  console.log(`   By Quality:`);
  leadsByQuality.forEach((q: any) => {
    console.log(`      ├─ ${q._id || 'unknown'}: ${q.count}`);
  });
  console.log(`   By Status:`);
  leadsByStatus.forEach((s: any) => {
    console.log(`      ├─ ${s._id || 'unknown'}: ${s.count}`);
  });
  
  console.log('\n⚠️  DANGER: This will DELETE ALL leads and jobs!');
  console.log('Type "DELETE ALL" to confirm:');
  
  rl.question('> ', async (answer) => {
    if (answer === 'DELETE ALL') {
      // Delete all jobs
      const jobsDeleted = await Job.deleteMany({});
      // Delete all leads
      const leadsDeleted = await Lead.deleteMany({});
      
      console.log(`\n✅ Deleted ${jobsDeleted.deletedCount} jobs`);
      console.log(`✅ Deleted ${leadsDeleted.deletedCount} leads`);
      console.log('📭 Database is now empty\n');
    } else {
      console.log('\n❌ Operation cancelled\n');
    }
    
    rl.close();
    process.exit(0);
  });
}

clearAllData().catch(console.error);