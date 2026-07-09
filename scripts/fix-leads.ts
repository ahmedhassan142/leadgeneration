// scripts/fix-failed-leads.ts
import connectToDatabase from '@/lib/db/connect';
import { Lead } from '@/lib/db/models/Lead';
import { Outreach } from '@/lib/db/models/Outreach';

async function fixFailedLeads() {
  console.log('\n🔧 FIXING FAILED LEADS...');
  await connectToDatabase();
  
  const failedLeadNames = [
    'Kifer Sparks Agency Real Estate',
    'Jennifer Yoingco, REALTOR - Houston Real Estate',
    'Realty Kings Properties',
    'City Group Properties - Real Estate Brokerage',
    'Monarch Real Estate & Ranch',
    'Happen Houston',
    'Tejas Realty Group',
    'The Jill Smith Team',
    'Bernstein Realty',
    'Houston House of Realty, Real Estate'
  ];
  
  const outreachTime = new Date();
  outreachTime.setHours(4, 57, 36, 0);
  
  for (const name of failedLeadNames) {
    const lead = await Lead.findOne({ name });
    if (!lead) {
      console.log(`❌ Lead not found: ${name}`);
      continue;
    }
    
    const emailAddress = lead.emails?.[0] || lead.email;
    
    // Update lead
    await Lead.updateOne(
      { _id: lead._id },
      {
        $set: {
          lastEmailSentAt: outreachTime,
          lastEmailType: 'first',
          lastEmailSubject: `Introduction - ${lead.name}`,
          totalEmailsSent: 1,
          lastEmailStep: 1,
          currentSequenceId: lead.quality === 'cold' ? 'cold-sequence' : 'warm-sequence',
          emailSequenceStatus: 'active',
          status: 'contacted'
        }
      }
    );
    
    // Update outreach
    await Outreach.updateOne(
      { leadId: lead._id.toString() },
      {
        $set: {
          status: 'active',
          lastContactedAt: outreachTime,
          lastEmailSentAt: outreachTime,
          lastEmailStep: 1,
          lastEmailType: 'first',
          currentStep: 2
        },
        $push: {
          emails: {
            to: emailAddress,
            subject: `Introduction - ${lead.name}`,
            body: `First outreach email to ${lead.name}`,
            sentAt: outreachTime,
            status: 'sent',
            templateName: 'first-email',
            stepIndex: 1
          }
        }
      },
      { upsert: true }
    );
    
    console.log(`✅ Fixed: ${lead.name}`);
  }
  
  console.log('\n✅ All failed leads fixed!');
  process.exit(0);
}

fixFailedLeads();