// app/api/queue/control/route.ts - UPDATED
import { NextResponse } from 'next/server';
import { startMicroBatchProcessor, stopMicroBatchProcessor } from '@/lib/queue/inline-process';
import { getQueueStatus } from '@/lib/queue/mongo-queue';

declare global {
  var microBatchRunning: boolean | undefined;
  var microBatchStartTime: number | undefined;
  //@ts-ignore
  var currentWaveStats: any;
}

export async function GET() {
  try {
    const queueStatus = await getQueueStatus();
    const uptime = global.microBatchStartTime 
      ? Math.round((Date.now() - global.microBatchStartTime) / 1000) 
      : 0;
    
    return NextResponse.json({
      success: true,
      processor: {
        running: global.microBatchRunning || false,
        type: 'micro-batch',
        workers: 3,
        waveSize: 20,
        uptimeSeconds: uptime,
        uptimeFormatted: `${Math.floor(uptime / 60)}m ${uptime % 60}s`,
        startTime: global.microBatchStartTime ? new Date(global.microBatchStartTime).toISOString() : null,
        currentWave: global.currentWaveStats || null
      },
      queue: queueStatus,
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
    const { action } = await request.json();
    
    if (action === 'start') {
      startMicroBatchProcessor();
      return NextResponse.json({
        success: true,
        message: 'Micro-batch processor started with 3 parallel workers',
        status: { running: true, type: 'micro-batch' }
      });
    }
    
    if (action === 'stop') {
      stopMicroBatchProcessor();
      return NextResponse.json({
        success: true,
        message: 'Micro-batch processor stopped',
        status: { running: false }
      });
    }
    
    if (action === 'status') {
      const queueStatus = await getQueueStatus();
      return NextResponse.json({
        success: true,
        processor: {
          running: global.microBatchRunning || false,
          type: 'micro-batch',
          workers: 3,
          waveSize: 20,
          startTime: global.microBatchStartTime ? new Date(global.microBatchStartTime).toISOString() : null,
          currentWave: global.currentWaveStats || null
        },
        queue: queueStatus
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid action. Use: start, stop, status' },
      { status: 400 }
    );
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}