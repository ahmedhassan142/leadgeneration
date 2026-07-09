// app/api/mobile-leads/leads/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/connect';
import { InboundLead } from '@/lib/db/models/inboundlead';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const quality = searchParams.get('quality'); // hot, warm, cold
    const platform = searchParams.get('platform'); // ios, android
    const source = searchParams.get('source'); // app_store_ios, play_store_android
    
    // Build query
    const query: any = {};
    if (quality) query.leadQuality = quality;
    if (platform) query['appMetadata.platform'] = platform;
    if (source) query.source = source;
    
    // Get total count
    const total = await InboundLead.countDocuments(query);
    
    // Get paginated leads
    const leads = await InboundLead.find(query)
      .sort({ leadScore: -1, discoveredAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-__v'); // Exclude version field
    
    // Get summary stats
    const stats = {
      total: await InboundLead.countDocuments(),
      hot: await InboundLead.countDocuments({ leadQuality: 'hot' }),
      warm: await InboundLead.countDocuments({ leadQuality: 'warm' }),
      cold: await InboundLead.countDocuments({ leadQuality: 'cold' }),
      ios: await InboundLead.countDocuments({ source: 'app_store_ios' }),
      android: await InboundLead.countDocuments({ source: 'play_store_android' })
    };

    return NextResponse.json({
      success: true,
      data: leads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats
    });

  } catch (error:any) {
    console.error('Failed to fetch leads:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}