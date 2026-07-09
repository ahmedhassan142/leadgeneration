// app/api/outreach/sequence/route.ts - UPDATED
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/connect';
import { Sequence } from '@/lib/db/models/Sequence';
import { Outreach } from '@/lib/db/models/Outreach';
import { sequenceManager } from '@/lib/outreach/sequence';
import { logger } from '@/lib/scraper/utils/logger';

// GET /api/outreach/sequence - Fetch all sequences
export async function GET() {
  try {
    await connectToDatabase();
    console.log('📡 Fetching sequences from API route...');

    // Get all sequences
    const sequences = await Sequence.find({ isActive: true }).lean();
    console.log(`📊 Found ${sequences.length} sequences`);

    // Get counts for each sequence
    const sequencesWithCounts = await Promise.all(
      sequences.map(async (seq) => {
        const count = await Outreach.countDocuments({
          sequenceId: seq.id,
          status: 'active'
        });
        return {
          ...seq,
          leadsCount: count
        };
      })
    );

    return NextResponse.json({
      success: true,
      sequences: sequencesWithCounts
    });

  } catch (error: any) {
    logger.error('Failed to fetch sequences:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/outreach/sequence - Create a new sequence
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { id, name, description, targetQualities, steps, isDefault } = body;

    // Validate required fields
    if (!id || !name || !steps || steps.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name, steps' },
        { status: 400 }
      );
    }

    // Calculate total days
    const totalDays = Math.max(...steps.map((s: any) => s.day || 0));

    const sequence = await Sequence.create({
      id,
      name,
      description,
      targetQualities: targetQualities || ['cold', 'warm'],
      steps,
      totalSteps: steps.length,
      totalDays,
      isDefault: isDefault || false,
      isActive: true
    });

    return NextResponse.json({
      success: true,
      sequence
    });

  } catch (error: any) {
    logger.error('Failed to create sequence:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/outreach/sequence/[id] - Update a sequence
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Extract ID from URL
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    const id = segments[segments.length - 1]; // Last segment is the ID
    
    if (!id) {
      return NextResponse.json(
        { error: 'Sequence ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const sequence = await Sequence.findOneAndUpdate(
      { id },
      { $set: body },
      { new: true }
    );

    if (!sequence) {
      return NextResponse.json(
        { error: 'Sequence not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      sequence
    });

  } catch (error: any) {
    logger.error('Failed to update sequence:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/outreach/sequence/[id] - Delete a sequence
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Extract ID from URL
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    const id = segments[segments.length - 1]; // Last segment is the ID
    
    if (!id) {
      return NextResponse.json(
        { error: 'Sequence ID is required' },
        { status: 400 }
      );
    }

    // Check if sequence is in use
    const activeOutreaches = await Outreach.countDocuments({
      sequenceId: id,
      status: 'active'
    });

    if (activeOutreaches > 0) {
      return NextResponse.json(
        { error: `Cannot delete sequence - it is currently used by ${activeOutreaches} active outreaches` },
        { status: 400 }
      );
    }

    const sequence = await Sequence.findOneAndDelete({ id });

    if (!sequence) {
      return NextResponse.json(
        { error: 'Sequence not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Sequence deleted successfully'
    });

  } catch (error: any) {
    logger.error('Failed to delete sequence:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}