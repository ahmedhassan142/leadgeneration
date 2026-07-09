// app/api/outreach/stats/route.ts - ADD RECENT REPLIES FROM SEQUENCE MODEL
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/connect';
import { Outreach } from '@/lib/db/models/Outreach';
import { Lead } from '@/lib/db/models/Lead';
import { InboundLead } from '@/lib/db/models/inboundlead';
import { Sequence } from '@/lib/db/models/Sequence';
import { logger } from '@/lib/scraper/utils/logger';

export async function GET() {
  try {
    await connectToDatabase();

    // Get outreach stats
    const [
      totalOutreach,
      activeOutreach,
      completedOutreach,
      emailsSent
    ] = await Promise.all([
      Outreach.countDocuments(),
      Outreach.countDocuments({ status: 'active' }),
      Outreach.countDocuments({ status: 'completed' }),
      Outreach.aggregate([{ $project: { emailCount: { $size: "$emails" } } }, { $group: { _id: null, total: { $sum: "$emailCount" } } }])
    ]);

    // Get all sequences to extract reply data
    const sequences = await Sequence.find({}).lean();
    
    let totalReplies = 0;
    let totalOpens = 0;
    const allLatestReplies: any[] = [];
    
    for (const seq of sequences) {
      totalReplies += seq.stats?.totalReplied || 0;
      totalOpens += seq.stats?.totalOpened || 0;
      
      // Collect latest replies from all sequences
      if (seq.stats?.latestReplies && seq.stats.latestReplies.length > 0) {
        const repliesWithSequence = seq.stats.latestReplies.map((reply: any) => ({
          ...reply,
          sequenceId: seq.id,
          sequenceName: seq.name,
          stepName: reply.step === 1 ? 'First Email' : 
                    reply.step === 2 ? 'Follow-up 1' : 
                    reply.step === 3 ? 'Follow-up 2' : 'Final Email'
        }));
        allLatestReplies.push(...repliesWithSequence);
      }
    }
    
    // Sort by receivedAt (newest first) and take top 10
    const recentReplies = allLatestReplies
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
      .slice(0, 10)
      .map(r => ({
        leadName: r.leadName,
        leadEmail: r.leadEmail,
        step: r.step,
        stepName: r.stepName,
        content: r.content,  // 👈 Full reply content
        fromEmail: r.fromEmail,
        receivedAt: r.receivedAt,
        sequenceName: r.sequenceName
      }));

    // Get sequence stats
    const [activeSequences, pendingFollowups] = await Promise.all([
      Sequence.countDocuments({ isActive: true }),
      Outreach.countDocuments({ 
        status: 'active',
        nextFollowUpAt: { $lte: new Date() }
      })
    ]);

    // Get lead counts
    const [hotLeads, warmLeads, coldLeads] = await Promise.all([
      Lead.countDocuments({ $or: [{ quality: 'hot' }, { score: { $gte: 70 } }] }),
      Lead.countDocuments({ $or: [{ quality: 'warm' }, { score: { $gte: 40, $lt: 70 } }] }),
      Lead.countDocuments({ $or: [{ quality: 'cold' }, { score: { $lt: 40 } }] })
    ]);

    const [inboundHot, inboundWarm, inboundCold] = await Promise.all([
      InboundLead.countDocuments({ $or: [{ leadQuality: 'hot' }, { leadScore: { $gte: 70 } }] }),
      InboundLead.countDocuments({ $or: [{ leadQuality: 'warm' }, { leadScore: { $gte: 40, $lt: 70 } }] }),
      InboundLead.countDocuments({ $or: [{ leadQuality: 'cold' }, { leadScore: { $lt: 40 } }] })
    ]);

    return NextResponse.json({
      success: true,
      outreach: {
        total: totalOutreach,
        active: activeOutreach,
        completed: completedOutreach,
        replied: totalReplies,
        emails: {
          sent: emailsSent[0]?.total || 0,
          opened: totalOpens,
          replied: totalReplies,
          responseRate: emailsSent[0]?.total ? ((totalReplies / emailsSent[0]?.total) * 100).toFixed(1) : '0'
        }
      },
      sequences: {
        active: activeSequences,
        pending: pendingFollowups
      },
      leads: {
        outbound: {
          hot: hotLeads,
          warm: warmLeads,
          cold: coldLeads,
          total: hotLeads + warmLeads + coldLeads
        },
        inbound: {
          hot: inboundHot,
          warm: inboundWarm,
          cold: inboundCold,
          total: inboundHot + inboundWarm + inboundCold
        }
      },
      replies: {
        total: totalReplies,
        recent: recentReplies  // 👈 Full reply content included here
      }
    });

  } catch (error: any) {
    logger.error('Failed to fetch outreach stats:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}