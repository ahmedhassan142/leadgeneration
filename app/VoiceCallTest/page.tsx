// app/test/voice-call/page.tsx
'use client';

import VoiceCallTester from '@/components/Test/Voice-Call-Tester';

export default function VoiceCallTestPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <VoiceCallTester />
    </div>
  );
}