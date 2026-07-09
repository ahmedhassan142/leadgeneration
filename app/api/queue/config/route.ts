// app/api/queue/config/route.ts - FIXED VERSION
import { NextResponse } from 'next/server';
import { setWaveSize, setMaxWorkers, getConfig, autoConfigure } from '@/lib/queue/inline-process';

export async function GET() {
  try {
    const config = getConfig();
    
    return NextResponse.json({
      success: true,
      config,
      validWaveSizes: [20, 40, 60, 80, 100],
      maxWorkersLimit: 5,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { action, waveSize, workers } = await request.json();
    
    if (action === 'setWaveSize') {
      const success = setWaveSize(waveSize);
      if (!success) {
        return NextResponse.json(
          { error: 'Invalid wave size. Use: 20, 40, 60, 80, 100' },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        message: `Wave size set to ${waveSize}`,
        config: getConfig()
      });
    }
    
    if (action === 'setWorkers') {
      const success = setMaxWorkers(workers);
      if (!success) {
        return NextResponse.json(
          { error: 'Invalid workers count. Use: 1-5' },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        message: `Workers set to ${workers}`,
        config: getConfig()
      });
    }
    
    if (action === 'autoConfigure') {
      autoConfigure();
      return NextResponse.json({
        success: true,
        message: 'Auto-configured for 8GB RAM',
        config: getConfig()
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid action. Use: setWaveSize, setWorkers, autoConfigure' },
      { status: 400 }
    );
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}