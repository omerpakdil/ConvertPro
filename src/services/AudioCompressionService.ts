import { FFmpegKit, ReturnCode, FFmpegKitConfig } from 'ffmpeg-kit-react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

export interface AudioCompressionSettings {
  bitrate: number; // 64, 128, 192, 256, 320 (kbps)
  sampleRate: number; // 22050, 44100, 48000 (Hz)
  format: 'mp3' | 'aac';
  quality: 'low' | 'medium' | 'high' | 'ultra';
}

export interface AudioCompressionResult {
  success: boolean;
  outputPath?: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number; // percentage reduction
  error?: string;
}

export interface AudioCompressionProgress {
  progress: number; // 0-100
  currentFile: string;
  timeElapsed: number;
  estimatedTimeRemaining: number;
}

class AudioCompressionService {
  private static instance: AudioCompressionService;
  private static initialized = false;

  static getInstance(): AudioCompressionService {
    if (!AudioCompressionService.instance) {
      AudioCompressionService.instance = new AudioCompressionService();
    }
    return AudioCompressionService.instance;
  }

  // Initialize FFmpeg-kit
  private static async initializeFFmpeg(): Promise<void> {
    if (AudioCompressionService.initialized) return;

    try {
      console.log('🎵 Initializing FFmpeg-kit...');

      // Set log level to reduce noise
      await FFmpegKitConfig.setLogLevel(30); // AV_LOG_WARNING

      // Enable logs
      await FFmpegKitConfig.enableLogs();

      AudioCompressionService.initialized = true;
      console.log('✅ FFmpeg-kit initialized successfully');
    } catch (error) {
      console.error('❌ FFmpeg-kit initialization failed:', error);
      throw error;
    }
  }



  // Get quality presets
  static getQualityPresets(): { [key: string]: AudioCompressionSettings } {
    return {
      low: {
        bitrate: 64,
        sampleRate: 22050,
        format: 'mp3',
        quality: 'low'
      },
      medium: {
        bitrate: 128,
        sampleRate: 44100,
        format: 'mp3',
        quality: 'medium'
      },
      high: {
        bitrate: 192,
        sampleRate: 44100,
        format: 'mp3',
        quality: 'high'
      },
      ultra: {
        bitrate: 256,
        sampleRate: 48000,
        format: 'aac',
        quality: 'ultra'
      }
    };
  }

  // Get estimated compression ratio
  static getEstimatedCompressionRatio(settings: AudioCompressionSettings): number {
    // Rough estimation based on bitrate reduction
    const originalBitrate = 320; // Assume high quality original
    const targetBitrate = settings.bitrate;
    return Math.max(0, ((originalBitrate - targetBitrate) / originalBitrate) * 100);
  }

