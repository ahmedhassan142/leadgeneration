// app/api/debug/leads/route.ts
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/connect';
import { Lead } from '@/lib/db/models/Lead';

export async function GET() {
  try {
    await connectToDatabase();
    
    // Get ALL leads without any filters
    const allLeads = await Lead.find({}).limit(20).lean();
    
    // Check what fields exist
    const sampleLead = allLeads[0];
    
    // Count leads by quality
    const qualityCounts = await Lead.aggregate([
      {
        $group: {
          _id: '$quality',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Count leads by score ranges
    const scoreRanges = await Lead.aggregate([
      {
        $bucket: {
          groupBy: '$score',
          boundaries: [0, 40, 70, 100],
          default: 'unknown',
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);
    
    // Count leads with emails
    const withEmail = await Lead.countDocuments({
      $or: [
        { emails: { $exists: true, $ne: [] } },
        { email: { $exists: true, $ne: '' } }
      ]
    });
    
    // Count leads by status
    const statusCounts = await Lead.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    return NextResponse.json({
      totalLeads: await Lead.countDocuments(),
      sampleLead: {
        id: sampleLead?._id,
        name: sampleLead?.name,
        quality: sampleLead?.quality,
        score: sampleLead?.score,
        status: sampleLead?.status,
        email: sampleLead?.email,
        emails: sampleLead?.emails,
        hasEmail: !!(sampleLead?.email || (sampleLead?.emails?.length > 0))
      },
      qualityCounts,
      scoreRanges,
      statusCounts,
      leadsWithEmail: withEmail,
      allLeadsSample: allLeads.map(lead => ({
        name: lead.name,
        quality: lead.quality,
        score: lead.score,
        status: lead.status,
        email: lead.email || lead.emails?.[0] || 'no email'
      }))
    });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}