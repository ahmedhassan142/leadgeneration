// app/api/leads/route.ts
import { NextResponse } from 'next/server';
import  connectToDatabase  from '@/lib/db/connect';
import { Lead } from '@/lib/db/models/Lead';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const quality = searchParams.get('quality');
    const niche = searchParams.get('niche');
    const search = searchParams.get('search');
    
    const query: any = {};
    if (quality) query.quality = quality;
    if (niche) query.niche = niche;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { website: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const [leads, total] = await Promise.all([
      Lead.find(query)
        .sort({ score: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Lead.countDocuments(query)
    ]);
    
    return NextResponse.json({
      leads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const data = await request.json();
    
    const lead = await Lead.create(data);
    
    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 }
    );
  }
}