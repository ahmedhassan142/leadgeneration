import sys
import numpy as np
import sounddevice as sd
import time
import os

SAMPLE_RATE = 16000
CHUNK_SIZE = int(SAMPLE_RATE * 0.5)
SILENCE_THRESHOLD = 0.01
SILENCE_DURATION = 1.2
MAX_DURATION = 30

print("🎙️ Recording...", file=sys.stderr)

recording = []
silent_chunks = 0
start_time = time.time()

try:
    with sd.InputStream(samplerate=SAMPLE_RATE, channels=1, dtype='float32') as stream:
        while (time.time() - start_time) < MAX_DURATION:
            data, _ = stream.read(CHUNK_SIZE)
            volume = np.sqrt(np.mean(data**2))
            recording.append(data.copy())
            
            if volume < SILENCE_THRESHOLD:
                silent_chunks += 1
            else:
                silent_chunks = 0
            
            if silent_chunks > int(SILENCE_DURATION / 0.5):
                break
    
    if not recording:
        print("", file=sys.stderr)
        sys.exit(0)
    
    audio = np.concatenate(recording)
    temp_file = os.path.join("D:/lead/tmp", "temp_audio.wav")
    import soundfile as sf
    sf.write(temp_file, audio, SAMPLE_RATE)
    
    from faster_whisper import WhisperModel
    model = WhisperModel("base", device="cpu", compute_type="int8")
    segments, _ = model.transcribe(temp_file, beam_size=5)
    text = ' '.join([seg.text for seg in segments])
    
    if text:
        print(text)
    else:
        print("")
        
except Exception as e:
    print(f"ERROR", file=sys.stderr)
    sys.exit(1)
