// app/api/outreach/replies/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/connect';
import { Sequence } from '@/lib/db/models/Sequence';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');
    const limit = parseInt(searchParams.get('limit') || '100');
    
    // Get all sequences
    const sequences = await Sequence.find({}).lean();
    
    const allReplies: any[] = [];
    
    for (const seq of sequences) {
      const replies = (seq.stats?.latestReplies || [])
        .filter((r: any) => !leadId || r.leadId === leadId || r.leadName?.includes(leadId || ''))
        .map((r: any) => ({
          ...r,
          sequenceId: seq.id,
          sequenceName: seq.name
        }));
      allReplies.push(...replies);
    }
    
    // Sort by receivedAt
    const sortedReplies = allReplies
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
      .slice(0, limit);
    
    return NextResponse.json({ success: true, replies: sortedReplies });
    
  } catch (error: any) {
    console.error('Failed to fetch replies:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}