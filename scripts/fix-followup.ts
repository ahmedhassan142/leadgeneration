// scripts/fix-stuck-followups.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Outreach } from '../lib/db/models/Outreach';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function fixStuckFollowups() {
  console.log('\n🔧 FIXING STUCK FOLLOW-UPS');
  console.log('========================\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB\n');

    // Find stuck follow-ups (active, step 1, has emails sent)
    const stuckOutreaches = await Outreach.find({
      status: 'active',
      currentStep: 1,
      'emails.0': { $exists: true }
    });

    console.log(`📊 Found ${stuckOutreaches.length} stuck follow-ups\n`);

    for (const o of stuckOutreaches) {
      console.log(`📧 ${o.leadSnapshot.name}:`);
      console.log(`   Current Step: ${o.currentStep}/${o.totalSteps}`);
      console.log(`   Emails sent: ${o.emails.length}`);
      console.log(`   Next Follow-up: ${o.nextFollowUpAt}`);

      // Fix: Move to step 2 and set next follow-up to 1 minute from now
      const nextFollowUp = new Date();
      nextFollowUp.setMinutes(nextFollowUp.getMinutes() + 1);

      await Outreach.findByIdAndUpdate(o._id, {
        currentStep: 2,
        nextFollowUpAt: nextFollowUp,
        status: 'active'
      });

      console.log(`   ✅ Fixed! Now Step 2/4, next follow-up: ${nextFollowUp.toLocaleTimeString()}\n`);
    }

    console.log('✅ Fix complete! Now run "p" to process follow-ups.\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixStuckFollowups();