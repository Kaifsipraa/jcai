
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { fileToBase64 } from '../utils';

const VisionCenter: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setAnalysis('');
    }
  };

  const analyzeMultimodal = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setAnalysis('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64 = await fileToBase64(selectedFile);
      const isVideo = selectedFile.type.startsWith('video/');

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
          parts: [
            { inlineData: { data: base64, mimeType: selectedFile.type } },
            { text: isVideo ? "Provide a detailed summary of this video and identify key events." : "Analyze this image in detail. What objects are present? Describe the scene." }
          ]
        },
      });

      setAnalysis(response.text || "No analysis generated.");
    } catch (err) {
      console.error(err);
      setAnalysis("Error analyzing media. Ensure the file is a supported image or video format.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8 h-full">
      <div className="space-y-6">
        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center space-y-6">
          <div className="inline-flex p-4 bg-blue-600/10 rounded-2xl text-blue-400">
            <i className="fas fa-cloud-arrow-up text-4xl"></i>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Upload Visual Media</h2>
            <p className="text-slate-400">Drop an image or video to analyze with Gemini Pro 3</p>
          </div>
          
          <label className="block">
            <input 
              type="file" 
              className="hidden" 
              accept="image/*,video/*"
              onChange={handleFileChange}
            />
            <div className="cursor-pointer py-4 px-6 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all">
              {selectedFile ? selectedFile.name : 'Select File'}
            </div>
          </label>

          {previewUrl && (
            <div className="mt-4 rounded-xl overflow-hidden border border-slate-700 h-64 bg-black flex items-center justify-center">
              {selectedFile?.type.startsWith('video/') ? (
                <video src={previewUrl} className="max-h-full" muted />
              ) : (
                <img src={previewUrl} alt="Preview" className="max-h-full object-contain" />
              )}
            </div>
          )}

          <button
            onClick={analyzeMultimodal}
            disabled={!selectedFile || loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 rounded-xl font-bold text-lg shadow-lg shadow-blue-900/20 flex items-center justify-center gap-3 transition-all"
          >
            {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-microscope"></i>}
            {loading ? 'Analyzing...' : 'Deep Visual Analysis'}
          </button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 flex flex-col h-full min-h-[500px]">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-3 text-slate-300">
          <i className="fas fa-file-lines text-blue-400"></i>
          Analysis Report
        </h3>
        <div className="flex-1 bg-slate-950/50 border border-slate-800 rounded-xl p-6 overflow-y-auto font-mono text-sm leading-relaxed text-slate-300">
          {analysis ? (
            <div className="prose prose-invert max-w-none">
              <p className="whitespace-pre-wrap">{analysis}</p>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
              <i className="fas fa-brain text-5xl opacity-20"></i>
              <p className="italic">Analysis results will appear here after processing.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisionCenter;
