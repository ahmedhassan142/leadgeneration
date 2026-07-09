// scripts/create-and-test-call.ts
import connectToDatabase from '@/lib/db/connect';
import { Lead } from '@/lib/db/models/Lead';
import { startSalesCall, handleProspectResponse, endCall } from '@/lib/sales/sales_call_engine';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function createAndTestCall() {
  console.log('\n' + '='.repeat(70));
  console.log('📞 Creating Test Lead & Starting AI Sales Call');
  console.log('='.repeat(70));
  
  await connectToDatabase();
  
  // Create a test lead
  const testLead = {
    name: "Test Customer - Voice Call Demo",
    website: "https://example.com",
    phone: "+1234567890",
    address: "123 Test Street, Test City",
    niche: "real-estate" as const,
    location: "Test City, TX",
    source: "manual" as const,
    emails: [],
    websiteExists: true,
    callNeeded: true,
    callStatus: "pending" as const,
    callPriority: "high" as const,
    score: 45,
    quality: "warm" as const,
    status: "scored" as const,
    emailSequenceStatus: "not_started" as const
  };
  
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
  
  console.log('\n🎤 Starting AI Sales Call...\n');
  
  try {
    // Start the call
    const result = await startSalesCall(lead._id.toString());
    
    if (!result.success) {
      console.error(`❌ Call failed: ${result.error}`);
      process.exit(1);
    }
    
    console.log(`✅ Call started! Call ID: ${result.callId}`);
    console.log(`\n🤖 AI: ${result.aiResponse}\n`);
    
    // Interactive conversation
    let active = true;
    let turn = 0;
    
    while (active && turn < 10) {
      turn++;
      
      const userInput = await new Promise<string>((resolve) => {
        rl.question('👤 You (type your response): ', resolve);
      });
      
      if (userInput.toLowerCase() === 'quit' || userInput.toLowerCase() === 'exit') {
        console.log('\n👋 Ending call...');
        await endCall(result.callId!, 'User ended');
        break;
      }
      
      const response = await handleProspectResponse(result.callId!, userInput);
      
      if (response.aiResponse) {
        console.log(`\n🤖 AI: ${response.aiResponse}\n`);
      }
      
      if (response.ended) {
        console.log(`\n🏁 Call ended. Outcome: ${response.outcome}`);
        active = false;
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ Call test completed!');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('❌ Call error:', error);
  } finally {
    rl.close();
    process.exit(0);
  }
}

createAndTestCall().catch(console.error);