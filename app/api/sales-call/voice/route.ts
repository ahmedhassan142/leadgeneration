// app/api/sales-call/voice/route.ts
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/connect';
import { Lead } from '@/lib/db/models/Lead';
import { startSalesCall, handleProspectResponse, endCall } from '@/lib/sales/sales_call_engine';

// Store active call IDs (in production, use Redis)
const activeCalls = new Map();

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    
    const { action, leadId, callId, message } = await request.json();
    
    // Action: Start a new call
    if (action === 'start') {
      // Get or create a test lead
      let lead = await Lead.findOne({ name: 'Test Customer - Voice Call Demo' });
      
      if (!lead) {
        // Create test lead
        lead = await Lead.create({
          name: 'Test Customer - Voice Call Demo',
          website: 'https://example.com',
          phone: '+1234567890',
          niche: 'real-estate',
          location: 'Test City, TX',
          source: 'manual',
          emails: [],
          callNeeded: true,
          callStatus: 'pending',
          callPriority: 'high',
          score: 45,
          quality: 'warm',
          status: 'scored'
        });
      }
      
      const result = await startSalesCall(lead._id.toString());
      
      if (result.success && result.callId) {
        activeCalls.set(result.callId, { leadId: lead._id.toString(), active: true });
      }
      
      return NextResponse.json(result);
    }
    
    // Action: Send response
    if (action === 'respond') {
      const result = await handleProspectResponse(callId, message);
      return NextResponse.json(result);
    }
    
    // Action: End call
    if (action === 'end') {
      const result = await endCall(callId);
      activeCalls.delete(callId);
      return NextResponse.json(result);
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error: any) {
    console.error('Voice API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}