  // Get file size
  private async getFileSize(filePath: string): Promise<number> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      return fileInfo.exists ? fileInfo.size || 0 : 0;
    } catch (error) {
      console.error('Error getting file size:', error);
      return 0;
    }
  }

  // Check media library permissions
  static async checkMediaLibraryPermissions(): Promise<boolean> {
    try {
      const { status } = await MediaLibrary.getPermissionsAsync();
      if (status === 'granted') {
        return true;
      }

      const { status: newStatus } = await MediaLibrary.requestPermissionsAsync();
      return newStatus === 'granted';
    } catch (error) {
      console.error('Error checking media library permissions:', error);
      return false;
    }
  }

  // Request permission after custom dialog
  static async requestMediaLibraryPermission(): Promise<boolean> {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting media library permission:', error);
      return false;
    }
  }

  // Compress audio file
  async compressAudio(
    inputPath: string,
    settings: AudioCompressionSettings,
    outputFileName?: string
  ): Promise<AudioCompressionResult> {
    try {
      console.log('🎵 Starting audio compression...');
      console.log('Input:', inputPath);
      console.log('Settings:', settings);

      // Initialize FFmpeg-kit first
      await AudioCompressionService.initializeFFmpeg();



      // Get original file size
      const originalSize = await this.getFileSize(inputPath);
      if (originalSize === 0) {
        throw new Error('Could not read input file or file is empty');
      }

      // Generate output path
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const extension = settings.format;
      const finalFileName = outputFileName
        ? outputFileName.replace(/\.[^/.]+$/, `_compressed_${timestamp}.${extension}`)
        : `compressed_audio_${timestamp}.${extension}`;

      const documentsDir = FileSystem.documentDirectory;
      if (!documentsDir) {
        throw new Error('Documents directory not available');
      }

      const outputPath = documentsDir + finalFileName;

      // Build FFmpeg command
      const command = this.buildCompressionCommand(inputPath, outputPath, settings);
      console.log('🎵 FFmpeg Command:', command);

      // Execute FFmpeg compression
      console.log('🎵 Starting FFmpeg compression...');

      try {
        const session = await FFmpegKit.execute(command);
        const returnCode = await session.getReturnCode();

        console.log('🎵 FFmpeg execution completed');
        console.log('Return code:', returnCode);

        if (!ReturnCode.isSuccess(returnCode)) {
          const logs = await session.getAllLogs();
          const output = await session.getOutput();

          console.error('❌ FFmpeg compression failed!');
          console.error('Return Code:', returnCode);
          console.error('Output:', output);
          console.error('Logs:', logs?.map(log => log.getMessage()).join('\n'));

          throw new Error(`Audio compression failed. Return code: ${returnCode}`);
        }

        console.log('✅ FFmpeg compression successful');

      } catch (ffmpegError) {
        console.error('❌ FFmpeg execution error:', ffmpegError);
        throw new Error(`FFmpeg execution failed: ${ffmpegError}`);
      }

      // Get actual compressed file size
      const compressedSize = await this.getFileSize(outputPath);
      const compressionRatio = originalSize > 0 ? ((originalSize - compressedSize) / originalSize) * 100 : 0;

      // Try to save to media library if permission is available
      const hasPermission = await AudioCompressionService.checkMediaLibraryPermissions();
      if (hasPermission) {
        try {
          const asset = await MediaLibrary.createAssetAsync(outputPath);

          // Try to create/get ConvertPro album
          try {
            let album = await MediaLibrary.getAlbumAsync('ConvertPro');
            if (!album) {
              album = await MediaLibrary.createAlbumAsync('ConvertPro', asset, false);
            } else {
              await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
            }
          } catch (albumError) {
            console.warn('Could not create/access ConvertPro album:', albumError);
          }

          console.log('✅ Audio compression completed and saved to both app directory and media library');
        } catch (mediaError) {
          console.error('Error saving to media library:', mediaError);
          console.log('✅ Audio compression completed and saved to app directory only');
        }
      } else {
        console.log('✅ Audio compression completed and saved to app directory only');
      }

      console.log(`Original: ${AudioCompressionService.formatFileSize(originalSize)}`);
      console.log(`Compressed: ${AudioCompressionService.formatFileSize(compressedSize)}`);
      console.log(`Reduction: ${compressionRatio.toFixed(1)}%`);
      console.log(`Output path: ${outputPath}`);

      return {
        success: true,
        outputPath,
        originalSize,
        compressedSize,
        compressionRatio
      };

    } catch (error: any) {
      console.error('❌ Audio compression failed:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
        originalSize: 0,
        compressedSize: 0,
        compressionRatio: 0
      };
    } finally {
      console.log('🧹 Cleanup completed');
    }
  }



  // Format file size for display
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Build compression command
  private buildCompressionCommand(inputPath: string, outputPath: string, settings: AudioCompressionSettings): string {
    let command = `-i "${inputPath}"`;

    // Audio codec
    switch (settings.format) {
      case 'mp3':
        command += ' -c:a libmp3lame';
        break;
      case 'aac':
        command += ' -c:a aac';
        break;
      default:
        command += ' -c:a libmp3lame';
    }

    // Bitrate
    command += ` -b:a ${settings.bitrate}k`;

    // Sample rate
    command += ` -ar ${settings.sampleRate}`;

    // Remove video stream if any
    command += ' -vn';

    // Overwrite output file
    command += ' -y';

    // Output
    command += ` "${outputPath}"`;

    return command;
  }

  // Cancel current compression
  async cancelCompression(): Promise<void> {
    console.log('Audio compression cancelled');
    // In real implementation, this would cancel the actual compression process
  }
}

export default AudioCompressionService;
