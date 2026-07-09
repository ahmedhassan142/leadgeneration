// app/api/inbound/leads/route.ts - COMPLETE VERSION
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/connect';
import { InboundLead } from '@/lib/db/models/inboundlead';
import { logger } from '@/lib/scraper/utils/logger';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    
    // Filters
    const source = searchParams.get('source');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const days = searchParams.get('days');
    
    // Temperature filter (hot/warm/cold)
    const temperature = searchParams.get('temperature'); // 'hot', 'warm', 'cold', or comma-separated 'hot,warm'
    
    // Sort
    const sortBy = searchParams.get('sortBy') || 'postedAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    // Build query
    const query: any = {};

    // Apply source filter
    if (source) {
      query.source = source;
    }

    // Apply status filter
    if (status) {
      query.status = status;
    }

    // Apply date range filter
    if (days) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days));
      query.postedAt = { $gte: daysAgo };
    }

    // 🔥 HOT/COLD/WARM LOGIC based on keywords and content
    if (temperature) {
      const temperatures = temperature.split(',');
      const conditions: any[] = [];

      if (temperatures.includes('hot')) {
        conditions.push({
          $or: [
            { title: { $regex: /need|hire|looking for|help/i } },
            { content: { $regex: /need|hire|looking for|help/i } },
            { keywords: { $in: ['developer', 'designer', 'shopify', 'website'] } },
            { $and: [
              { title: { $regex: /freelancer|contract|gig/i } },
              { status: 'new' }
            ]}
          ]
        });
      }

      if (temperatures.includes('warm')) {
        conditions.push({
          $or: [
            { title: { $regex: /advice|recommend|suggestion|anyone know/i } },
            { content: { $regex: /advice|recommend|suggestion|anyone know/i } },
            { keywords: { $in: ['seo', 'marketing', 'startup'] } },
            { $and: [
              { title: { $regex: /how to|question about|best way/i } },
              { status: 'new' }
            ]}
          ]
        });
      }

      if (temperatures.includes('cold')) {
        conditions.push({
          $or: [
            { title: { $regex: /discussion|opinion|thoughts on/i } },
            { content: { $regex: /discussion|opinion|thoughts on/i } },
            { keywords: { $size: 0 } },
            { $and: [
              { source: 'job_board' },
              { status: 'new' }
            ]}
          ]
        });
      }

      if (conditions.length > 0) {
        query.$or = conditions;
      }
    }

    // Apply search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { requirement: { $regex: search, $options: 'i' } },
        { keywords: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Get total count for pagination
    const total = await InboundLead.countDocuments(query);

    // Fetch leads with pagination and sorting
    const leads = await InboundLead.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    // Calculate temperature for each lead (for display)
    const leadsWithTemp = leads.map(lead => ({
      ...lead,
      temperature: calculateTemperature(lead)
    }));

    // Get statistics
    const stats = await getLeadStats();

    // Get unique sources for filter dropdown
    const sources = await InboundLead.distinct('source');

    // Get keyword cloud
    const keywordStats = await InboundLead.aggregate([
      { $unwind: '$keywords' },
      { $group: { _id: '$keywords', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    return NextResponse.json({
      success: true,
      leads: leadsWithTemp,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        sources,
        statuses: ['new', 'contacted', 'replied', 'converted', 'ignored']
      },
      stats,
      keywordCloud: keywordStats,
      temperature: temperature ? temperature.split(',') : null
    });

  } catch (error: any) {
    logger.error('❌ Failed to fetch inbound leads:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await connectToDatabase();
    
    const { leadId, status, notes, assignedTo } = await request.json();
    
    if (!leadId) {
      return NextResponse.json(
        { error: 'leadId is required' },
        { status: 400 }
      );
    }

    const updateData: any = {
      updatedAt: new Date()
    };

    if (status) {
      updateData.status = status;
      
      // Set timestamp based on status
      if (status === 'contacted') updateData.contactedAt = new Date();
      if (status === 'replied') updateData.repliedAt = new Date();
      if (status === 'converted') updateData.convertedAt = new Date();
    }
    
    if (notes !== undefined) updateData.notes = notes;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;

    const lead = await InboundLead.findByIdAndUpdate(
      leadId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      lead
    });

  } catch (error: any) {
    logger.error('❌ Failed to update lead:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const olderThan = searchParams.get('olderThan') || '30'; // days
    const status = searchParams.get('status');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(olderThan));
    
    const query: any = {
      postedAt: { $lt: cutoffDate }
    };
    
    if (status) {
      query.status = status;
    } else {
      // Don't delete qualified leads by default
      query.status = { $nin: ['converted'] };
    }
    
    const result = await InboundLead.deleteMany(query);

    return NextResponse.json({
      success: true,
      deleted: result.deletedCount,
      message: `🧹 Cleaned up ${result.deletedCount} old leads`
    });

  } catch (error: any) {
    logger.error('❌ Failed to clean inbound leads:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Helper function to calculate lead temperature
function calculateTemperature(lead: any): 'hot' | 'warm' | 'cold' {
  const text = (lead.title + ' ' + lead.content + ' ' + lead.requirement).toLowerCase();
  const keywords = lead.keywords || [];
  
  // HOT: Direct hiring needs
  if (text.includes('need') || 
      text.includes('hire') || 
      text.includes('looking for') ||
      text.includes('help with') ||
      //@ts-ignore
      keywords.some(k => ['developer', 'designer', 'shopify'].includes(k))) {
    return 'hot';
  }
  
  // WARM: Advice/learning requests
  if (text.includes('advice') || 
      text.includes('recommend') ||
      text.includes('how to') ||
      text.includes('question') ||
      //@ts-ignore
      keywords.some(k => ['seo', 'marketing', 'startup'].includes(k))) {
    return 'warm';
  }
  
  // COLD: Discussions, opinions, or unclear intent
  return 'cold';
}

// Helper function to get lead statistics
async function getLeadStats() {
  const total = await InboundLead.countDocuments();
  
  // Get all leads for temperature calculation
  const allLeads = await InboundLead.find().lean();
  
  // Calculate temperature counts
  let hot = 0, warm = 0, cold = 0;
  allLeads.forEach(lead => {
    const temp = calculateTemperature(lead);
    if (temp === 'hot') hot++;
    else if (temp === 'warm') warm++;
    else cold++;
  });

  // Status counts
  const byStatus = await InboundLead.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  // Source counts
  const bySource = await InboundLead.aggregate([
    { $group: { _id: '$source', count: { $sum: 1 } } }
  ]);

  // Daily trend (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const dailyTrend = await InboundLead.aggregate([
    { $match: { postedAt: { $gte: sevenDaysAgo } } },
    { $group: {
        _id: { 
          $dateToString: { format: '%Y-%m-%d', date: '$postedAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return {
    total,
    byTemperature: { hot, warm, cold },
    byStatus: byStatus.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
    bySource: bySource.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
    dailyTrend
  };
}