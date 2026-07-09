// test-voice-simple.ts
import { spawn } from 'child_process';
import * as path from 'path';

let pythonProcess: any = null;
let ready = false;

async function startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(process.cwd(), 'lib', 'voice', 'fast_voice_server.py');
        
        pythonProcess = spawn('python', [scriptPath], {
            env: { ...process.env, KMP_DUPLICATE_LIB_OK: 'TRUE' }
        });
        
        pythonProcess.stdout.on('data', (data: Buffer) => {
            const output = data.toString();
            console.log(`[PY] ${output.trim()}`);
            if (output.includes('READY')) {
                ready = true;
                resolve();
            }
        });
        
        pythonProcess.stderr.on('data', (data: Buffer) => {
            console.log(`[PY ERR] ${data.toString()}`);
        });
        
        setTimeout(() => reject(new Error('Timeout')), 30000);
    });
}

async function call(action: string, params: any = {}): Promise<any> {
    if (!ready) await startServer();
    
    return new Promise((resolve, reject) => {
        const id = Date.now().toString();
        const message = JSON.stringify({ id, action, params });
        
        const handler = (data: Buffer) => {
            const output = data.toString();
            try {
                const jsonMatch = output.match(/\{.*\}/);
                if (jsonMatch) {
                    const response = JSON.parse(jsonMatch[0]);
                    if (response.id === id) {
                        pythonProcess.stdout.off('data', handler);
                        if (response.error) reject(new Error(response.error));
                        else resolve(response.result);
                    }
                }
            } catch (e) {}
        };
        
        pythonProcess.stdout.on('data', handler);
        pythonProcess.stdin.write(message + '\n');
        
        setTimeout(() => {
            pythonProcess.stdout.off('data', handler);
            reject(new Error('Timeout'));
        }, 15000);
    });
}

async function speak(text: string): Promise<void> {
    console.log(`\n🤖 AI: ${text}\n`);
    await call('speak', { text });
}

async function listen(): Promise<string> {
    console.log(`\n🎙️ Listening...\n`);
    const result = await call('listen', { duration: 6 });
    if (result && result.text) {
        console.log(`\n👤 YOU: ${result.text}\n`);
        return result.text;
    }
    return "";
}

async function test() {
    console.log("🔊 Testing Voice System\n");
    
    console.log("1. Speaking...");
    await speak("Hello! This is a test. Can you hear me?");
    
    console.log("2. Now say something (6 seconds)...");
    const response = await listen();
    
    if (response) {
        await speak(`I heard you say: ${response}`);
    }
    
    console.log("\n✅ Test complete!");
    pythonProcess.kill();
}

test().catch(console.error);