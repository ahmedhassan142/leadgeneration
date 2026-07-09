// test-windows-mic-fixed.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

async function testWindowsMic() {
    console.log("\n" + "=".repeat(60));
    console.log("WINDOWS MICROPHONE TEST");
    console.log("=".repeat(60));
    
    // Create a PowerShell script file
    const psScript = `
# Windows Speech Recognition Test
Add-Type -AssemblyName System.Speech

Write-Host "`nTesting microphone..." -ForegroundColor Cyan
Write-Host "Please speak clearly into your microphone`n" -ForegroundColor Yellow

try {
    $recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine
    $recognizer.SetInputToDefaultAudioDevice()
    
    # Load dictation grammar
    $grammar = New-Object System.Speech.Recognition.DictationGrammar
    $recognizer.LoadGrammar($grammar)
    
    Write-Host "Listening... (you have 5 seconds)" -ForegroundColor Green
    
    # Recognize speech
    $result = $recognizer.Recognize([TimeSpan]::FromSeconds(5))
    
    if ($result -and $result.Text) {
        Write-Host "`nSUCCESS! You said: " -ForegroundColor Green -NoNewline
        Write-Host $result.Text -ForegroundColor White
        exit 0
    } else {
        Write-Host "`nFAILED: No speech detected" -ForegroundColor Red
        Write-Host "`nTroubleshooting:" -ForegroundColor Yellow
        Write-Host "1. Check if microphone is plugged in"
        Write-Host "2. Right-click speaker icon > Sound Settings > Input"
        Write-Host "3. Test your microphone in Windows Sound Recorder"
        exit 1
    }
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}
`;
    
    // Save to temp file
    const tempScript = path.join(process.cwd(), `mic_test_${Date.now()}.ps1`);
    fs.writeFileSync(tempScript, psScript, 'utf8');
    
    console.log("\n🎤 Testing microphone...\n");
    
    try {
        const { stdout, stderr } = await execAsync(`powershell -ExecutionPolicy Bypass -File "${tempScript}"`);
        console.log(stdout);
        if (stderr) console.error(stderr);
    } catch (error: any) {
        console.log(error.stdout || error.message);
    } finally {
        // Cleanup
        if (fs.existsSync(tempScript)) {
            fs.unlinkSync(tempScript);
        }
    }
}

testWindowsMic();