# lib/voice/simple_voice.py
import sys
import json
import time
import pyttsx3
import speech_recognition as sr

# Initialize TTS
engine = pyttsx3.init()
engine.setProperty('rate', 150)
engine.setProperty('volume', 0.9)

# Try to use a better voice
try:
    voices = engine.getProperty('voices')
    for voice in voices:
        if 'zira' in voice.name.lower():
            engine.setProperty('voice', voice.id)
            break
except:
    pass

print("READY", flush=True)

while True:
    try:
        line = sys.stdin.readline()
        if not line:
            break
        
        data = json.loads(line)
        action = data.get('action')
        params = data.get('params', {})
        req_id = data.get('id')
        
        if action == 'speak':
            text = params.get('text', '')
            print(f"SPEAKING: {text}", flush=True)
            engine.say(text)
            engine.runAndWait()
            print(json.dumps({"id": req_id, "result": {"success": True}}), flush=True)
            time.sleep(0.3)
        
        elif action == 'listen':
            print("LISTENING...", flush=True)
            
            recognizer = sr.Recognizer()
            try:
                with sr.Microphone() as source:
                    recognizer.adjust_for_ambient_noise(source, duration=0.5)
                    print("READY", flush=True)
                    audio = recognizer.listen(source, timeout=5, phrase_time_limit=6)
                
                text = recognizer.recognize_google(audio)
                print(f"RECOGNIZED: {text}", flush=True)
                print(json.dumps({"id": req_id, "result": {"text": text, "no_speech": False}}), flush=True)
                
            except sr.WaitTimeoutError:
                print(json.dumps({"id": req_id, "result": {"text": "", "no_speech": True}}), flush=True)
            except sr.UnknownValueError:
                print(json.dumps({"id": req_id, "result": {"text": "", "no_speech": True}}), flush=True)
            except Exception as e:
                print(json.dumps({"id": req_id, "error": str(e)}), flush=True)
        
        else:
            print(json.dumps({"id": req_id, "error": f"Unknown: {action}"}), flush=True)
            
    except Exception as e:
        print(json.dumps({"id": req_id, "error": str(e)}), flush=True)