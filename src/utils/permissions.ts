import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { Platform, Alert, Linking } from 'react-native';
import { ErrorType, createPermissionError, AppError } from './errors';

export enum PermissionType {
  MEDIA_LIBRARY = 'MEDIA_LIBRARY',
  CAMERA = 'CAMERA',
  STORAGE = 'STORAGE',
}

export interface PermissionResult {
  granted: boolean;
  error?: AppError;
  canAskAgain?: boolean;
}

// Check if permission is granted
export const checkPermission = async (type: PermissionType): Promise<PermissionResult> => {
  try {
    switch (type) {
      case PermissionType.MEDIA_LIBRARY: {
        const { status, canAskAgain } = await MediaLibrary.getPermissionsAsync();
        return {
          granted: status === 'granted',
          canAskAgain,
        };
      }
      
      case PermissionType.CAMERA: {
        const { status, canAskAgain } = await ImagePicker.getCameraPermissionsAsync();
        return {
          granted: status === 'granted',
          canAskAgain,
        };
      }
      
      default:
        return {
          granted: false,
          error: createPermissionError(
            ErrorType.PERMISSION_DENIED,
            `Unknown permission type: ${type}`
          ),
        };
    }
  } catch (error) {
    return {
      granted: false,
      error: createPermissionError(
        ErrorType.PERMISSION_DENIED,
        type,
        error instanceof Error ? error : undefined
      ),
    };
  }
};

// Request permission
export const requestPermission = async (type: PermissionType): Promise<PermissionResult> => {
  try {
    switch (type) {
      case PermissionType.MEDIA_LIBRARY: {
        const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync();
        return {
          granted: status === 'granted',
          canAskAgain,
          error: status !== 'granted' 
            ? createPermissionError(ErrorType.MEDIA_LIBRARY_PERMISSION, 'Media Library')
            : undefined,
        };
      }
      
      case PermissionType.CAMERA: {
        const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
        return {
          granted: status === 'granted',
          canAskAgain,
          error: status !== 'granted'
            ? createPermissionError(ErrorType.PERMISSION_DENIED, 'Camera')
            : undefined,
        };
      }
      
      default:
        return {
          granted: false,
          error: createPermissionError(
            ErrorType.PERMISSION_DENIED,
            `Unknown permission type: ${type}`
          ),
        };
    }
  } catch (error) {
    return {
      granted: false,
      error: createPermissionError(
        ErrorType.PERMISSION_DENIED,
        type,
        error instanceof Error ? error : undefined
      ),
    };
  }
};

// Ensure permission is granted (check first, then request if needed)
export const ensurePermission = async (type: PermissionType): Promise<PermissionResult> => {
  // First check if we already have permission
  const checkResult = await checkPermission(type);
  if (checkResult.granted) {
    return checkResult;
  }

  // If not granted, request permission
  const requestResult = await requestPermission(type);
  return requestResult;
};

// Show permission denied dialog with option to go to settings
export const showPermissionDeniedDialog = (
  type: PermissionType,
  canAskAgain: boolean = true
): Promise<boolean> => {
  return new Promise((resolve) => {
    const permissionNames = {
      [PermissionType.MEDIA_LIBRARY]: 'Media Library',
      [PermissionType.CAMERA]: 'Camera',
      [PermissionType.STORAGE]: 'Storage',
    };

    const permissionName = permissionNames[type];
    
    const title = `${permissionName} Permission Required`;
    const message = canAskAgain
      ? `This app needs ${permissionName.toLowerCase()} access to function properly. Please grant the permission.`
      : `${permissionName} permission was denied. Please enable it in Settings to use this feature.`;

    const buttons = canAskAgain
      ? [
          { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' as const },
          { text: 'Grant Permission', onPress: () => resolve(true) },
        ]
      : [
          { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' as const },
          { 
            text: 'Open Settings', 
            onPress: () => {
              Linking.openSettings();
              resolve(false);
            }
          },
        ];

    Alert.alert(title, message, buttons);
  });
};

// Handle permission flow with user interaction
export const handlePermissionFlow = async (
  type: PermissionType,
  showDialog: boolean = true
): Promise<PermissionResult> => {
  const result = await ensurePermission(type);
  
  if (!result.granted && showDialog) {
    const userWantsToRetry = await showPermissionDeniedDialog(type, result.canAskAgain);
    
    if (userWantsToRetry && result.canAskAgain) {
      // Try requesting permission again
      return await requestPermission(type);
    }
  }
  
  return result;
};

// Get required permissions for media type
export const getRequiredPermissions = (mediaType: string): PermissionType[] => {
  switch (mediaType) {
    case 'image':
    case 'video':
      return [PermissionType.MEDIA_LIBRARY];
    case 'audio':
      return [PermissionType.MEDIA_LIBRARY];
    case 'document':
      return []; // Document picker handles its own permissions
    default:
      return [];
  }
};

// Check all required permissions for a media type
export const checkAllRequiredPermissions = async (
  mediaType: string
): Promise<{ allGranted: boolean; results: Record<PermissionType, PermissionResult> }> => {
  const requiredPermissions = getRequiredPermissions(mediaType);
  const results: Record<PermissionType, PermissionResult> = {} as any;
  
  let allGranted = true;
  
  for (const permission of requiredPermissions) {
    const result = await checkPermission(permission);
    results[permission] = result;
    
    if (!result.granted) {
      allGranted = false;
    }
  }
  
  return { allGranted, results };
};

// Request all required permissions for a media type
export const requestAllRequiredPermissions = async (
  mediaType: string,
  showDialogs: boolean = true
): Promise<{ allGranted: boolean; results: Record<PermissionType, PermissionResult> }> => {
  const requiredPermissions = getRequiredPermissions(mediaType);
  const results: Record<PermissionType, PermissionResult> = {} as any;
  
  let allGranted = true;
  
  for (const permission of requiredPermissions) {
    const result = await handlePermissionFlow(permission, showDialogs);
    results[permission] = result;
    
    if (!result.granted) {
      allGranted = false;
    }
  }
  
  return { allGranted, results };
};
