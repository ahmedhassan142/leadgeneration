// app/api/outreach/leads/route.ts - ADD REPLY FILTER SUPPORT
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/connect';
import { Lead } from '@/lib/db/models/Lead';
import { InboundLead } from '@/lib/db/models/inboundlead';
import { Outreach } from '@/lib/db/models/Outreach';
import { logger } from '@/lib/scraper/utils/logger';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    const quality = searchParams.get('quality');
    const source = searchParams.get('source');
    const status = searchParams.get('status');
    const leadType = searchParams.get('leadType') || 'all';
    const view = searchParams.get('view') || 'all';
    const sequence = searchParams.get('sequence');

    // Build base queries
    const mainQuery: any = {};
    const inboundQuery: any = {};

    // 👇 CRITICAL: Handle 'replied' status filter
    if (status === 'replied') {
      // Find leads that have replies in their outreach
      const repliedOutreaches = await Outreach.find({
        'emails.repliedAt': { $exists: true }
      }).lean();
      
      const repliedLeadIds = repliedOutreaches
        .filter(o => o.leadId)
        .map(o => o.leadId);
      
      const repliedInboundIds = repliedOutreaches
        .filter(o => o.inboundLeadId)
        .map(o => o.inboundLeadId);

      mainQuery._id = { $in: repliedLeadIds };
      inboundQuery._id = { $in: repliedInboundIds };
    }
    // Handle other status filters
    else if (status && status !== 'all') {
      if (status === 'followup') {
        const outreachLeads = await Outreach.find({
          status: 'active',
          nextFollowUpAt: { $lte: new Date() }
        }).distinct('leadId');
        mainQuery._id = { $in: outreachLeads };
      } else {
        mainQuery.status = status;
        inboundQuery.status = status;
      }
    }

    // Apply quality filters
    if (quality && quality !== 'all') {
      if (quality === 'hot') {
        mainQuery.$or = [{ quality: 'hot' }, { score: { $gte: 70 } }];
        inboundQuery.$or = [{ leadQuality: 'hot' }, { leadScore: { $gte: 70 } }];
      } else if (quality === 'warm') {
        mainQuery.$or = [{ quality: 'warm' }, { score: { $gte: 40, $lt: 70 } }];
        inboundQuery.$or = [{ leadQuality: 'warm' }, { leadScore: { $gte: 40, $lt: 70 } }];
      } else if (quality === 'cold') {
        mainQuery.$or = [{ quality: 'cold' }, { score: { $lt: 40 } }];
        inboundQuery.$or = [{ leadQuality: 'cold' }, { leadScore: { $lt: 40 } }];
      }
    }

    // Apply source filter
    if (source && source !== 'all') {
      mainQuery.source = source;
      inboundQuery.source = source;
    }

    // Apply sequence filter
    if (sequence) {
      const outreachLeads = await Outreach.find({
        sequenceId: sequence,
        status: 'active'
      }).distinct('leadId');
      mainQuery._id = { $in: outreachLeads };
    }

    // Get total counts
    let totalMain = 0;
    let totalInbound = 0;
    let totalAll = 0;

    if (leadType === 'all' || leadType === 'main') {
      totalMain = await Lead.countDocuments(mainQuery);
    }
    if (leadType === 'all' || leadType === 'inbound') {
      totalInbound = await InboundLead.countDocuments(inboundQuery);
    }
    totalAll = totalMain + totalInbound;

    // Fetch leads with pagination
    let mainLeads: any[] = [];
    let inboundLeads: any[] = [];

    if (leadType === 'all') {
      if (skip < totalMain) {
        const mainLimit = Math.min(limit, totalMain - skip);
        mainLeads = await Lead.find(mainQuery)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(mainLimit)
          .lean();

        if (mainLeads.length < limit) {
          const inboundSkip = 0;
          const inboundLimit = limit - mainLeads.length;
          inboundLeads = await InboundLead.find(inboundQuery)
            .sort({ postedAt: -1 })
            .skip(inboundSkip)
            .limit(inboundLimit)
            .lean();
        }
      } else {
        const inboundSkip = skip - totalMain;
        inboundLeads = await InboundLead.find(inboundQuery)
          .sort({ postedAt: -1 })
          .skip(inboundSkip)
          .limit(limit)
          .lean();
      }
    } else if (leadType === 'main') {
      mainLeads = await Lead.find(mainQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    } else if (leadType === 'inbound') {
      inboundLeads = await InboundLead.find(inboundQuery)
        .sort({ postedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    }

    // Attach outreach data to each lead
    const leadsWithOutreach = await Promise.all([
      ...mainLeads.map(async (lead) => {
        const outreach = await Outreach.findOne({ 
          leadId: lead._id.toString() 
        }).lean();
        
        return {
          ...lead,
          _type: 'main',
          score: lead.score || 0,
          quality: lead.quality || (lead.score >= 70 ? 'hot' : lead.score >= 40 ? 'warm' : 'cold'),
          outreach: outreach || null,
          hasReply: outreach?.emails?.some((e: any) => e.repliedAt || e.status === 'replied') || false
        };
      }),
      ...inboundLeads.map(async (lead) => {
        const outreach = await Outreach.findOne({ 
          inboundLeadId: lead._id.toString() 
        }).lean();
        
        return {
          ...lead,
          _type: 'inbound',
          score: lead.leadScore || 0,
          quality: lead.leadQuality || (lead.leadScore >= 70 ? 'hot' : lead.leadScore >= 40 ? 'warm' : 'cold'),
          outreach: outreach || null,
          hasReply: outreach?.emails?.some((e: any) => e.repliedAt || e.status === 'replied') || false
        };
      })
    ]);

    // Sort by date
    const sortedLeads = leadsWithOutreach.sort((a, b) => {
      const dateA = a.postedAt || a.createdAt || a.discoveredAt;
      const dateB = b.postedAt || b.createdAt || b.discoveredAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return NextResponse.json({
      success: true,
      leads: sortedLeads,
      pagination: {
        page,
        limit,
        total: totalAll,
        totalMain,
        totalInbound,
        totalPages: Math.ceil(totalAll / limit),
        hasNextPage: page < Math.ceil(totalAll / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error: any) {
    logger.error('Failed to fetch leads:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}