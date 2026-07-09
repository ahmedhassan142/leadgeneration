// scripts/create-test-lead.ts
import connectToDatabase from '@/lib/db/connect';
import { Lead } from '@/lib/db/models/Lead';

async function createTestLead() {
  console.log('\n' + '='.repeat(70));
  console.log('📞 Creating Test Lead for Voice Call');
  console.log('='.repeat(70));
  
  await connectToDatabase();
  
  // Create a test lead with phone number but no email
  const testLead = {
    name: "Test Customer - Voice Call Demo",
    website: "https://example.com",
    phone: "+1234567890",  // Test phone number
    address: "123 Test Street, Test City",
    niche: "real-estate" as const,
    location: "Test City, TX",
    source: "manual" as const,
    emails: [],  // No email - will trigger call needed
    websiteExists: true,
    callNeeded: true,
    callStatus: "pending" as const,
    callPriority: "high" as const,
    score: 45,
    quality: "warm" as const,
    status: "scored" as const,
    emailSequenceStatus: "not_started" as const,
    metadata: {
      testLead: true,
      createdFor: "voice call testing",
      createdAt: new Date().toISOString()
    }
  };
  
  // Check if test lead already exists
  const existingLead = await Lead.findOne({ name: testLead.name });
  
  let lead;
  if (existingLead) {
    lead = await Lead.findByIdAndUpdate(
      existingLead._id,
      { $set: testLead },
      { new: true }
    );
    console.log(`\n✅ Updated existing test lead`);
  } else {
    lead = await Lead.create(testLead);
    console.log(`\n✅ Created new test lead`);
  }
  
  console.log(`\n📋 Test Lead Details:`);
  console.log(`   ID: ${lead._id}`);
  console.log(`   Name: ${lead.name}`);
  console.log(`   Phone: ${lead.phone}`);
  console.log(`   Quality: ${lead.quality}`);
  console.log(`   Call Needed: ${lead.callNeeded}`);
  console.log(`   Call Status: ${lead.callStatus}`);
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ Test lead created successfully!');
  console.log('='.repeat(70));
  console.log(`\n📞 To start a call with this lead, run:`);
  console.log(`   npm run test-call ${lead._id}`);
  console.log('\n');
  
  process.exit(0);
}

createTestLead().catch(console.error);