import sys
import numpy as np
import sounddevice as sd
import time
import os

SAMPLE_RATE = 16000
CHUNK_SIZE = int(SAMPLE_RATE * 0.2)  # 0.2 second chunks (faster)
SILENCE_THRESHOLD = 0.008  # Lower threshold for faster detection
SILENCE_DURATION = 0.6  # Only 0.6 seconds of silence to stop (faster)
MAX_DURATION = 10  # Max 10 seconds (shorter)

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
            
            if silent_chunks > int(SILENCE_DURATION / 0.2):
                break
    
    if not recording or len(recording) < 3:
        print("", file=sys.stderr)
        sys.exit(0)
    
    audio = np.concatenate(recording)
    temp_file = os.path.join("D:/lead/tmp", "temp_audio.wav")
    import soundfile as sf
    sf.write(temp_file, audio, SAMPLE_RATE)
    
    from faster_whisper import WhisperModel
    model = WhisperModel("tiny", device="cpu", compute_type="int8")  # Use tiny model (faster)
    segments, _ = model.transcribe(temp_file, beam_size=3)  # Lower beam size for speed
    text = ' '.join([seg.text for seg in segments])
    
    if text:
        print(text)
    else:
        print("")
        
except Exception as e:
    print("", file=sys.stderr)
    sys.exit(1)
