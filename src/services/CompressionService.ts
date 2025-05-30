import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

export interface CompressionSettings {
  quality: number; // 1-100
  maxWidth?: number;
  maxHeight?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export interface CompressionResult {
  success: boolean;
  outputPath?: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  error?: string;
}

export interface CompressionPreset {
  id: string;
  name: string;
  description: string;
  settings: CompressionSettings;
}

class CompressionService {
  // Predefined compression presets
  static readonly PRESETS: CompressionPreset[] = [
    {
      id: 'high_quality',
      name: 'High Quality',
      description: 'Minimal compression, best quality',
      settings: { quality: 95, maxWidth: 2048, format: 'jpeg' }
    },
    {
      id: 'balanced',
      name: 'Balanced',
      description: 'Good balance of quality and size',
      settings: { quality: 80, maxWidth: 1920, format: 'jpeg' }
    },
    {
      id: 'small_size',
      name: 'Small Size',
      description: 'Maximum compression, smaller files',
      settings: { quality: 60, maxWidth: 1280, format: 'jpeg' }
    },
    {
      id: 'web_optimized',
      name: 'Web Optimized',
      description: 'Optimized for web sharing',
      settings: { quality: 75, maxWidth: 1600, format: 'webp' }
    }
  ];

  // Get file size in bytes
  static async getFileSize(uri: string): Promise<number> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      return fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;
    } catch (error) {
      console.error('Error getting file size:', error);
      return 0;
    }
  }

  // Estimate compressed size based on settings - improved algorithm
  static estimateCompressedSize(originalSize: number, settings: CompressionSettings): number {
    let qualityReduction = 0;
    let resolutionReduction = 0;
    let formatReduction = 0;

    // Quality-based reduction (more realistic)
    if (settings.quality >= 95) qualityReduction = 0.05;      // 5% reduction
    else if (settings.quality >= 90) qualityReduction = 0.15; // 15% reduction
    else if (settings.quality >= 85) qualityReduction = 0.25; // 25% reduction
    else if (settings.quality >= 80) qualityReduction = 0.35; // 35% reduction
    else if (settings.quality >= 75) qualityReduction = 0.45; // 45% reduction
    else if (settings.quality >= 70) qualityReduction = 0.55; // 55% reduction
    else if (settings.quality >= 65) qualityReduction = 0.65; // 65% reduction
    else if (settings.quality >= 60) qualityReduction = 0.72; // 72% reduction
    else if (settings.quality >= 50) qualityReduction = 0.78; // 78% reduction
    else if (settings.quality >= 40) qualityReduction = 0.83; // 83% reduction
    else qualityReduction = 0.87; // 87% reduction

    // Resolution-based reduction
    if (settings.maxWidth) {
      if (settings.maxWidth <= 800) resolutionReduction = 0.6;      // 60% additional reduction
      else if (settings.maxWidth <= 1024) resolutionReduction = 0.4; // 40% additional reduction
      else if (settings.maxWidth <= 1280) resolutionReduction = 0.25; // 25% additional reduction
      else if (settings.maxWidth <= 1600) resolutionReduction = 0.15; // 15% additional reduction
      else if (settings.maxWidth <= 1920) resolutionReduction = 0.05; // 5% additional reduction
    }

    // Format-based adjustment
    if (settings.format === 'webp') formatReduction = 0.1;      // WebP is 10% more efficient
    else if (settings.format === 'png') formatReduction = -0.05; // PNG is 5% less efficient for photos
    else formatReduction = 0; // JPEG baseline

    // Calculate combined reduction (not additive, but compound)
    const combinedReduction = 1 - ((1 - qualityReduction) * (1 - resolutionReduction) * (1 - formatReduction));

    // Cap at 95% reduction maximum
    const finalReduction = Math.min(combinedReduction, 0.95);

    // Ensure minimum 5% reduction
    const actualReduction = Math.max(finalReduction, 0.05);

    return Math.round(originalSize * (1 - actualReduction));
  }

  // Get optimal settings for target file size
  static getOptimalSettings(originalSize: number, targetSizeKB: number): CompressionSettings {
    const targetSize = targetSizeKB * 1024;
    const reductionNeeded = (originalSize - targetSize) / originalSize;

    let quality = 80;
    let maxWidth = 1920;

    if (reductionNeeded > 0.8) {
      quality = 40;
      maxWidth = 800;
    } else if (reductionNeeded > 0.6) {
      quality = 55;
      maxWidth = 1024;
    } else if (reductionNeeded > 0.4) {
      quality = 70;
      maxWidth = 1280;
    } else if (reductionNeeded > 0.2) {
      quality = 80;
      maxWidth = 1600;
    }

    return { quality, maxWidth };
  }

  // Check and request media library permissions
  static async checkMediaLibraryPermissions(showCustomDialog?: boolean): Promise<boolean> {
    try {
      const { status } = await MediaLibrary.getPermissionsAsync();
      if (status === 'granted') {
        return true;
      }

      // If we want to show custom dialog, return false to let caller handle it
      if (showCustomDialog) {
        return false;
      }

      // Request permission directly
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

  // Format file size for display
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Get compression ratio color (for UI)
  static getCompressionRatioColor(ratio: number): string {
    if (ratio >= 70) return '#4CAF50'; // Green - Excellent
    if (ratio >= 50) return '#8BC34A'; // Light Green - Good
    if (ratio >= 30) return '#FFC107'; // Yellow - Fair
    if (ratio >= 10) return '#FF9800'; // Orange - Poor
    return '#F44336'; // Red - Very Poor
  }

  // Main compression function
  static async compressImage(
    inputPath: string,
    settings: CompressionSettings,
    outputFileName?: string
  ): Promise<CompressionResult> {
    try {
      console.log('🗜️ Starting image compression:', inputPath);
      console.log('Settings:', settings);

      // Get original file size
      const originalSize = await this.getFileSize(inputPath);
      if (originalSize === 0) {
        return {
          success: false,
          originalSize: 0,
          compressedSize: 0,
          compressionRatio: 0,
          error: 'Could not read original file'
        };
      }

      // Prepare manipulation actions
      const actions: ImageManipulator.Action[] = [];

      // Add resize action if max dimensions are specified
      if (settings.maxWidth || settings.maxHeight) {
        actions.push({
          resize: {
            width: settings.maxWidth,
            height: settings.maxHeight
          }
        });
      }

      // Determine output format
      let format = ImageManipulator.SaveFormat.JPEG;
      if (settings.format === 'png') {
        format = ImageManipulator.SaveFormat.PNG;
      } else if (settings.format === 'webp') {
        format = ImageManipulator.SaveFormat.WEBP;
      }

      // Perform compression with expo-image-manipulator
      const result = await ImageManipulator.manipulateAsync(
        inputPath,
        actions,
        {
          compress: settings.quality / 100,
          format: format,
          base64: false
        }
      );

      // Always save to app directory first (for sharing)
      const documentsDir = FileSystem.documentDirectory;
      if (!documentsDir) {
        throw new Error('Documents directory not available');
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const extension = settings.format === 'png' ? 'png' : settings.format === 'webp' ? 'webp' : 'jpg';
      const finalFileName = outputFileName
        ? outputFileName.replace(/\.[^/.]+$/, `_compressed_${timestamp}.${extension}`)
        : `compressed_${timestamp}.${extension}`;

      const finalPath = documentsDir + finalFileName;
      await FileSystem.copyAsync({
        from: result.uri,
        to: finalPath
      });

      const compressedSize = await this.getFileSize(finalPath);
      const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

      // Also try to save to media library if permission is available
      const hasPermission = await this.checkMediaLibraryPermissions();
      if (hasPermission) {
        try {
          // Save to media library (Pictures folder)
          const asset = await MediaLibrary.createAssetAsync(finalPath);

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

          console.log('✅ Compression completed and saved to both app directory and media library');
        } catch (mediaError) {
          console.error('Error saving to media library:', mediaError);
          console.log('✅ Compression completed and saved to app directory only');
        }
      } else {
        console.log('✅ Compression completed and saved to app directory only');
      }

      console.log(`Original: ${(originalSize / 1024).toFixed(1)}KB`);
      console.log(`Compressed: ${(compressedSize / 1024).toFixed(1)}KB`);
      console.log(`Reduction: ${compressionRatio.toFixed(1)}%`);
      console.log(`Output path: ${finalPath}`);

      return {
        success: true,
        outputPath: finalPath,
        originalSize,
        compressedSize,
        compressionRatio
      };

    } catch (error: any) {
      console.error('❌ Image compression failed:', error);
      return {
        success: false,
        originalSize: await CompressionService.getFileSize(inputPath),
        compressedSize: 0,
        compressionRatio: 0,
        error: error.message || 'Compression failed'
      };
    }
  }
}

export default CompressionService;
