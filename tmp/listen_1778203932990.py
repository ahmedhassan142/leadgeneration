import sys
import numpy as np
import sounddevice as sd
import time
import os

os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

SAMPLE_RATE = 16000
SILENCE_THRESHOLD = 0.008
SILENCE_DURATION = 0.8
MAX_DURATION = 12

recording = []
silent_chunks = 0
start_time = time.time()
has_sound = False
chunk_size = int(SAMPLE_RATE * 0.2)

try:
    with sd.InputStream(samplerate=SAMPLE_RATE, channels=1, dtype='float32') as stream:
        sys.stderr.write('Listening...')
        sys.stderr.flush()
        
        while (time.time() - start_time) < MAX_DURATION:
            data, _ = stream.read(chunk_size)
            recording.append(data.copy())
            
            volume = np.sqrt(np.mean(data**2))
            
            if volume > SILENCE_THRESHOLD:
                has_sound = True
                silent_chunks = 0
                sys.stderr.write('.')
                sys.stderr.flush()
            else:
                silent_chunks += 1
            
            if has_sound and silent_chunks > int(SILENCE_DURATION / 0.2):
                break
    
    sys.stderr.write('\nProcessing...\n')
    
    if not has_sound or len(recording) < 5:
        print("NO_SPEECH", flush=True)
        sys.exit(0)
    
    audio = np.concatenate(recording)
    
    temp_file = os.path.join(r"D:\lead\tmp", f"temp_audio_{int(time.time())}.wav")
    import soundfile as sf
    sf.write(temp_file, audio, SAMPLE_RATE)
    
    # Use faster-whisper for STT
    from faster_whisper import WhisperModel
    model = WhisperModel("base", device="cpu", compute_type="int8")
    segments, _ = model.transcribe(temp_file, beam_size=5, language="en", vad_filter=True)
    
    text = ' '.join([seg.text for seg in segments])
    
    # Clean up temp file
    try:
        os.remove(temp_file)
    except:
        pass
    
    if text and len(text) > 0:
        print(f"TEXT:{text}", flush=True)
    else:
        print("NO_SPEECH", flush=True)
        
except Exception as e:
    print(f"ERROR:{str(e)[:100]}", flush=True)
    sys.exit(1)
