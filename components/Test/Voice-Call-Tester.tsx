// components/test/VoiceCallTester.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Phone, PhoneOff, Loader2 } from 'lucide-react';

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export default function VoiceCallTester() {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [callId, setCallId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Array<{role: string, content: string}>>([]);
  const [status, setStatus] = useState('idle');
  
  const recognitionRef = useRef<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = window.webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log('🎤 You said:', transcript);
        
        // Add user message
        setConversation(prev => [...prev, { role: 'user', content: transcript }]);
        
        // Send to AI
        if (callId) {
          setIsProcessing(true);
          setStatus('🤔 AI is thinking...');
          
          try {
            const res = await fetch('/api/sales-call/voice', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                action: 'respond', 
                callId, 
                message: transcript 
              })
            });
            
            const data = await res.json();
            
            if (data.aiResponse) {
              setConversation(prev => [...prev, { role: 'assistant', content: data.aiResponse }]);
              setStatus('🔊 AI is speaking...');
              
              // Speak the response
              await speakText(data.aiResponse);
              
              if (data.ended) {
                setIsActive(false);
                setCallId(null);
                setStatus('Call ended');
              } else {
                setStatus('🎙️ Listening... Click mic to speak');
              }
            }
          } catch (error) {
            console.error('Error:', error);
            setStatus('Error occurred');
          } finally {
            setIsProcessing(false);
            setIsListening(false);
          }
        }
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Recognition error:', event.error);
        setIsListening(false);
        setStatus('Error: ' + event.error);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [callId]);

  const speakText = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      } else {
        resolve();
      }
    });
  };

  const startCall = async () => {
    setStatus('🚀 Starting call...');
    setConversation([]);
    
    try {
      const res = await fetch('/api/sales-call/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });
      
      const data = await res.json();
      
      if (data.success && data.callId) {
        setCallId(data.callId);
        setIsActive(true);
        
        if (data.aiResponse) {
          setConversation([{ role: 'assistant', content: data.aiResponse }]);
          setStatus('🔊 AI is speaking...');
          await speakText(data.aiResponse);
          setStatus('🎙️ Listening... Click mic to speak');
        }
      } else {
        setStatus('Failed to start call: ' + data.error);
      }
    } catch (error) {
      console.error('Error starting call:', error);
      setStatus('Error starting call');
    }
  };

  const endCall = async () => {
    if (callId) {
      setStatus('Ending call...');
      try {
        await fetch('/api/sales-call/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'end', callId })
        });
      } catch (error) {
        console.error('Error ending call:', error);
      }
    }
    
    setIsActive(false);
    setCallId(null);
    setStatus('Call ended');
    
    // Stop any ongoing speech
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const toggleListening = () => {
    if (!isActive) return;
    
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
        setStatus('🎤 Listening... Speak now');
      } catch (error) {
        console.error('Could not start listening:', error);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Phone className="h-6 w-6 text-green-600" />
        AI Sales Call Test
      </h2>
      
      <div className="mb-4 p-3 bg-gray-100 rounded-lg">
        <p className="text-sm text-gray-600">
          Status: <span className="font-semibold">{status}</span>
        </p>
        {isProcessing && <p className="text-sm text-blue-600">🤔 AI is thinking...</p>}
        {isListening && <p className="text-sm text-green-600">🎤 Listening to you...</p>}
      </div>
      
      {/* Conversation Display */}
      <div className="h-96 overflow-y-auto border rounded-lg p-4 mb-4 bg-gray-50">
        {conversation.length === 0 ? (
          <div className="text-center text-gray-400 py-20">
            Click "Start Call" to begin
          </div>
        ) : (
          conversation.map((msg, idx) => (
            <div
              key={idx}
              className={`mb-3 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                <p className="text-xs font-semibold mb-1">
                  {msg.role === 'user' ? 'You' : 'AI Sales Agent'}
                </p>
                <p className="text-sm">{msg.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Controls */}
      <div className="flex gap-3">
        {!isActive ? (
          <button
            onClick={startCall}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Phone className="h-4 w-4" />
            Start Call
          </button>
        ) : (
          <>
            <button
              onClick={toggleListening}
              disabled={isProcessing}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg ${
                isListening
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isListening ? (
                <>
                  <Square className="h-4 w-4" />
                  Stop
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  Speak
                </>
              )}
            </button>
            
            <button
              onClick={endCall}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
            >
              <PhoneOff className="h-4 w-4" />
              End
            </button>
          </>
        )}
      </div>
      
      <div className="mt-4 text-xs text-gray-500 text-center">
        <p>💡 Click "Speak" and talk into your microphone. AI will respond with voice.</p>
        <p>🎧 Make sure your microphone is working and permissions are granted.</p>
      </div>
    </div>
  );
}