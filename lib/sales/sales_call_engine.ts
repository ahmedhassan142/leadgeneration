// lib/sales/sales-call-engine-working.ts
import { SalesConversation, SalesStage, STAGE_NAMES } from './sales-conversations';
import * as readline from 'readline';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);
let typingMode = false;

// Create temporary PowerShell scripts instead of inline commands
async function runPowerShellScript(scriptContent: string): Promise<string> {
    const tempScript = path.join(process.cwd(), `temp_ps_${Date.now()}.ps1`);
    fs.writeFileSync(tempScript, scriptContent, 'utf8');
    
    try {
        const { stdout } = await execAsync(`powershell -ExecutionPolicy Bypass -File "${tempScript}"`);
        return stdout;
    } finally {
        if (fs.existsSync(tempScript)) {
            fs.unlinkSync(tempScript);
        }
    }
}

async function speak(text: string): Promise<void> {
    console.log(`\n🔊 Alex: ${text}`);
    
    const psScript = `
        Add-Type -AssemblyName System.Speech
        $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
        $synth.Volume = 100
        $synth.Rate = 0
        $synth.Speak('${text.replace(/'/g, "''")}')
    `;
    
    try {
        await runPowerShellScript(psScript);
        await new Promise(r => setTimeout(r, 500));
    } catch (error) {
        console.log("(Continuing without speech)");
    }
}

async function listen(): Promise<string> {
    console.log(`\n🎙️ Listening...`);
    
    for (let i = 3; i > 0; i--) {
        process.stdout.write(`\rStarting in ${i}... `);
        await new Promise(r => setTimeout(r, 1000));
    }
    console.log(`\r🎤 Speak now!       `);
    
    const psScript = `
        Add-Type -AssemblyName System.Speech
        $recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine
        $recognizer.SetInputToDefaultAudioDevice()
        $grammar = New-Object System.Speech.Recognition.DictationGrammar
        $recognizer.LoadGrammar($grammar)
        
        try {
            $result = $recognizer.Recognize([TimeSpan]::FromSeconds(5))
            if ($result -and $result.Text) {
                Write-Host $result.Text
            } else {
                Write-Host ""
            }
        } catch {
            Write-Host ""
        }
    `;
    
    try {
        const result = await runPowerShellScript(psScript);
        const speech = result.trim();
        
        if (speech && speech.length > 0) {
            console.log(`\n👤 You: ${speech}`);
            return speech;
        }
        
        console.log(`\n⚠️ No speech detected`);
        return "";
        
    } catch (error) {
        console.log(`\n❌ Error listening`);
        return "";
    }
}

async function getUserInput(): Promise<string> {
    if (typingMode) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        return new Promise((resolve) => {
            rl.question('\n📝 Type your response: ', (answer) => {
                rl.close();
                if (answer.toLowerCase() === 'mic') {
                    typingMode = false;
                    console.log("🎤 Switching back to microphone...");
                    resolve('');
                } else {
                    resolve(answer);
                }
            });
        });
    }
    
    const speech = await listen();
    if (speech && speech.length > 0) {
        return speech;
    }
    
    console.log('\n💡 No speech detected. Type "type" to switch to typing mode');
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise((resolve) => {
        rl.question('\n👉 ', (answer) => {
            rl.close();
            if (answer.toLowerCase() === 'type') {
                typingMode = true;
                console.log('📝 Switched to typing mode. Type "mic" to switch back.');
                resolve('');
            } else if (answer.trim().length > 0) {
                resolve(answer);
            } else {
                resolve('');
            }
        });
    });
}

function logStage(stage: SalesStage): void {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📍 ${STAGE_NAMES[stage]}`);
    console.log(`${'='.repeat(50)}`);
}

// Simple test function
async function quickMicTest(): Promise<boolean> {
    console.log("\n🔍 Quick microphone test...");
    
    const psScript = `
        Add-Type -AssemblyName System.Speech
        $recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine
        $recognizer.SetInputToDefaultAudioDevice()
        Write-Host "READY"
        try {
            $result = $recognizer.Recognize([TimeSpan]::FromSeconds(3))
            if ($result) { Write-Host "SUCCESS" } else { Write-Host "FAILED" }
        } catch { Write-Host "ERROR" }
    `;
    
    try {
        const result = await runPowerShellScript(psScript);
        return result.includes("SUCCESS");
    } catch {
        return false;
    }
}

export async function startSalesCall(leadId: string, leadName: string): Promise<void> {
    const conversation = new SalesConversation(leadId, leadName);
    
    console.clear();
    console.log("=".repeat(60));
    console.log("SALES CALL ENGINE");
    console.log("=".repeat(60));
    console.log(`\n📞 Calling: ${leadName}`);
    
    // Test microphone first
    console.log("\n🔍 Testing microphone...");
    const micWorks = await quickMicTest();
    
    if (micWorks) {
        console.log("✅ Microphone detected and working!\n");
    } else {
        console.log("⚠️ Microphone test failed. Will use typing mode.\n");
        typingMode = true;
    }
    
    console.log("💡 Commands:");
    console.log("   - Speak naturally into your microphone");
    console.log("   - Type 'quit' to end the call");
    console.log("   - Type 'type' to switch to typing mode");
    console.log("   - Type 'mic' to switch back to microphone\n");
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    await new Promise<void>((resolve) => {
        rl.question("Press Enter to start... ", () => resolve());
    });
    
    logStage(conversation.getCurrentStage());
    
    await speak("Hey, this is Alex. We build websites and apps. Got a minute?");
    conversation.addAIResponse("Hey, this is Alex...");
    
    let turn = 0;
    const MAX_TURNS = 15;
    
    while (turn < MAX_TURNS && !conversation.shouldEndCall()) {
        turn++;
        
        console.log(`\n--- Turn ${turn}/${MAX_TURNS} ---`);
        
        const userInput = await getUserInput();
        
        if (userInput.toLowerCase() === 'quit') {
            await speak("Thanks for your time! Have a great day!");
            break;
        }
        
        if (!userInput || userInput.trim().length === 0) {
            continue;
        }
        
        conversation.addProspectMessage(userInput);
        logStage(conversation.getCurrentStage());
        
        console.log("🤔 Thinking...");
        const aiResponse = await conversation.generateResponse(userInput);
        
        await speak(aiResponse);
        
        if (conversation.shouldEndCall()) {
            await speak("Thank you for the conversation!");
            break;
        }
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ Call completed!");
    console.log("=".repeat(60));
    
    rl.close();
    process.exit(0);
}

// Run directly
if (require.main === module) {
    const leadName = process.argv[2] || "Ahmed";
    startSalesCall("lead_001", leadName).catch(console.error);
}