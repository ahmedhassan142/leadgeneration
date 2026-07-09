// app/api/debug/blocked-sites/route.ts
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/connect';
import { Lead } from '@/lib/db/models/Lead';

export async function GET() {
  await connectToDatabase();
  
  // Get all blocked leads
  const blockedLeads = await Lead.find({
    $or: [
      { status: 'blocked' },
      { blocked: true },
      { 'analysis.blocked': true },
      { blockReason: { $exists: true, $ne: null } },
      { 'analysis.error': { $regex: 'BLOCKED|blocked|ERR_BLOCKED|429|403|captcha', $options: 'i' } }
    ]
  })
  .sort({ updatedAt: -1 })
  .limit(100)
  .lean();
  
  // Get statistics
  const stats = {
    totalBlocked: await Lead.countDocuments({ 
      $or: [
        { status: 'blocked' },
        { blocked: true }
      ]
    }),
    rateLimited: await Lead.countDocuments({ 
      blockReason: { $regex: '429|rate|too many', $options: 'i' } 
    }),
    captchaRequired: await Lead.countDocuments({ 
      blockReason: { $regex: 'captcha', $options: 'i' } 
    }),
    clientBlocked: await Lead.countDocuments({ 
      blockReason: { $regex: 'ERR_BLOCKED_BY_CLIENT', $options: 'i' } 
    })
  };
  
  return NextResponse.json({
    success: true,
    count: blockedLeads.length,
    stats,
    leads: blockedLeads.map(l => ({
      _id: l._id,
      name: l.name,
      website: l.website,
      status: l.status,
      blocked: l.blocked || false,
      blockReason: l.blockReason || l.analysis?.error || 'Unknown',
      detectedAt: l.updatedAt || l.createdAt,
      quality: l.quality,
      emails: l.emails || []
    }))
  });
}