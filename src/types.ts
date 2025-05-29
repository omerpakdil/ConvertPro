// FormatConverterApp/src/types.ts

export interface FileItem {
  uri: string;
  name: string;
}

export type MediaType = 'image' | 'audio' | 'video' | 'document' | string; // string for flexibility

export interface FormatOption {
  id: string;
  name: string;
  extension: string;
  quality?: boolean | number[]; // boolean for image quality, array for bitrates/resolutions
}

// This is the structure that was previously a fallback in GenericConversionSettingsScreen.tsx
export const conversionOptions: { [key: string]: FormatOption[] } = { // Using string key for flexibility with MediaType
  image: [
    { id: 'jpg', name: 'JPG', extension: 'jpg', quality: true },
    { id: 'png', name: 'PNG', extension: 'png' },
    { id: 'webp', name: 'WebP', extension: 'webp', quality: true },
    // Note: HEIC, TIFF and SVG are not supported as output formats by expo-image-manipulator
    // Input: Can read HEIC/TIFF/SVG, but output as JPG/PNG/WebP
  ],
  audio: [
    { id: 'mp3', name: 'MP3', extension: 'mp3', quality: [64, 96, 128, 192, 256, 320] },
    { id: 'wav', name: 'WAV', extension: 'wav' },
    { id: 'aac', name: 'AAC', extension: 'aac', quality: [64, 96, 128, 192, 256, 320] },
    { id: 'flac', name: 'FLAC', extension: 'flac' },
    // Opus temporarily disabled - requires libopus codec not available in current FFmpeg Kit build
    // { id: 'opus', name: 'OPUS', extension: 'opus', quality: [32, 48, 64, 96, 128, 192, 256] },
  ],
  video: [
    { id: 'mp4', name: 'MP4', extension: 'mp4', quality: [480, 720, 1080] },
    { id: 'avi', name: 'AVI', extension: 'avi', quality: [720, 1080] },
    { id: 'mov', name: 'MOV', extension: 'mov', quality: [720, 1080] },
    { id: 'mkv', name: 'MKV', extension: 'mkv', quality: [720, 1080] },
  ],
  document: [
    { id: 'txt', name: 'TXT', extension: 'txt' },
    { id: 'html', name: 'HTML', extension: 'html' },
    { id: 'docx', name: 'DOCX', extension: 'docx' },
  ],
};

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Subscription: undefined;
  GenericConversionSettings: {
    files: FileItem[];
    conversionType: MediaType;
  };
  GenericConversionProgress: {
    files: Array<{ uri: string; name: string; outputName: string }>;
    outputFormatId: string;
    outputFormatExtension: string;
    quality: number | undefined;
    conversionType: MediaType;
  };
};