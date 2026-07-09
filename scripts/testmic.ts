// test-sales-call.ts
import { startSalesCall } from '@/lib/sales/sales_call_engine';

async function main() {
    const leadId = "test_lead_" + Date.now();
    const leadName = "Ahmed";
    
    console.log("Starting sales call...");
    await startSalesCall(leadId, leadName);
}

main().catch(console.error);