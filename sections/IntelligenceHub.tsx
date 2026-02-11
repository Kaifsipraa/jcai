
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Message } from '../types';

const IntelligenceHub: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'system', text: 'Welcome to the Intelligence Hub. Ask me anything, or toggle advanced features below.' }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [isFastMode, setIsFastMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMsg: Message = { role: 'user', text: inputText };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Select model based on mode
      let modelName = 'gemini-3-pro-preview';
      if (isFastMode) modelName = 'gemini-2.5-flash-lite-latest';
      else if (useSearch) modelName = 'gemini-3-flash-preview';

      const config: any = {
        model: modelName,
        contents: inputText,
        config: {}
      };

      if (isThinking && !isFastMode) {
        config.config.thinkingConfig = { thinkingBudget: 32768 };
      }

      if (useSearch) {
        config.config.tools = [{ googleSearch: {} }];
      }

      const response = await ai.models.generateContent(config);
      
      const responseText = response.text || "No response generated.";
      const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

      setMessages(prev => [...prev, { 
        role: 'model', 
        text: responseText, 
        grounding,
        thinking: isThinking
      }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error processing that request.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-16rem)] max-h-[800px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl ${
              m.role === 'user' 
              ? 'bg-blue-600 text-white rounded-tr-none' 
              : m.role === 'system'
              ? 'bg-slate-800 text-slate-400 italic text-center mx-auto text-sm'
              : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
            }`}>
              {m.thinking && (
                <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-purple-900/30 text-purple-400 text-xs font-bold rounded uppercase tracking-wider w-fit">
                  <i className="fas fa-microchip animate-pulse"></i>
                  Deep Thought Mode
                </div>
              )}
              <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
              
              {m.grounding && m.grounding.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-700">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2">Sources:</p>
                  <div className="flex flex-wrap gap-2">
                    {m.grounding.map((chunk, idx) => (
                      <a 
                        key={idx} 
                        href={chunk.web?.uri || chunk.maps?.uri} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded transition-colors text-blue-400 flex items-center gap-1"
                      >
                        <i className="fas fa-link scale-75"></i>
                        {chunk.web?.title || chunk.maps?.title || 'External Source'}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-200 p-4 rounded-2xl rounded-tl-none border border-slate-700 flex items-center gap-3">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
              <span className="text-sm font-medium text-slate-400">Gemini is brainstorming...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input / Control Area */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <div className="flex flex-wrap gap-3 mb-4">
          <button 
            onClick={() => { setIsThinking(!isThinking); setIsFastMode(false); }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
              isThinking ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'bg-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            <i className="fas fa-brain"></i> Thinking Mode
          </button>
          <button 
            onClick={() => setUseSearch(!useSearch)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
              useSearch ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            <i className="fab fa-google"></i> Google Search
          </button>
          <button 
            onClick={() => { setIsFastMode(!isFastMode); setIsThinking(false); }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
              isFastMode ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20' : 'bg-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            <i className="fas fa-bolt"></i> Fast Response
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask Gemini anything..."
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-4 pr-12 py-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-inner"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !inputText.trim()}
            className="absolute right-2 top-2 h-10 w-10 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white rounded-lg flex items-center justify-center transition-all"
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntelligenceHub;
