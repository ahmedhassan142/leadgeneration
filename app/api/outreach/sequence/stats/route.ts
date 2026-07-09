// app/api/outreach/sequence/stats/route.ts - UPDATED WITH REPLY CONTENT FROM SEQUENCE MODEL
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/connect';
import { Outreach } from '@/lib/db/models/Outreach';
import { Sequence } from '@/lib/db/models/Sequence';
import { logger } from '@/lib/scraper/utils/logger';

export async function GET() {
  try {
    await connectToDatabase();

    const sequences = await Sequence.find({ isActive: true }).lean();
    
    const stats = await Promise.all(
      sequences.map(async (seq) => {
        const outreachStats = await Outreach.aggregate([
          { $match: { sequenceId: seq.id } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
              active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
              totalOpens: { $sum: { $size: { $filter: { input: '$emails', as: 'e', cond: { $ne: ['$$e.openedAt', null] } } } } }
            }
          }
        ]);

        const stats = outreachStats[0] || { total: 0, completed: 0, active: 0, totalOpens: 0 };
        
        // Get reply stats directly from Sequence model
        const sequenceStats = seq.stats || {
          totalReplied: 0,
          totalRepliesByStep: { step1: 0, step2: 0, step3: 0, step4: 0 },
          latestReplies: []
        };
        
        // Format latest replies with full content
        const latestReplies = (sequenceStats.latestReplies || [])
          .sort((a: any, b: any) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
          .slice(0, 10)
          .map((r: any) => ({
            leadName: r.leadName,
            leadEmail: r.leadEmail,
            step: r.step,
            stepName: r.step === 1 ? 'First Email' : 
                      r.step === 2 ? 'Follow-up 1' : 
                      r.step === 3 ? 'Follow-up 2' : 'Final Email',
            content: r.content,  // 👈 Full reply content
            fromEmail: r.fromEmail,
            receivedAt: r.receivedAt
          }));
        
        return {
          sequenceId: seq.id,
          name: seq.name,
          total: stats.total,
          completed: stats.completed,
          active: stats.active,
          totalOpens: stats.totalOpens,
          totalReplies: sequenceStats.totalReplied || 0,
          repliesByStep: sequenceStats.totalRepliesByStep || { step1: 0, step2: 0, step3: 0, step4: 0 },
          latestReplies: latestReplies,  // 👈 Full reply content included here
          conversionRate: stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0,
          replyRate: stats.total > 0 ? (((sequenceStats.totalReplied || 0) / stats.total) * 100).toFixed(1) : 0
        };
      })
    );

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error: any) {
    logger.error('Failed to fetch sequence stats:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}