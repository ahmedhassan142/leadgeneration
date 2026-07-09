// app/api/outreach/status/route.ts
import { NextResponse } from 'next/server';
import { outreachService } from '@/lib/services/outreachservice';
import { logger } from '@/lib/scraper/utils/logger';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const outreachId = searchParams.get('id');
    const leadId = searchParams.get('leadId');
    const leadType = searchParams.get('leadType');

    let outreach = null;

    if (outreachId) {
      outreach = await outreachService.getOutreachStatus(outreachId);
    } else if (leadId && leadType) {
      outreach = await outreachService.getOutreachForLead(leadId, leadType as any);
    }

    if (!outreach) {
      return NextResponse.json(
        { error: 'Outreach not found' },
        { status: 404 }
      );
    }

    // Calculate progress
    const progress = outreach.totalSteps > 0 
      ? Math.round((outreach.currentStep / outreach.totalSteps) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      outreach: {
        id: outreach._id,
        status: outreach.status,
        sequenceId: outreach.sequenceId,
        sequenceName: outreach.sequenceName,
        currentStep: outreach.currentStep,
        totalSteps: outreach.totalSteps,
        progress,
        emails: outreach.emails.map(e => ({
          step: e.stepIndex + 1,
          template: e.templateName,
          sentAt: e.sentAt,
          openedAt: e.openedAt,
          repliedAt: e.repliedAt,
          status: e.status
        })),
        nextFollowUp: outreach.nextFollowUpAt,
        startedAt: outreach.startedAt,
        lastContacted: outreach.lastContactedAt,
        completedAt: outreach.completedAt,
        leadSnapshot: outreach.leadSnapshot
      }
    });

  } catch (error: any) {
    logger.error('Failed to get outreach status:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}