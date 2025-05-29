import { FFmpegKit, FFmpegKitConfig, ReturnCode, FFprobeKit } from 'ffmpeg-kit-react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

export interface ConversionProgress {
  progress: number; // 0-100
  timeElapsed: number; // seconds
  estimatedTimeRemaining: number; // seconds
  currentFrame: number;
  totalFrames: number;
  fps: number;
  bitrate: string;
  size: string;
}

export interface ConversionResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  duration?: number;
}

export interface VideoConversionOptions {
  outputFormat: string; // mp4, avi, mov, mkv
  quality: 'low' | 'medium' | 'high' | 'ultra';
  resolution?: string; // 720p, 1080p, 4k
  codec?: string; // h264
  bitrate?: string; // 1M, 2M, 5M
  fps?: number; // 24, 30, 60
}

export interface AudioConversionOptions {
  outputFormat: string; // mp3, aac, flac, ogg
  quality: 'low' | 'medium' | 'high' | 'ultra';
  bitrate?: string; // 128k, 192k, 320k
  sampleRate?: number; // 44100, 48000
}

class FFmpegService {
  private currentSessionId: number | null = null;
  private progressCallback: ((progress: ConversionProgress) => void) | null = null;

  constructor() {
    this.setupGlobalCallbacks();
  }

  private setupGlobalCallbacks() {
    // Enable statistics callback for progress tracking
    FFmpegKitConfig.enableStatisticsCallback((statistics) => {
      if (this.progressCallback) {
        const progress: ConversionProgress = {
          progress: 0, // Will be calculated based on time/frames
          timeElapsed: statistics.getTime() / 1000, // Convert to seconds
          estimatedTimeRemaining: 0, // Will be calculated
          currentFrame: statistics.getVideoFrameNumber(),
          totalFrames: 0, // Need to get from probe
          fps: statistics.getVideoFps(),
          bitrate: `${statistics.getBitrate()}kbps`,
          size: `${(statistics.getSize() / 1024 / 1024).toFixed(2)}MB`
        };
        this.progressCallback(progress);
      }
    });

    // Enable log callback for debugging
    FFmpegKitConfig.enableLogCallback((log) => {
      console.log('FFmpeg Log:', log.getMessage());
    });
  }

