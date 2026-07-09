// app/api/leads/clear-all/route.ts
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/connect';
import { Lead } from '@/lib/db/models/Lead';
import { logger } from '@/lib/scraper/utils/logger';

export async function DELETE() {
  try {
    await connectToDatabase();
    
    // Count before deletion
    const count = await Lead.countDocuments();
    
    // Delete all leads
    const result = await Lead.deleteMany({});
    
    logger.success(`✅ Cleared ${result.deletedCount} leads from MongoDB`);
    
    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `Deleted ${result.deletedCount} leads`
    });
    
  } catch (error) {
    logger.error('❌ Failed to clear MongoDB', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}