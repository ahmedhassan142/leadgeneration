// test-voice.ts - SIMPLIFIED VERSION
import { spawn } from 'child_process';
import * as path from 'path';
import * as readline from 'readline';

let pythonProcess: any = null;
let ready = false;

async function startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(process.cwd(), 'lib', 'voice', 'simple_voice.py');
        
        console.log("Starting voice server...");
        
        const venvPython = path.join(process.cwd(), 'venv', 'Scripts', 'python.exe');
        const pythonCmd = require('fs').existsSync(venvPython) ? venvPython : 'python';
        
        pythonProcess = spawn(pythonCmd, [scriptPath], {
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
        });
        
        pythonProcess.stdout.on('data', (data: Buffer) => {
            const output = data.toString('utf-8');
            if (output.includes('READY')) {
                ready = true;
                console.log("Voice server ready!");
                resolve();
            }
        });
        
        pythonProcess.stderr.on('data', (data: Buffer) => {
            const errorMsg = data.toString('utf-8');
            if (!errorMsg.includes('KMP_DUPLICATE_LIB_OK')) {
                console.log(`[Error] ${errorMsg}`);
            }
        });
        
        setTimeout(() => reject(new Error('Server timeout')), 15000);
    });
}

async function call(action: string, params: any = {}): Promise<any> {
    if (!ready) await startServer();
    
    return new Promise((resolve, reject) => {
        const id = Date.now().toString();
        const message = JSON.stringify({ id, action, params });
        
        const timeout = setTimeout(() => {
            reject(new Error(`Timeout: ${action}`));
        }, 15000);
        
        const handler = (data: Buffer) => {
            try {
                const output = data.toString('utf-8');
                const match = output.match(/\{.*\}/);
                if (match) {
                    const response = JSON.parse(match[0]);
                    if (response.id === id) {
                        clearTimeout(timeout);
                        pythonProcess.stdout.off('data', handler);
                        if (response.error) reject(new Error(response.error));
                        else resolve(response.result);
                    }
                }
            } catch (e) {}
        };
        
        pythonProcess.stdout.on('data', handler);
        pythonProcess.stdin.write(message + '\n');
    });
}

async function speak(text: string): Promise<void> {
    console.log(`\n🤖 AI: ${text}`);
    await call('speak', { text });
    // Small delay after speaking
    await new Promise(resolve => setTimeout(resolve, 500));
}

async function listen(): Promise<string> {
    console.log(`\n🎙️ Listening (6 seconds)...`);
    const result = await call('listen', { duration: 6 });
    if (result && result.text) {
        console.log(`\n👤 YOU: ${result.text}`);
        return result.text;
    }
    console.log(`\n⚠️ No speech detected`);
    return "";
}

function logStage(stage: string): void {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📍 STAGE: ${stage}`);
    console.log(`${'='.repeat(50)}`);
}

async function testFullConversation() {
    console.clear();
    console.log("=".repeat(60));
    console.log("SALESGPT REAL VOICE TEST");
    console.log("=".repeat(60));
    console.log("\nInstructions:");
    console.log("  - AI will speak through your speakers");
    console.log("  - Speak clearly into your microphone");
    console.log("  - Wait for the 'Listening...' prompt");
    console.log("  - Type 'quit' to end\n");
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    const askToContinue = () => new Promise<void>((resolve) => {
        rl.question("\nPress Enter to start the call...", () => resolve());
    });
    
    await askToContinue();
    
    // Stage 1: Introduction
    logStage("INTRODUCTION");
    await speak("Hey, this is Alex from TechGrowth Solutions. Am I catching you at a bad time?");
    
    let response = await listen();
    if (!response) {
        await speak("Hello? Are you there?");
        response = await listen();
        if (!response) {
            await speak("Okay, I'll try back later. Have a great day!");
            rl.close();
            return;
        }
    }
    
    // Stage 2: Qualification
    logStage("QUALIFICATION");
    await speak("Great! Are you the one who handles decisions about marketing and websites?");
    
    response = await listen();
    if (response?.toLowerCase().includes('no')) {
        await speak("Who should I speak with about this?");
        response = await listen();
    }
    
    // Stage 3: Value Proposition
    logStage("VALUE PROPOSITION");
    await speak("We help local businesses get more customers online. Most clients see results within 30 days.");
    
    response = await listen();
    
    // Stage 4: Needs Analysis
    logStage("NEEDS ANALYSIS");
    await speak("What's the biggest challenge you're facing right now with getting customers?");
    
    response = await listen();
    
    // Stage 5: Solution
    logStage("SOLUTION");
    await speak("Based on what you said, we can definitely help. Most of our clients start around $800.");
    
    response = await listen();
    
    // Stage 6: Objection Handling
    if (response?.toLowerCase().includes('expensive') || response?.toLowerCase().includes('price')) {
        logStage("OBJECTION HANDLING");
        await speak("I understand. One new customer usually covers the cost within a month. Does that make sense?");
        response = await listen();
    }
    
    // Stage 7: Close
    logStage("CLOSE");
    await speak("How about a 15-minute call to go over the details? Does Tuesday at 2pm work?");
    
    response = await listen();
    
    if (response?.toLowerCase().includes('yes')) {
        await speak("Perfect! I'll send you a calendar invite. Looking forward to helping you grow!");
    } else {
        await speak("No problem. I'll send you an email with details. Have a great day!");
    }
    
    console.log("\n✅ Call completed successfully!");
    
    rl.close();
    
    if (pythonProcess) {
        pythonProcess.kill();
    }
    process.exit(0);
}

testFullConversation().catch(console.error);