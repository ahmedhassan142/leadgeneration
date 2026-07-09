// app/api/leads/[id]/route.ts
import { NextResponse } from 'next/server';
import  connectToDatabase  from '@/lib/db/connect';
import { Lead } from '@/lib/db/models/Lead';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    const lead = await Lead.findById(params.id).lean();
    
    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ lead });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch lead' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const updates = await request.json();
    
    const lead = await Lead.findByIdAndUpdate(
      params.id,
      { $set: updates },
      { new: true }
    ).lean();
    
    return NextResponse.json({ lead });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update lead' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    await Lead.findByIdAndDelete(params.id);
    
    return NextResponse.json({ 
      success: true,
      message: 'Lead deleted' 
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete lead' },
      { status: 500 }
    );
  }
}