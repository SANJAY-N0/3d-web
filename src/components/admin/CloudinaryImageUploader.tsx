import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Eye,
  Sliders,
} from 'lucide-react';
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  validateImageFile,
  cloudinaryPresets,
  CLOUDINARY_CLOUD_NAME,
} from '../../lib/cloudinary';

interface CloudinaryImageUploaderProps {
  productId?: string;
  mainImage: string;
  mainPublicId?: string;
  galleryImages: string[];
  galleryPublicIds?: string[];
  onMainImageChange: (url: string, publicId?: string) => void;
  onGalleryImagesChange: (urls: string[], publicIds?: string[]) => void;
  disabled?: boolean;
}

export const CloudinaryImageUploader: React.FC<CloudinaryImageUploaderProps> = ({
  productId = 'new-product',
  mainImage,
  mainPublicId,
  galleryImages = [],
  galleryPublicIds = [],
  onMainImageChange,
  onGalleryImagesChange,
  disabled = false,
}) => {
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [previewPreset, setPreviewPreset] = useState<'card' | 'thumbnail' | 'showcase' | 'raw'>('card');

  const mainInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const cleanProductId = (productId || 'prod-custom')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-');

  // Handle Main Image Upload
  const handleMainFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid image file.');
      return;
    }

    setErrorMessage(null);
    setUploadingMain(true);

    try {
      const folder = `3d-printing/products/${cleanProductId}`;
      const response = await uploadToCloudinary({
        file,
        folder,
        tags: ['3d-printing', cleanProductId, 'main'],
      });

      onMainImageChange(response.secure_url, response.public_id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload main image to Cloudinary.');
    } finally {
      setUploadingMain(false);
      if (mainInputRef.current) mainInputRef.current.value = '';
    }
  };

  // Handle Gallery Images Upload (Batch/Multiple)
  const handleGalleryFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErrorMessage(null);
    setUploadingGallery(true);

    try {
      const newUrls: string[] = [...galleryImages];
      const newPublicIds: string[] = [...galleryPublicIds];
      const folder = `3d-printing/products/${cleanProductId}/gallery`;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const validation = validateImageFile(file);
        if (!validation.valid) {
          throw new Error(`File ${file.name}: ${validation.error}`);
        }

        const response = await uploadToCloudinary({
          file,
          folder,
          tags: ['3d-printing', cleanProductId, 'gallery'],
        });

        newUrls.push(response.secure_url);
        newPublicIds.push(response.public_id);
      }

      onGalleryImagesChange(newUrls, newPublicIds);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload gallery images to Cloudinary.');
    } finally {
      setUploadingGallery(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  // Remove Gallery Image
  const handleRemoveGalleryImage = async (index: number) => {
    const publicId = galleryPublicIds[index];
    const newUrls = galleryImages.filter((_, i) => i !== index);
    const newPublicIds = galleryPublicIds.filter((_, i) => i !== index);

    onGalleryImagesChange(newUrls, newPublicIds);

    if (publicId && publicId.includes('3d-printing/')) {
      try {
        await deleteFromCloudinary(publicId);
      } catch (err) {
        console.warn('Could not delete Cloudinary asset immediately:', err);
      }
    }
  };

  // Delete Main Image
  const handleRemoveMainImage = async () => {
    const prevPublicId = mainPublicId;
    onMainImageChange('', undefined);

    if (prevPublicId && prevPublicId.includes('3d-printing/')) {
      try {
        await deleteFromCloudinary(prevPublicId);
      } catch (err) {
        console.warn('Could not delete Cloudinary main asset:', err);
      }
    }
  };

  const getTransformedUrl = (url: string) => {
    if (previewPreset === 'card') return cloudinaryPresets.card(url);
    if (previewPreset === 'thumbnail') return cloudinaryPresets.thumbnail(url);
    if (previewPreset === 'showcase') return cloudinaryPresets.showcase(url);
    return url;
  };

  return (
    <div className="space-y-6 bg-slate-50 dark:bg-neutral-900/60 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-neutral-800">
      {/* Cloudinary Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-600/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-display font-semibold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
              Cloudinary Media Storage
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" /> Connected ({CLOUDINARY_CLOUD_NAME})
              </span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Folder: <span className="font-mono text-cyan-600 dark:text-cyan-400">3d-printing/products/{cleanProductId}/</span>
            </p>
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-500 dark:text-neutral-400 bg-white dark:bg-neutral-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-neutral-700">
          Max: 10MB • WebP / PNG / JPG auto-delivery
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Main Showcase Image Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono uppercase tracking-wider text-slate-700 dark:text-neutral-300 font-semibold flex items-center gap-1.5">
            <span>Primary Showcase Image</span>
            <span className="text-cyan-600 dark:text-cyan-400">*</span>
          </label>
          {mainImage && (
            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
              ✓ Main image active
            </span>
          )}
        </div>

        {mainImage ? (
          <div className="relative group rounded-2xl overflow-hidden border-2 border-cyan-500/50 bg-slate-900 aspect-[16/9] max-h-64 flex items-center justify-center shadow-md">
            <img
              src={cloudinaryPresets.showcase(mainImage)}
              alt="Main Product Preview"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />

            {/* Hover Actions */}
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setActivePreviewUrl(mainImage)}
                className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-mono flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
              >
                <Eye className="w-3.5 h-3.5" /> Preview
              </button>

              <button
                type="button"
                onClick={() => mainInputRef.current?.click()}
                disabled={disabled || uploadingMain}
                className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Replace
              </button>

              <button
                type="button"
                onClick={handleRemoveMainImage}
                disabled={disabled || uploadingMain}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            </div>

            {/* Cloudinary Badge */}
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-[10px] font-mono text-cyan-300 backdrop-blur-sm">
              Main Asset
            </div>
          </div>
        ) : (
          <div
            onClick={() => !uploadingMain && !disabled && mainInputRef.current?.click()}
            className={`border-2 border-dashed border-slate-300 dark:border-neutral-700 hover:border-cyan-500 dark:hover:border-cyan-400 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-white/50 dark:bg-neutral-900/40 flex flex-col items-center justify-center gap-2.5 ${
              uploadingMain ? 'opacity-70 pointer-events-none' : ''
            }`}
          >
            {uploadingMain ? (
              <>
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                <p className="text-xs font-mono text-slate-600 dark:text-neutral-300">
                  Uploading to Cloudinary...
                </p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-neutral-200">
                    Click to select Main Product Image
                  </p>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                    Uploaded directly into Cloudinary & transformed for ultra-fast load times.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Hidden Main File Input */}
        <input
          ref={mainInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/jpg"
          onChange={handleMainFileSelected}
          className="hidden"
          disabled={disabled || uploadingMain}
        />
      </div>

      {/* 2. Gallery Images Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono uppercase tracking-wider text-slate-700 dark:text-neutral-300 font-semibold flex items-center gap-1.5">
            <span>Product Gallery & Detail Angles</span>
            <span className="text-slate-400 text-[10px]">({galleryImages.length} images)</span>
          </label>

          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={disabled || uploadingGallery}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-medium shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {uploadingGallery ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" /> Add Gallery Photos
              </>
            )}
          </button>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {galleryImages.map((imgUrl, index) => (
            <div
              key={index}
              className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-neutral-700 bg-slate-900 shadow-sm"
            >
              <img
                src={cloudinaryPresets.thumbnail(imgUrl)}
                alt={`Gallery photo ${index + 1}`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />

              {/* Angle Tag */}
              <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-white">
                #{index + 1}
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setActivePreviewUrl(imgUrl)}
                  className="p-1.5 rounded-lg bg-white/20 hover:bg-white/40 text-white cursor-pointer"
                  title="Preview"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveGalleryImage(index)}
                  disabled={disabled}
                  className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Add Tile */}
          <div
            onClick={() => !uploadingGallery && !disabled && galleryInputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-slate-300 dark:border-neutral-700 hover:border-cyan-500 dark:hover:border-cyan-400 bg-white/30 dark:bg-neutral-900/30 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer transition-colors"
          >
            {uploadingGallery ? (
              <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
            ) : (
              <>
                <Plus className="w-5 h-5" />
                <span className="text-[11px] font-mono">Add Photo</span>
              </>
            )}
          </div>
        </div>

        {/* Hidden Gallery Multiple File Input */}
        <input
          ref={galleryInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/jpg"
          onChange={handleGalleryFilesSelected}
          className="hidden"
          disabled={disabled || uploadingGallery}
        />
      </div>

      {/* Dynamic Transformation Preview Modal */}
      {activePreviewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActivePreviewUrl(null)}
        >
          <div
            className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-500" />
                <h4 className="font-display font-semibold text-sm text-slate-900 dark:text-white">
                  Cloudinary Real-Time Transformation Test
                </h4>
              </div>
              <button
                onClick={() => setActivePreviewUrl(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Transformation Selector Tabs */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-neutral-950 rounded-xl">
              {(['card', 'thumbnail', 'showcase', 'raw'] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setPreviewPreset(preset)}
                  className={`flex-1 py-1.5 text-xs font-mono rounded-lg capitalize transition-colors cursor-pointer ${
                    previewPreset === preset
                      ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                      : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Transformed Image Preview Box */}
            <div className="aspect-video bg-neutral-950 rounded-xl overflow-hidden flex items-center justify-center border border-neutral-800">
              <img
                src={getTransformedUrl(activePreviewUrl)}
                alt="Cloudinary Transformed Preview"
                referrerPolicy="no-referrer"
                className="max-h-full max-w-full object-contain"
              />
            </div>

            {/* Generated Cloudinary URL Code Snippet */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-neutral-400">
                Generated Delivery URL
              </span>
              <div className="p-2 bg-slate-100 dark:bg-neutral-950 rounded-lg text-xs font-mono text-cyan-600 dark:text-cyan-400 break-all select-all border border-slate-200 dark:border-neutral-800">
                {getTransformedUrl(activePreviewUrl)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
