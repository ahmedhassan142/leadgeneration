// app/api/outreach/sequences/[id]/toggle/route.ts
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/connect';
import { Sequence } from '@/lib/db/models/Sequence';
import { logger } from '@/lib/scraper/utils/logger';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const sequence = await Sequence.findOne({ id: params.id });
    if (!sequence) {
      return NextResponse.json(
        { error: 'Sequence not found' },
        { status: 404 }
      );
    }

    sequence.isActive = !sequence.isActive;
    await sequence.save();

    return NextResponse.json({
      success: true,
      isActive: sequence.isActive
    });

  } catch (error: any) {
    logger.error('Failed to toggle sequence:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}