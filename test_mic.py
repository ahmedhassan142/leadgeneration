# test_mic.py
import sounddevice as sd
import numpy as np

def test_microphone():
    print("🎤 Testing microphone... Speak something!")
    
    duration = 3  # seconds
    sample_rate = 16000
    
    recording = sd.rec(int(duration * sample_rate), samplerate=sample_rate, channels=1)
    sd.wait()
    
    volume = np.sqrt(np.mean(recording**2))
    print(f"✅ Recording complete! Volume: {volume}")
    
    if volume > 0.01:
        print("🎤 Microphone is working!")
    else:
        print("❌ No sound detected. Check your microphone.")

if __name__ == "__main__":
    test_microphone()