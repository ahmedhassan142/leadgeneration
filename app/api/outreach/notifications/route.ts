// app/api/outreach/notifications/route.ts
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/connect';
import { Outreach } from '@/lib/db/models/Outreach';
import { logger } from '@/lib/scraper/utils/logger';

export async function GET() {
  try {
    await connectToDatabase();

    // Get recent replies and bounces
    const [replies, bounces, dueFollowups] = await Promise.all([
      Outreach.find({ "emails.repliedAt": { $exists: true } })
        .sort({ "emails.repliedAt": -1 })
        .limit(5)
        .lean(),
      Outreach.find({ "emails.status": "bounced" })
        .sort({ "emails.sentAt": -1 })
        .limit(5)
        .lean(),
      Outreach.find({ 
        nextFollowUpAt: { $lte: new Date() },
        status: 'active'
      })
        .limit(5)
        .lean()
    ]);

    const notifications = [
      ...replies.map(o => ({
        id: `reply-${o._id}`,
        type: 'reply',
        message: `Reply received from ${o.leadSnapshot.name}`,
    
        time: o.emails.find((e:any) => e.repliedAt)?.repliedAt || new Date(),
        read: false
      })),
      ...bounces.map(o => ({
        id: `bounce-${o._id}`,
        type: 'bounce',
        message: `Email bounced for ${o.leadSnapshot.name}`,
        time: o.emails.find((e:any) => e.status === 'bounced')?.sentAt || new Date(),
        read: false
      })),
      ...dueFollowups.map(o => ({
        id: `followup-${o._id}`,
        type: 'sequence',
        message: `Follow-up due for ${o.leadSnapshot.name} (Step ${o.currentStep})`,
        time: o.nextFollowUpAt || new Date(),
        read: false
      }))
    ];

    // Sort by time, newest first
    notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return NextResponse.json({
      success: true,
      notifications: notifications.slice(0, 10)
    });

  } catch (error: any) {
    logger.error('Failed to fetch notifications:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}