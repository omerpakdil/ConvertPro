import * as FileSystem from 'expo-file-system';
import { ErrorType, createFileError, AppError } from './errors';

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  image: 50 * 1024 * 1024, // 50MB
  audio: 100 * 1024 * 1024, // 100MB
  video: 500 * 1024 * 1024, // 500MB
  document: 25 * 1024 * 1024, // 25MB
} as const;

// Supported file extensions
export const SUPPORTED_EXTENSIONS = {
  image: ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.tiff', '.svg', '.bmp'],
  audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.opus', '.wma'],
  video: ['.mp4', '.avi', '.mkv', '.mov', '.webm', '.3gp', '.wmv', '.flv'],
  document: ['.pdf', '.docx', '.txt', '.epub', '.rtf', '.md', '.doc'],
} as const;

// MIME type mappings
export const MIME_TYPES = {
  image: [
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'image/tiff', 'image/svg+xml', 'image/bmp'
  ],
  audio: [
    'audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aac', 'audio/ogg',
    'audio/mp4', 'audio/opus', 'audio/x-ms-wma'
  ],
  video: [
    'video/mp4', 'video/avi', 'video/x-matroska', 'video/quicktime',
    'video/webm', 'video/3gpp', 'video/x-ms-wmv', 'video/x-flv'
  ],
  document: [
    'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'application/epub+zip', 'application/rtf', 'text/markdown',
    'application/msword'
  ],
} as const;

export type MediaType = keyof typeof SUPPORTED_EXTENSIONS;

export interface FileValidationResult {
  isValid: boolean;
  error?: AppError;
  fileInfo?: {
    size: number;
    extension: string;
    mimeType?: string;
  };
}

export interface FileInfo {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
}

// Get file extension from filename
export const getFileExtension = (filename: string): string => {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.slice(lastDot).toLowerCase();
};

// Get file info from URI
export const getFileInfo = async (uri: string): Promise<{ size: number; exists: boolean }> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    return {
      size: (fileInfo.exists && 'size' in fileInfo) ? fileInfo.size || 0 : 0,
      exists: fileInfo.exists,
    };
  } catch (error) {
    console.error('Error getting file info:', error);
    return { size: 0, exists: false };
  }
};

// Validate file extension
export const validateFileExtension = (
  filename: string,
  mediaType: MediaType
): { isValid: boolean; extension: string } => {
  const extension = getFileExtension(filename);
  const supportedExtensions = SUPPORTED_EXTENSIONS[mediaType];

  return {
    isValid: (supportedExtensions as readonly string[]).includes(extension),
    extension,
  };
};

// Validate file size
export const validateFileSize = (
  size: number,
  mediaType: MediaType,
  filename: string
): { isValid: boolean; error?: AppError } => {
  const limit = FILE_SIZE_LIMITS[mediaType];

  if (size > limit) {
    return {
      isValid: false,
      error: createFileError(ErrorType.FILE_TOO_LARGE, filename),
    };
  }

  return { isValid: true };
};

// Check if file exists and is accessible
export const validateFileAccess = async (
  uri: string,
  filename: string
): Promise<{ isValid: boolean; error?: AppError; size: number }> => {
  try {
    const { size, exists } = await getFileInfo(uri);

    if (!exists) {
      return {
        isValid: false,
        error: createFileError(ErrorType.FILE_NOT_FOUND, filename),
        size: 0,
      };
    }

    return { isValid: true, size };
  } catch (error) {
    return {
      isValid: false,
      error: createFileError(
        ErrorType.FILE_ACCESS_DENIED,
        filename,
        error instanceof Error ? error : undefined
      ),
      size: 0,
    };
  }
};

// Comprehensive file validation
export const validateFile = async (
  file: FileInfo,
  mediaType: MediaType
): Promise<FileValidationResult> => {
  try {
    // 1. Validate file extension
    const { isValid: extensionValid, extension } = validateFileExtension(file.name, mediaType);
    if (!extensionValid) {
      return {
        isValid: false,
        error: createFileError(ErrorType.UNSUPPORTED_FORMAT, file.name),
      };
    }

    // 2. Check file access and get size
    const { isValid: accessValid, error: accessError, size } = await validateFileAccess(
      file.uri,
      file.name
    );
    if (!accessValid) {
      return {
        isValid: false,
        error: accessError,
      };
    }

    // 3. Validate file size
    const { isValid: sizeValid, error: sizeError } = validateFileSize(size, mediaType, file.name);
    if (!sizeValid) {
      return {
        isValid: false,
        error: sizeError,
      };
    }

    // 4. Additional checks for specific file types
    if (mediaType === 'image') {
      // For images, we could add additional validation like checking if it's a valid image
      // This would require loading the image, which we'll skip for now
    }

    return {
      isValid: true,
      fileInfo: {
        size,
        extension,
        mimeType: file.mimeType,
      },
    };
  } catch (error) {
    return {
      isValid: false,
      error: createFileError(
        ErrorType.VALIDATION_ERROR,
        file.name,
        error instanceof Error ? error : undefined
      ),
    };
  }
};

// Validate multiple files
export const validateFiles = async (
  files: FileInfo[],
  mediaType: MediaType
): Promise<{
  validFiles: FileInfo[];
  invalidFiles: Array<{ file: FileInfo; error: AppError }>;
  totalSize: number;
}> => {
  const validFiles: FileInfo[] = [];
  const invalidFiles: Array<{ file: FileInfo; error: AppError }> = [];
  let totalSize = 0;

  for (const file of files) {
    const result = await validateFile(file, mediaType);

    if (result.isValid && result.fileInfo) {
      validFiles.push(file);
      totalSize += result.fileInfo.size;
    } else if (result.error) {
      invalidFiles.push({ file, error: result.error });
    }
  }

  return { validFiles, invalidFiles, totalSize };
};

// Format file size for display
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// Get human-readable file size limit
export const getFileSizeLimit = (mediaType: MediaType): string => {
  return formatFileSize(FILE_SIZE_LIMITS[mediaType]);
};
