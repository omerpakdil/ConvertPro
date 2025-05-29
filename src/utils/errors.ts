// Error Types
export enum ErrorType {
  // File related errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_CORRUPTED = 'FILE_CORRUPTED',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  FILE_ACCESS_DENIED = 'FILE_ACCESS_DENIED',

  // Permission errors
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  MEDIA_LIBRARY_PERMISSION = 'MEDIA_LIBRARY_PERMISSION',
  STORAGE_PERMISSION = 'STORAGE_PERMISSION',

  // Conversion errors
  CONVERSION_FAILED = 'CONVERSION_FAILED',
  CONVERSION_CANCELLED = 'CONVERSION_CANCELLED',
  CONVERSION_TIMEOUT = 'CONVERSION_TIMEOUT',
  INVALID_SETTINGS = 'INVALID_SETTINGS',

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  OFFLINE = 'OFFLINE',

  // Storage errors
  STORAGE_FULL = 'STORAGE_FULL',
  CACHE_ERROR = 'CACHE_ERROR',

  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly code: string;
  public readonly userMessage: string;
  public readonly originalError?: Error;
  public readonly context?: Record<string, any>;

  constructor(
    type: ErrorType,
    message: string,
    userMessage: string,
    originalError?: Error,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.code = type;
    this.userMessage = userMessage;
    this.originalError = originalError;
    this.context = context;
  }
}

// Error Factory Functions
export const createFileError = (
  type: ErrorType,
  fileName: string,
  originalError?: Error
): AppError => {
  const messages: Record<ErrorType, { dev: string; user: string }> = {
    [ErrorType.FILE_NOT_FOUND]: {
      dev: `File not found: ${fileName}`,
      user: 'The selected file could not be found. Please try selecting it again.',
    },
    [ErrorType.FILE_TOO_LARGE]: {
      dev: `File too large: ${fileName}`,
      user: 'The selected file is too large. Please choose a smaller file.',
    },
    [ErrorType.FILE_CORRUPTED]: {
      dev: `File corrupted: ${fileName}`,
      user: 'The selected file appears to be corrupted. Please try a different file.',
    },
    [ErrorType.UNSUPPORTED_FORMAT]: {
      dev: `Unsupported format: ${fileName}`,
      user: 'This file format is not supported. Please choose a different file.',
    },
    [ErrorType.FILE_ACCESS_DENIED]: {
      dev: `Access denied: ${fileName}`,
      user: 'Cannot access the selected file. Please check permissions.',
    },
    // Default values for other error types
    [ErrorType.PERMISSION_DENIED]: {
      dev: `File error: ${fileName}`,
      user: 'An error occurred with the selected file.',
    },
    [ErrorType.MEDIA_LIBRARY_PERMISSION]: {
      dev: `File error: ${fileName}`,
      user: 'An error occurred with the selected file.',
    },
    [ErrorType.STORAGE_PERMISSION]: {
      dev: `File error: ${fileName}`,
      user: 'An error occurred with the selected file.',
    },
    [ErrorType.CONVERSION_FAILED]: {
      dev: `File error: ${fileName}`,
      user: 'An error occurred with the selected file.',
    },
    [ErrorType.CONVERSION_CANCELLED]: {
      dev: `File error: ${fileName}`,
      user: 'An error occurred with the selected file.',
    },
    [ErrorType.CONVERSION_TIMEOUT]: {
      dev: `File error: ${fileName}`,
      user: 'An error occurred with the selected file.',
    },
    [ErrorType.INVALID_SETTINGS]: {
      dev: `File error: ${fileName}`,
      user: 'An error occurred with the selected file.',
    },
    [ErrorType.NETWORK_ERROR]: {
      dev: `File error: ${fileName}`,
      user: 'An error occurred with the selected file.',
    },
    [ErrorType.OFFLINE]: {
      dev: `File error: ${fileName}`,
      user: 'An error occurred with the selected file.',
    },
    [ErrorType.STORAGE_FULL]: {
      dev: `File error: ${fileName}`,
      user: 'An error occurred with the selected file.',
    },
    [ErrorType.CACHE_ERROR]: {
      dev: `File error: ${fileName}`,
      user: 'An error occurred with the selected file.',
    },
    [ErrorType.UNKNOWN_ERROR]: {
      dev: `File error: ${fileName}`,
      user: 'An error occurred with the selected file.',
    },
    [ErrorType.VALIDATION_ERROR]: {
      dev: `File error: ${fileName}`,
      user: 'An error occurred with the selected file.',
    },
  };

  const message = messages[type];

  return new AppError(
    type,
    message.dev,
    message.user,
    originalError,
    { fileName }
  );
};

export const createPermissionError = (
  type: ErrorType,
  permission: string,
  originalError?: Error
): AppError => {
  const permissionMessages: Partial<Record<ErrorType, { dev: string; user: string }>> = {
    [ErrorType.PERMISSION_DENIED]: {
      dev: `Permission denied: ${permission}`,
      user: 'Permission is required to access this feature. Please grant the necessary permissions.',
    },
    [ErrorType.MEDIA_LIBRARY_PERMISSION]: {
      dev: 'Media library permission denied',
      user: 'Media library access is required to save files. Please enable it in settings.',
    },
    [ErrorType.STORAGE_PERMISSION]: {
      dev: 'Storage permission denied',
      user: 'Storage access is required to manage files. Please enable it in settings.',
    },
  };

  const message = permissionMessages[type] || {
    dev: `Permission error: ${permission}`,
    user: 'Permission is required for this operation.',
  };

  return new AppError(
    type,
    message.dev,
    message.user,
    originalError,
    { permission }
  );
};

export const createConversionError = (
  type: ErrorType,
  fileName: string,
  details?: string,
  originalError?: Error
): AppError => {
  const conversionMessages: Partial<Record<ErrorType, { dev: string; user: string }>> = {
    [ErrorType.CONVERSION_FAILED]: {
      dev: `Conversion failed: ${fileName} - ${details}`,
      user: 'File conversion failed. Please try again or choose a different file.',
    },
    [ErrorType.CONVERSION_CANCELLED]: {
      dev: `Conversion cancelled: ${fileName}`,
      user: 'File conversion was cancelled.',
    },
    [ErrorType.CONVERSION_TIMEOUT]: {
      dev: `Conversion timeout: ${fileName}`,
      user: 'File conversion took too long and was stopped. Please try with a smaller file.',
    },
    [ErrorType.INVALID_SETTINGS]: {
      dev: `Invalid settings for: ${fileName}`,
      user: 'Invalid conversion settings. Please check your settings and try again.',
    },
  };

  const message = conversionMessages[type] || {
    dev: `Conversion error: ${fileName}`,
    user: 'An error occurred during file conversion.',
  };

  return new AppError(
    type,
    message.dev,
    message.user,
    originalError,
    { fileName, details }
  );
};

// Error Handler Utility
export const handleError = (error: unknown, context?: string): AppError => {
  console.error(`Error in ${context || 'unknown context'}:`, error);

  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(
      ErrorType.UNKNOWN_ERROR,
      `Unknown error in ${context}: ${error.message}`,
      'An unexpected error occurred. Please try again.',
      error,
      { context }
    );
  }

  return new AppError(
    ErrorType.UNKNOWN_ERROR,
    `Unknown error in ${context}: ${String(error)}`,
    'An unexpected error occurred. Please try again.',
    undefined,
    { context, originalValue: error }
  );
};

// Error Display Utility
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof AppError) {
    return error.userMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
};