  // Get video information using FFprobe
  async getVideoInfo(inputPath: string): Promise<any> {
    try {
      const session = await FFprobeKit.getMediaInformation(inputPath);
      const information = await session.getMediaInformation();

      if (information) {
        return {
          duration: information.getDuration(),
          bitrate: information.getBitrate(),
          size: information.getSize(),
          format: information.getFormat(),
          streams: information.getStreams()
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting video info:', error);
      return null;
    }
  }

  // Convert video with progress tracking
  async convertVideo(
    inputPath: string,
    outputFormat: string,
    options: VideoConversionOptions,
    onProgress?: (progress: ConversionProgress) => void
  ): Promise<ConversionResult> {
    try {
      this.progressCallback = onProgress || null;

      // Generate output path
      const outputFileName = `converted_${Date.now()}.${outputFormat}`;
      const outputPath = `${FileSystem.documentDirectory}${outputFileName}`;

      // Build FFmpeg command
      const command = this.buildVideoCommand(inputPath, outputPath, options);
      console.log('🎬 Video FFmpeg Command:', command);
      console.log('📁 Input Path:', inputPath);
      console.log('📁 Output Path:', outputPath);
      console.log('⚙️ Options:', JSON.stringify(options, null, 2));

      // Execute conversion
      const session = await FFmpegKit.execute(command);
      this.currentSessionId = session.getSessionId();

      const returnCode = await session.getReturnCode();

      if (ReturnCode.isSuccess(returnCode)) {
        // Save to media library
        const asset = await MediaLibrary.createAssetAsync(outputPath);
        console.log('Video saved to gallery:', asset.uri);

        return {
          success: true,
          outputPath: asset.uri,
          duration: await session.getDuration()
        };
      } else {
        const output = await session.getOutput();
        const logs = await session.getLogs();
        const failStackTrace = await session.getFailStackTrace();

        console.error('Video conversion failed!');
        console.error('Return Code:', returnCode);
        console.error('Output:', output);
        console.error('Logs:', logs?.map(log => log.getMessage()).join('\n'));
        console.error('Stack Trace:', failStackTrace);

        return {
          success: false,
          error: `Video conversion failed. Return code: ${returnCode}. ${output || 'No output available'}`
        };
      }
    } catch (error) {
      console.error('Video conversion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      this.progressCallback = null;
      this.currentSessionId = null;
    }
  }

  // Convert audio with progress tracking
  async convertAudio(
    inputPath: string,
    outputFormat: string,
    options: AudioConversionOptions,
    onProgress?: (progress: ConversionProgress) => void
  ): Promise<ConversionResult> {
    try {
      this.progressCallback = onProgress || null;

      // Generate output path
      const outputFileName = `converted_${Date.now()}.${outputFormat}`;
      const outputPath = `${FileSystem.documentDirectory}${outputFileName}`;

      // Build FFmpeg command
      const command = this.buildAudioCommand(inputPath, outputPath, options);
      console.log('🎵 Audio FFmpeg Command:', command);
      console.log('📁 Input Path:', inputPath);
      console.log('📁 Output Path:', outputPath);
      console.log('⚙️ Options:', JSON.stringify(options, null, 2));

      // Execute conversion
      const session = await FFmpegKit.execute(command);
      this.currentSessionId = session.getSessionId();

      const returnCode = await session.getReturnCode();

      if (ReturnCode.isSuccess(returnCode)) {
        // Save to media library
        const asset = await MediaLibrary.createAssetAsync(outputPath);
        console.log('Audio saved to gallery:', asset.uri);

        return {
          success: true,
          outputPath: asset.uri,
          duration: await session.getDuration()
        };
      } else {
        const output = await session.getOutput();
        const logs = await session.getLogs();
        const failStackTrace = await session.getFailStackTrace();

        console.error('Audio conversion failed!');
        console.error('Return Code:', returnCode);
        console.error('Output:', output);
        console.error('Logs:', logs?.map(log => log.getMessage()).join('\n'));
        console.error('Stack Trace:', failStackTrace);

        return {
          success: false,
          error: `Audio conversion failed. Return code: ${returnCode}. ${output || 'No output available'}`
        };
      }
    } catch (error) {
      console.error('Audio conversion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      this.progressCallback = null;
      this.currentSessionId = null;
    }
  }

  // Build video conversion command (format-aware for FFmpeg Kit compatibility)
  private buildVideoCommand(inputPath: string, outputPath: string, options: VideoConversionOptions): string {
    let command = `-i "${inputPath}"`;

    // Format-specific codec requirements
    switch (options.outputFormat.toLowerCase()) {
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'mkv':
      default:
        // For supported formats, try stream copy first (fastest)
        command += ' -c copy';
        break;
    }

    command += ` "${outputPath}"`;
    return command;
  }

  // Build audio conversion command (safe codecs for FFmpeg Kit)
  private buildAudioCommand(inputPath: string, outputPath: string, options: AudioConversionOptions): string {
    let command = `-i "${inputPath}"`;

    // Audio codec - use only widely supported codecs
    switch (options.outputFormat.toLowerCase()) {
      case 'mp3':
        // Try libmp3lame, fallback to built-in mp3 encoder
        command += ' -c:a libmp3lame';
        break;
      case 'aac':
        // AAC is widely supported
        command += ' -c:a aac';
        break;
      case 'wav':
        // WAV uses PCM, very safe
        command += ' -c:a pcm_s16le';
        break;
      case 'flac':
        // FLAC codec
        command += ' -c:a flac';
        break;
      case 'ogg':
        // Vorbis codec - might not be available
        command += ' -c:a libvorbis';
        break;
      default:
        // Safe fallback
        command += ' -c:a aac';
    }

    // Bitrate (only for lossy formats)
    if (options.outputFormat !== 'wav' && options.outputFormat !== 'flac') {
      if (options.bitrate) {
        command += ` -b:a ${options.bitrate}`;
      } else {
        // Quality presets
        switch (options.quality) {
          case 'low':
            command += ' -b:a 128k';
            break;
          case 'medium':
            command += ' -b:a 192k';
            break;
          case 'high':
            command += ' -b:a 256k';
            break;
          case 'ultra':
            command += ' -b:a 320k';
            break;
        }
      }
    }

    // Sample rate
    if (options.sampleRate) {
      command += ` -ar ${options.sampleRate}`;
    }

    // Remove video stream for audio-only conversion
    command += ' -vn';

    // Output
    command += ` "${outputPath}"`;

    return command;
  }

  // Cancel current conversion
  async cancelConversion(): Promise<void> {
    if (this.currentSessionId) {
      await FFmpegKit.cancel(this.currentSessionId);
      this.currentSessionId = null;
      this.progressCallback = null;
    }
  }

  // Cancel all conversions
  async cancelAllConversions(): Promise<void> {
    await FFmpegKit.cancel();
    this.currentSessionId = null;
    this.progressCallback = null;
  }
}

export default new FFmpegService();
