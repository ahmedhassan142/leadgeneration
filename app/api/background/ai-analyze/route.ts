// app/api/background/ai-analyze/route.ts
import { NextResponse } from 'next/server';
import { addJob } from '@/lib/queue/mongo-queue';

export const maxDuration = 900;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { leadId, website, screenshot } = await request.json();
    
    const job = await addJob('ai', { leadId, website, screenshot });
    
    return NextResponse.json({ 
      success: true, 
      jobId: job._id 
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to queue AI analysis' },
      { status: 500 }
    );
  }
}