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
    { id: 'heic', name: 'HEIC', extension: 'heic' },
    { id: 'tiff', name: 'TIFF', extension: 'tiff' },
    { id: 'svg', name: 'SVG', extension: 'svg' },
  ],
  audio: [
    { id: 'mp3', name: 'MP3', extension: 'mp3', quality: [64, 96, 128, 192, 256, 320] },
    { id: 'wav', name: 'WAV', extension: 'wav' },
    { id: 'aac', name: 'AAC', extension: 'aac', quality: [64, 96, 128, 192, 256, 320] },
    { id: 'flac', name: 'FLAC', extension: 'flac' },
    { id: 'opus', name: 'OPUS', extension: 'opus', quality: [32, 48, 64, 96, 128, 192, 256] },
  ],
  video: [
    { id: 'mp4', name: 'MP4', extension: 'mp4', quality: [480, 720, 1080] },
    { id: 'webm', name: 'WebM', extension: 'webm', quality: [480, 720, 1080] },
  ],
  document: [
    { id: 'pdf', name: 'PDF', extension: 'pdf' },
    { id: 'txt', name: 'TXT', extension: 'txt' },
  ],
};

export type RootStackParamList = {
  // Define based on actual navigation structure.
  // From GenericConversionSettingsScreen, we know about:
  GenericConversionSettings: {
    files: FileItem[];
    conversionType: MediaType; // This should be MediaType
  };
  GenericConversionProgress: {
    files: Array<{ uri: string; name: string; outputName: string }>;
    outputFormatId: string;
    outputFormatExtension: string;
    quality: number | undefined;
    conversionType: MediaType; // This should be MediaType
  };

  // Add other screens that are part of the stack and their params
  HomeScreen: undefined; // Example
  GenericFileSelect: { conversionType: MediaType }; // Example, if it exists and takes params
  // ... other screens from your app
  OnboardingScreen: undefined;
  SubscriptionScreen: undefined;
  AudioConverterScreen: { files?: FileItem[], conversionType?: MediaType }; // Example, adjust params as needed
  DocumentConverterScreen: { files?: FileItem[], conversionType?: MediaType };
  ImageConverterScreen: { files?: FileItem[], conversionType?: MediaType };
  VideoConverterScreen: { files?: FileItem[], conversionType?: MediaType };
};