
import React, { useState, useEffect } from 'react';
import { AppSection } from './types';
import CreativeStudio from './sections/CreativeStudio';
import IntelligenceHub from './sections/IntelligenceHub';
import AudioLab from './sections/AudioLab';
import VisionCenter from './sections/VisionCenter';

const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<AppSection>(AppSection.CREATIVE);
  const [isKeyRequired, setIsKeyRequired] = useState(false);

  useEffect(() => {
    checkApiKeyStatus();
  }, []);

  const checkApiKeyStatus = async () => {
    // Some features (Veo, Imagen) require user-selected keys
    // @ts-ignore
    if (window.aistudio) {
       // @ts-ignore
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setIsKeyRequired(!hasKey);
    }
  };

  const handleSelectKey = async () => {
    // @ts-ignore
    if (window.aistudio) {
       // @ts-ignore
      await window.aistudio.openSelectKey();
      setIsKeyRequired(false);
    }
  };

  const NavItem: React.FC<{ section: AppSection; icon: string; label: string }> = ({ section, icon, label }) => (
    <button
      onClick={() => setActiveSection(section)}
      className={`flex flex-col items-center justify-center p-4 transition-all duration-300 ${
        activeSection === section 
        ? 'text-blue-400 bg-blue-900/20 border-b-2 border-blue-400' 
        : 'text-gray-400 hover:text-gray-200'
      }`}
    >
      <i className={`fas ${icon} text-xl mb-1`}></i>
      <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <i className="fas fa-sparkles text-white"></i>
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Gemini Omni-Studio
          </h1>
        </div>

        {isKeyRequired && (
          <button 
            onClick={handleSelectKey}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-sm font-semibold transition-colors flex items-center gap-2"
          >
            <i className="fas fa-key"></i>
            Select API Key
          </button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-slate-950 p-6">
        <div className="max-w-6xl mx-auto h-full">
          {activeSection === AppSection.CREATIVE && <CreativeStudio />}
          {activeSection === AppSection.INTELLIGENCE && <IntelligenceHub />}
          {activeSection === AppSection.AUDIO && <AudioLab />}
          {activeSection === AppSection.VISION && <VisionCenter />}
        </div>
      </main>

      {/* Persistent Navigation */}
      <nav className="h-20 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-4 shrink-0 px-4">
        <NavItem section={AppSection.CREATIVE} icon="fa-palette" label="Creative" />
        <NavItem section={AppSection.INTELLIGENCE} icon="fa-brain" label="Intelligence" />
        <NavItem section={AppSection.AUDIO} icon="fa-microphone-lines" label="Audio" />
        <NavItem section={AppSection.VISION} icon="fa-eye" label="Vision" />
      </nav>
    </div>
  );
};

export default App;
