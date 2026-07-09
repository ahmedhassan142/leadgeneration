// app/api/agentic/start/route.ts
import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: Request) {
    try {
        const { niche, location } = await request.json();
        
        const scriptPath = path.join(process.cwd(), 'lib', 'agentic', 'sales_crew.py');
        
        // Spawn Python process to run CrewAI
        const pythonProcess = spawn('python', [
            scriptPath,
            '--niche', niche,
            '--location', location
        ]);
        
        // Log output for debugging
        pythonProcess.stdout.on('data', (data) => {
            console.log(`[CREW] ${data.toString()}`);
        });
        
        pythonProcess.stderr.on('data', (data) => {
            console.error(`[CREW ERROR] ${data.toString()}`);
        });
        
        return NextResponse.json({
            success: true,
            message: `Agentic pipeline started for ${niche} in ${location}`
        });
        
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}