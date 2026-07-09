# lib/voice/voice_server.py
import sys
import json
import time
import threading
import queue
import speech_recognition as sr
import pyttsx3
import wave
import tempfile
import os

# Initialize TTS
engine = pyttsx3.init()
engine.setProperty('rate', 150)
engine.setProperty('volume', 0.9)

# Try to set a better voice
try:
    voices = engine.getProperty('voices')
    for voice in voices:
        if 'zira' in voice.name.lower() or 'david' in voice.name.lower():
            engine.setProperty('voice', voice.id)
            print(f"Using voice: {voice.name}", flush=True)
            break
except:
    pass

# Find a working microphone once
WORKING_MIC_INDEX = None

def find_working_microphone():
    """Find first working microphone"""
    global WORKING_MIC_INDEX
    
    if WORKING_MIC_INDEX is not None:
        return WORKING_MIC_INDEX
    
    print("Searching for working microphone...", flush=True)
    mic_names = sr.Microphone.list_microphone_names()
    
    for i in range(min(10, len(mic_names))):
        try:
            with sr.Microphone(device_index=i) as source:
                r = sr.Recognizer()
                r.adjust_for_ambient_noise(source, duration=0.5)
                print(f"✓ Microphone {i} ({mic_names[i]}) is available", flush=True)
                WORKING_MIC_INDEX = i
                return i
        except Exception as e:
            print(f"✗ Microphone {i} failed: {e}", flush=True)
    
    # Fallback to default
    print("Using default microphone", flush=True)
    WORKING_MIC_INDEX = None
    return None

# Speech queue for non-blocking
speech_queue = queue.Queue()

def speech_worker():
    """Background thread for speech"""
    while True:
        text = speech_queue.get()
        if text is None:
            break
        try:
            print(f"🔊 Speaking: {text[:50]}...", flush=True)
            engine.say(text)
            engine.runAndWait()
        except Exception as e:
            print(f"Speech error: {e}", flush=True)
        time.sleep(0.2)

# Start speech thread
speech_thread = threading.Thread(target=speech_worker, daemon=True)
speech_thread.start()

print("READY", flush=True)
sys.stdout.flush()

while True:
    try:
        line = sys.stdin.readline()
        if not line:
            break
        
        data = json.loads(line.strip())
        action = data.get('action')
        params = data.get('params', {})
        req_id = data.get('id')
        
        if action == 'speak':
            text = params.get('text', '')
            # Queue speech and respond immediately
            speech_queue.put(text)
            response = {"id": req_id, "result": {"success": True}}
            print(json.dumps(response), flush=True)
            sys.stdout.flush()
        
        elif action == 'listen':
            # Find working microphone if not found
            mic_index = find_working_microphone()
            
            recognizer = sr.Recognizer()
            recognizer.energy_threshold = 200  # Lower for better sensitivity
            recognizer.dynamic_energy_threshold = True
            recognizer.pause_threshold = 0.8
            
            try:
                # Try to get microphone with specific index
                if mic_index is not None:
                    mic = sr.Microphone(device_index=mic_index)
                else:
                    mic = sr.Microphone()
                
                with mic as source:
                    print("🎤 Adjusting for ambient noise...", flush=True)
                    recognizer.adjust_for_ambient_noise(source, duration=1.5)
                    print(f"🎤 Energy threshold set to: {recognizer.energy_threshold}", flush=True)
                    print("🎤 Say something clearly...", flush=True)
                    
                    # Listen with longer timeout
                    audio = recognizer.listen(source, timeout=6, phrase_time_limit=10)
                    print("🎤 Processing audio...", flush=True)
                
                # Try multiple recognition services
                text = ""
                try:
                    # Try Google first
                    text = recognizer.recognize_google(audio)
                    print(f"✅ Google recognized: {text}", flush=True)
                except:
                    try:
                        # Try Sphinx (offline, works on Windows)
                        text = recognizer.recognize_sphinx(audio)
                        print(f"✅ Sphinx recognized: {text}", flush=True)
                    except:
                        print("❌ Could not recognize speech", flush=True)
                        text = ""
                
                if text and len(text.strip()) > 0:
                    result = {"id": req_id, "result": {"text": text, "no_speech": False}}
                else:
                    result = {"id": req_id, "result": {"text": "", "no_speech": True}}
                
                print(json.dumps(result), flush=True)
                
            except sr.WaitTimeoutError:
                print("⏰ No speech detected (timeout)", flush=True)
                result = {"id": req_id, "result": {"text": "", "no_speech": True}}
                print(json.dumps(result), flush=True)
            except Exception as e:
                print(f"❌ Microphone error: {e}", flush=True)
                result = {"id": req_id, "result": {"text": "", "no_speech": True}}
                print(json.dumps(result), flush=True)
            
            sys.stdout.flush()
    
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}", flush=True)
    except Exception as e:
        error_response = {"id": req_id if 'req_id' in locals() else 0, "error": str(e)}
        print(json.dumps(error_response), flush=True)
        sys.stdout.flush()