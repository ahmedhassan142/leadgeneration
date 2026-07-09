// app/api/outreach/leads/[id]/route.ts - FIXED FOR NEXT.JS 15
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/connect';
import { Lead } from '@/lib/db/models/Lead';
import { Outreach } from '@/lib/db/models/Outreach';
import { logger } from '@/lib/scraper/utils/logger';

// ✅ FIX: Make the function async and await params
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // 👈 params is now a Promise
) {
  try {
    await connectToDatabase();

    // ✅ Await the params Promise before accessing id
    const { id } = await params;
    
    console.log('🔍 Fetching lead with ID:', id);

    const lead = await Lead.findById(id).lean();
    if (!lead) {
      console.log('❌ Lead not found:', id);
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    console.log('✅ Lead found:', lead.name);

    const outreach = await Outreach.findOne({ 
      leadId: id 
    }).lean();

    return NextResponse.json({
      success: true,
      lead: {
        ...lead,
        outreach: outreach || null
      }
    });

  } catch (error: any) {
    logger.error('Failed to fetch lead:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}