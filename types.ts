
export enum AppSection {
  CREATIVE = 'creative',
  INTELLIGENCE = 'intelligence',
  AUDIO = 'audio',
  VISION = 'vision',
  SETTINGS = 'settings'
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
  };
}

export interface Message {
  role: 'user' | 'model' | 'system';
  text: string;
  grounding?: GroundingChunk[];
  thinking?: boolean;
}
