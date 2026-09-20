import { CloudinaryUploadResponse, CloudinaryConfigStatus } from '../types';

export const CLOUDINARY_CLOUD_NAME = 'jushiok7';
export const CLOUDINARY_BASE_URL = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload`;

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'limit' | 'thumb' | 'scale' | 'pad';
  gravity?: 'auto' | 'center' | 'face' | 'north' | 'south';
  quality?: 'auto' | 'auto:best' | 'auto:good' | 'auto:eco' | 'auto:low' | number;
  format?: 'auto' | 'webp' | 'avif' | 'png' | 'jpg';
  dpr?: number | string;
}

/**
 * Builds an optimized Cloudinary delivery URL with transformation parameters.
 * Automatically enables modern formats (WebP/AVIF) and quality optimization.
 */
export function getOptimizedImageUrl(
  imageSource: string | undefined | null,
  options: ImageTransformOptions = {}
): string {
  if (!imageSource) return '/placeholder.png';

  const {
    width,
    height,
    crop = 'fill',
    gravity = 'auto',
    quality = 'auto',
    format = 'auto',
    dpr = 'auto',
  } = options;

  // Build transformation segments
  const transforms: string[] = [`f_${format}`, `q_${quality}`];

  if (dpr) transforms.push(`dpr_${dpr}`);
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (crop && (width || height)) transforms.push(`c_${crop}`);
  if (gravity && crop === 'fill') transforms.push(`g_${gravity}`);

  const transformString = transforms.join(',');

  // Case 1: Already a Cloudinary URL (e.g. https://res.cloudinary.com/.../image/upload/...)
  if (imageSource.includes('res.cloudinary.com') && imageSource.includes('/upload/')) {
    // Check if URL already has transformations or is clean
    const uploadIndex = imageSource.indexOf('/upload/');
    const prefix = imageSource.substring(0, uploadIndex + 8);
    const suffix = imageSource.substring(uploadIndex + 8);

    // If already contains transformation string, replace or prepend
    if (suffix.startsWith('v') && /v\d+\//.test(suffix)) {
      return `${prefix}${transformString}/${suffix}`;
    } else if (suffix.includes('/v')) {
      const vIndex = suffix.indexOf('/v');
      const cleanSuffix = suffix.substring(vIndex + 1);
      return `${prefix}${transformString}/${cleanSuffix}`;
    }
    return `${prefix}${transformString}/${suffix}`;
  }

  // Case 2: Public ID stored directly (e.g., 3d-printing/products/keychain-001/main)
  if (!imageSource.startsWith('http://') && !imageSource.startsWith('https://') && !imageSource.startsWith('data:')) {
    const cleanPublicId = imageSource.replace(/^\/+/, '');
    return `${CLOUDINARY_BASE_URL}/${transformString}/${cleanPublicId}`;
  }

  // Case 3: External fallback URL (e.g. Unsplash) - apply standard query params if applicable
  if (imageSource.includes('unsplash.com')) {
    const url = new URL(imageSource);
    if (width) url.searchParams.set('w', String(width));
    if (height) url.searchParams.set('h', String(height));
    url.searchParams.set('auto', 'format');
    url.searchParams.set('fit', crop === 'fill' ? 'crop' : 'max');
    url.searchParams.set('q', '80');
    return url.toString();
  }

  return imageSource;
}

/**
 * Cloudinary presets for different application views
 */
export const cloudinaryPresets = {
  thumbnail: (url: string) =>
    getOptimizedImageUrl(url, { width: 180, height: 180, crop: 'fill', gravity: 'auto', format: 'auto', quality: 'auto' }),

  card: (url: string) =>
    getOptimizedImageUrl(url, { width: 600, height: 600, crop: 'fill', gravity: 'auto', format: 'auto', quality: 'auto' }),

  showcase: (url: string) =>
    getOptimizedImageUrl(url, { width: 1200, height: 1200, crop: 'limit', format: 'auto', quality: 'auto' }),

  mobile: (url: string) =>
    getOptimizedImageUrl(url, { width: 480, crop: 'limit', format: 'auto', quality: 'auto' }),

  zoom: (url: string) =>
    getOptimizedImageUrl(url, { width: 1800, crop: 'limit', format: 'auto', quality: 'auto' }),
};

/**
 * Image file validation
 */
export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export function validateImageFile(file: File, maxSizeBytes: number = 10 * 1024 * 1024): ImageValidationResult {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: `Unsupported file format: "${file.type || file.name}". Only JPG, PNG, and WebP are supported.`,
    };
  }

  if (file.size > maxSizeBytes) {
    const mb = (maxSizeBytes / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `File size exceeds the ${mb} MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`,
    };
  }

  return { valid: true };
}

/**
 * Reads a File as Base64 Data URI
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Uploads an image to Cloudinary via the backend secure proxy
 */
export async function uploadToCloudinary(params: {
  file: File | string;
  folder?: string;
  publicId?: string;
  tags?: string[];
}): Promise<CloudinaryUploadResponse> {
  let imagePayload: string;

  if (typeof params.file === 'string') {
    imagePayload = params.file;
  } else {
    const validation = validateImageFile(params.file);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid image file.');
    }
    imagePayload = await fileToBase64(params.file);
  }

  const response = await fetch('/api/cloudinary/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image: imagePayload,
      folder: params.folder || '3d-printing/products/general',
      publicId: params.publicId,
      tags: params.tags || ['3d-printing', 'product'],
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to upload image to Cloudinary.');
  }

  return data as CloudinaryUploadResponse;
}

/**
 * Deletes an image from Cloudinary by public ID via backend secure proxy
 */
export async function deleteFromCloudinary(publicId: string): Promise<{ success: boolean; message?: string }> {
  const response = await fetch('/api/cloudinary/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ publicId }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to delete image from Cloudinary.');
  }

  return data;
}

/**
 * Checks Cloudinary configuration status on backend
 */
export async function checkCloudinaryConfig(): Promise<CloudinaryConfigStatus> {
  try {
    const response = await fetch('/api/cloudinary/config');
    if (!response.ok) return { configured: false, cloudName: CLOUDINARY_CLOUD_NAME };
    return await response.json();
  } catch {
    return { configured: false, cloudName: CLOUDINARY_CLOUD_NAME };
  }
}
