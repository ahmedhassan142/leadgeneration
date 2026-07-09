
// app/api/leads/stats/route.ts
import { NextResponse } from 'next/server';
import  connectToDatabase  from '@/lib/db/connect';
import { Lead } from '@/lib/db/models/Lead';

export async function GET() {
  try {
    await connectToDatabase();
    
    const [
      totalLeads,
      hotLeads,
      warmLeads,
      coldLeads,
      contactedLeads,
      qualityStats,
      nicheStats
    ] = await Promise.all([
      Lead.countDocuments(),
      Lead.countDocuments({ quality: 'hot' }),
      Lead.countDocuments({ quality: 'warm' }),
      Lead.countDocuments({ quality: 'cold' }),
      Lead.countDocuments({ 'outreach.sent': true }),
      Lead.aggregate([
        { $group: { _id: '$quality', count: { $sum: 1 } } }
      ]),
      Lead.aggregate([
        { $group: { _id: '$niche', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);
    
    const conversionRate = totalLeads > 0 
      ? (contactedLeads / totalLeads) * 100 
      : 0;
    
    return NextResponse.json({
      overview: {
        total: totalLeads,
        hot: hotLeads,
        warm: warmLeads,
        cold: coldLeads,
        contacted: contactedLeads,
        conversionRate: Math.round(conversionRate * 10) / 10
      },
      byQuality: qualityStats,
      topNiches: nicheStats
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}