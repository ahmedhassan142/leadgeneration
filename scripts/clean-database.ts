// scripts/remove-all-leads.ts
import mongoose from 'mongoose';
import { Lead } from '@/lib/db/models/Lead';
import { Outreach } from '@/lib/db/models/Outreach';
import { Sequence } from '@/lib/db/models/Sequence';

const MONGODB_URI = 'mongodb+srv://ah770643:PASSWORD_REMOVED@cluster0.bdbqw.mongodb.net/lead?retryWrites=true&w=majority&appName=Cluster0';

async function removeAllLeads() {
  console.log('\n🗑️ REMOVING ALL LEADS DATA');
  console.log('==================================================\n');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get counts before deletion
    const leadsBefore = await Lead.countDocuments({});
    const outreachBefore = await Outreach.countDocuments({});
    const sequencesBefore = await Sequence.countDocuments({});

    console.log('📊 BEFORE DELETION:');
    console.log(`   Leads: ${leadsBefore}`);
    console.log(`   Outreach Records: ${outreachBefore}`);
    console.log(`   Sequences: ${sequencesBefore}\n`);

    // Ask for confirmation
    console.log('⚠️  WARNING: This will delete ALL leads, outreach records, and sequence stats!');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete all leads
    console.log('🗑️ Deleting all leads...');
    const leadResult = await Lead.deleteMany({});
    console.log(`   ✅ Deleted ${leadResult.deletedCount} leads`);

    // Delete all outreach records
    console.log('🗑️ Deleting all outreach records...');
    const outreachResult = await Outreach.deleteMany({});
    console.log(`   ✅ Deleted ${outreachResult.deletedCount} outreach records`);

    // Reset sequence stats (keep sequences but reset stats)
    console.log('🔄 Resetting sequence stats...');
    const sequences = await Sequence.find({});
    let resetCount = 0;
    
    for (const seq of sequences) {
      seq.stats = {
        totalSent: 0,
        totalOpened: 0,
        totalReplied: 0,
        totalRepliesByStep: {
          step1: 0,
          step2: 0,
          step3: 0,
          step4: 0
        },
        latestReplies: [],
        conversionRate: 0,
        lastUsed: new Date()
      };
      await seq.save();
      resetCount++;
    }
    console.log(`   ✅ Reset stats for ${resetCount} sequences`);

    // Verify deletion
    const leadsAfter = await Lead.countDocuments({});
    const outreachAfter = await Outreach.countDocuments({});

    console.log('\n📊 AFTER DELETION:');
    console.log(`   Leads: ${leadsAfter}`);
    console.log(`   Outreach Records: ${outreachAfter}`);
    console.log(`   Sequences: ${sequencesBefore} (stats reset, not deleted)`);

    console.log('\n✅ All leads data removed successfully!');
    console.log(`   Removed ${leadsBefore - leadsAfter} leads`);
    console.log(`   Removed ${outreachBefore - outreachAfter} outreach records\n`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Error during deletion:', error);
    process.exit(1);
  }
}

removeAllLeads();