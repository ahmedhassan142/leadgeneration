// app/api/mobile-leads/stats/route.ts
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/connect';
import { InboundLead } from '@/lib/db/models/inboundlead';

export async function GET() {
  try {
    await connectToDatabase();

    // Get all stats in parallel
    const [
      total,
      hot,
      warm,
      cold,
      ios,
      android,
      contacted,
      replied,
      converted,
      qualityDistribution,
      platformDistribution,
      sourceDistribution,
      recentActivity
    ] = await Promise.all([
      InboundLead.countDocuments(),
      InboundLead.countDocuments({ leadQuality: 'hot' }),
      InboundLead.countDocuments({ leadQuality: 'warm' }),
      InboundLead.countDocuments({ leadQuality: 'cold' }),
      InboundLead.countDocuments({ source: 'app_store_ios' }),
      InboundLead.countDocuments({ source: 'play_store_android' }),
      InboundLead.countDocuments({ status: 'contacted' }),
      InboundLead.countDocuments({ status: 'replied' }),
      InboundLead.countDocuments({ status: 'converted' }),
      
      // Quality distribution by platform
      InboundLead.aggregate([
        { $group: {
          _id: { quality: '$leadQuality', platform: '$appMetadata.platform' },
          count: { $sum: 1 }
        }}
      ]),
      
      // Platform distribution
      InboundLead.aggregate([
        { $group: { _id: '$source', count: { $sum: 1 } } }
      ]),
      
      // Source distribution over time
      InboundLead.aggregate([
        { $match: { discoveredAt: { $gte: new Date(Date.now() - 7*24*60*60*1000) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$discoveredAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      
      // Recent activity
      InboundLead.find()
        .sort({ discoveredAt: -1 })
        .limit(10)
        .select('title leadQuality leadScore appMetadata.platform discoveredAt')
    ]);

    // Calculate percentages
    const percentages = {
      hot: total ? Math.round((hot / total) * 100) : 0,
      warm: total ? Math.round((warm / total) * 100) : 0,
      cold: total ? Math.round((cold / total) * 100) : 0,
      ios: total ? Math.round((ios / total) * 100) : 0,
      android: total ? Math.round((android / total) * 100) : 0
    };

    // Calculate average score
    const avgScoreResult = await InboundLead.aggregate([
      { $group: { _id: null, avgScore: { $avg: '$leadScore' } } }
    ]);
    const averageScore = avgScoreResult[0]?.avgScore || 0;

    return NextResponse.json({
      success: true,
      data: {
        totals: { total, hot, warm, cold, ios, android, contacted, replied, converted },
        percentages,
        averageScore: Math.round(averageScore * 10) / 10,
        qualityDistribution,
        platformDistribution,
        sourceDistribution,
        recentActivity
      }
    });

  } catch (error:any) {
    console.error('Failed to fetch stats:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}