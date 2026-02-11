
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { fileToBase64 } from '../utils';

const CreativeStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'video' | 'image' | 'edit'>('video');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [imageSize, setImageSize] = useState('1K');
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const generateVideo = async () => {
    if (!prompt && !selectedFile) return;
    setLoading(true);
    setResultUrl(null);
    setStatusMessage('Initializing Veo 3.1...');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let base64 = '';
      if (selectedFile) {
        base64 = await fileToBase64(selectedFile);
      }

      setStatusMessage('Requesting video generation (this may take a few minutes)...');
      
      const config: any = {
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt || 'Animate this scene beautifully',
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: aspectRatio as any
        }
      };

      if (base64) {
        config.image = {
          imageBytes: base64,
          mimeType: selectedFile?.type || 'image/png'
        };
      }

      let operation = await ai.models.generateVideos(config);

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        setStatusMessage('Still working... Dreaming up your pixels...');
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const blob = await response.blob();
        setResultUrl(URL.createObjectURL(blob));
      }
    } catch (error) {
      console.error(error);
      setStatusMessage('Error generating video. Check API key and try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateImage = async () => {
    if (!prompt) return;
    setLoading(true);
    setResultUrl(null);
    setStatusMessage('Crafting your image with Gemini 3 Pro...');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
            imageSize: imageSize as any
          }
        },
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          setResultUrl(`data:image/png;base64,${part.inlineData.data}`);
          break;
        }
      }
    } catch (error) {
      console.error(error);
      setStatusMessage('Failed to generate image.');
    } finally {
      setLoading(false);
    }
  };

  const editImage = async () => {
    if (!selectedFile || !prompt) return;
    setLoading(true);
    setResultUrl(null);
    setStatusMessage('Editing with Gemini 2.5 Flash Image...');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64 = await fileToBase64(selectedFile);
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64, mimeType: selectedFile.type } },
            { text: prompt }
          ]
        },
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          setResultUrl(`data:image/png;base64,${part.inlineData.data}`);
          break;
        }
      }
    } catch (error) {
      console.error(error);
      setStatusMessage('Failed to edit image.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex border-b border-slate-800">
        <button 
          onClick={() => { setActiveTab('video'); setResultUrl(null); }}
          className={`px-6 py-3 font-semibold ${activeTab === 'video' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
        >
          Veo Video
        </button>
        <button 
          onClick={() => { setActiveTab('image'); setResultUrl(null); }}
          className={`px-6 py-3 font-semibold ${activeTab === 'image' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
        >
          Imagen 3
        </button>
        <button 
          onClick={() => { setActiveTab('edit'); setResultUrl(null); }}
          className={`px-6 py-3 font-semibold ${activeTab === 'edit' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
        >
          Flash Edit
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <i className="fas fa-wand-magic-sparkles text-blue-400"></i>
            Design Parameters
          </h2>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              activeTab === 'video' ? "Describe the video motion..." :
              activeTab === 'image' ? "Describe your masterpiece..." :
              "Describe the changes (e.g., 'Make it retro', 'Add a cat')..."
            }
            className="w-full h-32 bg-slate-800 border border-slate-700 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
          />

          {(activeTab === 'video' || activeTab === 'edit') && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-400 block">Reference Image (Optional for Video)</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600/10 file:text-blue-400 hover:file:bg-blue-600/20"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-400 block">Aspect Ratio</label>
              <select 
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 outline-none"
              >
                <option>1:1</option>
                <option>16:9</option>
                <option>9:16</option>
                <option>4:3</option>
                <option>3:4</option>
                <option>21:9</option>
              </select>
            </div>
            {activeTab === 'image' && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-400 block">Size Quality</label>
                <select 
                  value={imageSize}
                  onChange={(e) => setImageSize(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 outline-none"
                >
                  <option>1K</option>
                  <option>2K</option>
                  <option>4K</option>
                </select>
              </div>
            )}
          </div>

          <button
            onClick={activeTab === 'video' ? generateVideo : activeTab === 'image' ? generateImage : editImage}
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
          >
            {loading ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-play"></i>}
            {loading ? 'Processing...' : 'Generate Content'}
          </button>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden flex flex-col items-center justify-center relative min-h-[400px]">
          {loading && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-6">
               <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
               <p className="text-blue-400 font-medium animate-pulse">{statusMessage}</p>
            </div>
          )}

          {!resultUrl && !loading && (
            <div className="text-slate-500 text-center p-8">
              <i className="fas fa-photo-film text-6xl mb-4 opacity-20"></i>
              <p>Your AI generated content will appear here</p>
            </div>
          )}

          {resultUrl && (
            <div className="w-full h-full flex items-center justify-center bg-black">
              {activeTab === 'video' ? (
                <video src={resultUrl} controls autoPlay loop className="max-w-full max-h-full" />
              ) : (
                <img src={resultUrl} alt="Result" className="max-w-full max-h-full object-contain" />
              )}
              <div className="absolute bottom-4 right-4">
                <a 
                  href={resultUrl} 
                  download={`gemini-studio-${Date.now()}`}
                  className="bg-slate-900/80 hover:bg-slate-900 p-2 rounded-lg text-white backdrop-blur-md border border-slate-700 transition-all"
                >
                  <i className="fas fa-download mr-2"></i> Save
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreativeStudio;
