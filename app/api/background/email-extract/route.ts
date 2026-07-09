// app/api/background/email-extract/route.ts
import { NextResponse } from 'next/server';
import { addJob } from '@/lib/queue/mongo-queue';

export const maxDuration = 900;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { leadId, website } = await request.json();
    
    const job = await addJob('email', { leadId, website });
    
    return NextResponse.json({ 
      success: true, 
      jobId: job._id 
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to queue email extraction' },
      { status: 500 }
    );
  }
}