// app/api/background/score/route.ts
import { NextResponse } from 'next/server';
import { addJob } from '@/lib/queue/mongo-queue';

export const maxDuration = 900;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { leadId } = await request.json();
    
    const job = await addJob('score', { leadId });
    
    return NextResponse.json({ 
      success: true, 
      jobId: job._id 
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to queue scoring' },
      { status: 500 }
    );
  }
}