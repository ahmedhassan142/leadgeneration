import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import {Lead }from '@/lib/db/models/leads';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const query: any = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { niche: { $regex: search, $options: 'i' } }
      ];
    }

    const leads = await Lead.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Lead.countDocuments(query);

    return NextResponse.json({
      success: true,
      leads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const body = await req.json();
    const { name, phone, email, niche, notes, tags } = body;

    if (!name || !phone || !niche) {
      return NextResponse.json(
        { success: false, error: 'Name, phone, and niche are required' },
        { status: 400 }
      );
    }

    const existingLead = await Lead.findOne({ phone });
    if (existingLead) {
      return NextResponse.json(
        { success: false, error: 'Lead with this phone number already exists' },
        { status: 400 }
      );
    }

    const lead = await Lead.create({
      name,
      phone,
      email,
      niche,
      notes,
      tags: tags || []
    });

    return NextResponse.json({ success: true, lead });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}