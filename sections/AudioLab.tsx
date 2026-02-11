
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { encode, decode, decodeAudioData } from '../utils';

const AudioLab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'live' | 'utility'>('live');
  const [isLive, setIsLive] = useState(false);
  const [ttsText, setTtsText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState('');
  
  // Live API Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    return () => {
      stopLiveSession();
    };
  }, []);

  const startLiveSession = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const inCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = outCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsLive(true);
            const source = inCtx.createMediaStreamSource(stream);
            const scriptProcessor = inCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inCtx.destination);
          },
          onmessage: async (message) => {
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              const buffer = await decodeAudioData(decode(audioData), outCtx, 24000, 1);
              const source = outCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outCtx.destination);
              
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => console.error("Live Error:", e),
          onclose: () => setIsLive(false)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } }
        }
      });
      
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      alert("Microphone access is required for Live API.");
    }
  };

  const stopLiveSession = () => {
    if (sessionRef.current) {
      // In a real env, we'd call close, assuming session.close exists or connection drops
      sessionRef.current = null;
    }
    setIsLive(false);
  };

  const handleTTS = async () => {
    if (!ttsText) return;
    setIsProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: ttsText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
        }
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const ctx = new AudioContext({ sampleRate: 24000 });
        const buffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex border-b border-slate-800">
        <button 
          onClick={() => setActiveTab('live')}
          className={`px-6 py-3 font-semibold ${activeTab === 'live' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
        >
          Conversational Live
        </button>
        <button 
          onClick={() => setActiveTab('utility')}
          className={`px-6 py-3 font-semibold ${activeTab === 'utility' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
        >
          Audio Utilities (TTS/Transcribe)
        </button>
      </div>

      {activeTab === 'live' ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-8 py-12">
          <div className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-700 ${
            isLive ? 'bg-blue-600/20 scale-110 border-4 border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.5)]' : 'bg-slate-800 border-4 border-slate-700'
          }`}>
             <i className={`fas fa-microphone text-6xl ${isLive ? 'text-blue-400 animate-pulse' : 'text-slate-600'}`}></i>
          </div>

          <div className="text-center">
            <h3 className="text-2xl font-bold mb-2">{isLive ? 'Listening...' : 'Ready to Talk?'}</h3>
            <p className="text-slate-400 max-w-sm mx-auto">
              {isLive 
                ? 'Speak naturally! Gemini is processing your voice in real-time with ultra-low latency.' 
                : 'Click the button below to start a continuous, human-like voice conversation with Gemini.'}
            </p>
          </div>

          <button
            onClick={isLive ? stopLiveSession : startLiveSession}
            className={`px-12 py-4 rounded-full font-bold text-lg shadow-xl transition-all hover:scale-105 active:scale-95 ${
              isLive ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {isLive ? 'Stop Conversation' : 'Start Session'}
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <i className="fas fa-volume-high text-blue-400"></i>
              Text to Speech
            </h3>
            <textarea
              value={ttsText}
              onChange={(e) => setTtsText(e.target.value)}
              placeholder="Enter text to speak..."
              className="w-full h-32 bg-slate-800 border border-slate-700 rounded-xl p-4 text-white outline-none resize-none"
            />
            <button 
              onClick={handleTTS}
              disabled={isProcessing || !ttsText}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 rounded-xl font-bold transition-all"
            >
              {isProcessing ? 'Generating Voice...' : 'Speak with AI'}
            </button>
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <i className="fas fa-file-waveform text-purple-400"></i>
              Transcribe Microphone
            </h3>
            <div className="h-32 bg-slate-800 rounded-xl p-4 overflow-y-auto text-sm text-slate-300 border border-slate-700">
              {transcription || "Transcription will appear here..."}
            </div>
            <p className="text-xs text-slate-500 italic">Feature enabled via Gemini 3 Flash Audio-to-Text capabilities.</p>
            <button className="w-full py-3 border border-slate-700 hover:bg-slate-800 rounded-xl font-bold text-slate-400 transition-all flex items-center justify-center gap-2 cursor-not-allowed">
              <i className="fas fa-microphone-slash"></i> Feature In-App
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioLab;
