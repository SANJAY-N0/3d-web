import React, { useState, useEffect } from 'react';
import { Product, ProductCategory } from '../../types';
import { CATEGORIES } from '../product/CategoryFilter';
import { X, UploadCloud, Plus, Trash2, Box, Layers, DollarSign, Check, Link as LinkIcon } from 'lucide-react';
import { useToast } from '../common/Toast';
import { CloudinaryImageUploader } from './CloudinaryImageUploader';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: any) => Promise<void>;
  initialProduct?: Product | null;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialProduct,
}) => {
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [showManualUrl, setShowManualUrl] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: 149,
    category: 'Keychains' as ProductCategory,
    material: 'PLA+ Filament',
    dimensions: '60 x 30 x 10 mm',
    print_time: '1h 30m',
    available_colors: ['Matte Black', 'Electric Blue'],
    image_url: '',
    main_image: '',
    public_id: undefined as string | undefined,
    gallery_urls: [] as string[],
    gallery_images: [] as string[],
    gallery_public_ids: [] as string[],
    model_type: 'mesh_stand' as any,
    is_available: true,
    is_featured: false,
  });

  const [colorInput, setColorInput] = useState('');

  useEffect(() => {
    if (initialProduct) {
      const mainImg = initialProduct.main_image || initialProduct.image_url || '';
      const gallery = initialProduct.gallery_images && initialProduct.gallery_images.length > 0
        ? initialProduct.gallery_images
        : (initialProduct.gallery_urls || []);

      setFormData({
        name: initialProduct.name,
        slug: initialProduct.slug,
        description: initialProduct.description,
        price: initialProduct.price,
        category: initialProduct.category,
        material: initialProduct.material,
        dimensions: initialProduct.dimensions,
        print_time: initialProduct.print_time,
        available_colors: initialProduct.available_colors || ['Matte Black'],
        image_url: mainImg,
        main_image: mainImg,
        public_id: initialProduct.public_id,
        gallery_urls: gallery,
        gallery_images: gallery,
        gallery_public_ids: initialProduct.gallery_public_ids || [],
        model_type: initialProduct.model_type || 'mesh_stand',
        is_available: initialProduct.is_available,
        is_featured: initialProduct.is_featured,
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        description: '',
        price: 199,
        category: 'Desk Accessories',
        material: 'Matte PLA+',
        dimensions: '80 x 80 x 60 mm',
        print_time: '2h 15m',
        available_colors: ['Matte Black', 'Electric Blue', 'Arctic White'],
        image_url: '',
        main_image: '',
        public_id: undefined,
        gallery_urls: [],
        gallery_images: [],
        gallery_public_ids: [],
        model_type: 'mesh_planter',
        is_available: true,
        is_featured: false,
      });
    }
  }, [initialProduct, isOpen]);

  if (!isOpen) return null;

  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    setFormData((prev) => ({
      ...prev,
      name,
      slug: initialProduct ? prev.slug : slug,
    }));
  };

  const handleMainImageChange = (url: string, publicId?: string) => {
    setFormData((prev) => ({
      ...prev,
      image_url: url,
      main_image: url,
      public_id: publicId || prev.public_id,
    }));
  };

  const handleGalleryImagesChange = (urls: string[], publicIds?: string[]) => {
    setFormData((prev) => ({
      ...prev,
      gallery_urls: urls,
      gallery_images: urls,
      gallery_public_ids: publicIds || prev.gallery_public_ids,
    }));
  };

  const handleAddColor = () => {
    if (!colorInput.trim()) return;
    if (!formData.available_colors.includes(colorInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        available_colors: [...prev.available_colors, colorInput.trim()],
      }));
    }
    setColorInput('');
  };

  const handleRemoveColor = (color: string) => {
    setFormData((prev) => ({
      ...prev,
      available_colors: prev.available_colors.filter((c) => c !== color),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalMainImage = formData.main_image || formData.image_url;

    if (!formData.name || !formData.slug || !formData.price || !finalMainImage) {
      showToast('Please provide a name, price, and primary showcase image.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        image_url: finalMainImage,
        main_image: finalMainImage,
        gallery_urls: formData.gallery_images && formData.gallery_images.length > 0 ? formData.gallery_images : [finalMainImage],
        gallery_images: formData.gallery_images && formData.gallery_images.length > 0 ? formData.gallery_images : [finalMainImage],
      };
      await onSave(payload);
      showToast(initialProduct ? 'Product updated successfully.' : 'Product added successfully.', 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to save product.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Box className="w-5 h-5 text-cyan-400" />
            <h2 className="font-display font-bold text-lg text-white">
              {initialProduct ? 'Edit 3D Product' : 'Add New 3D Print Product'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Row 1: Name & Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-mono text-neutral-300">Product Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Ergonomic Phone Stand"
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-neutral-300">URL Slug *</label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="ergonomic-phone-stand"
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-300 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="font-mono text-neutral-300">Description *</label>
            <textarea
              required
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the 3D printed geometry, infill, functionality and usage..."
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-cyan-500 leading-relaxed"
            />
          </div>

          {/* Row 2: Price, Category, Material */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="font-mono text-neutral-300">Price (₹ INR) *</label>
              <input
                type="number"
                required
                min={1}
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-neutral-300">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ProductCategory })}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-mono text-neutral-300">Material (Filament/Resin)</label>
              <input
                type="text"
                value={formData.material}
                onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                placeholder="e.g. PLA+, PETG-CF, SLA Resin"
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Row 3: Dimensions, Print Time, 3D Mesh Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="font-mono text-neutral-300">Dimensions</label>
              <input
                type="text"
                value={formData.dimensions}
                onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                placeholder="e.g. 70 x 60 x 80 mm"
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-neutral-300">Approx Print Time</label>
              <input
                type="text"
                value={formData.print_time}
                onChange={(e) => setFormData({ ...formData, print_time: e.target.value })}
                placeholder="e.g. 2h 45m"
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-neutral-300">3D Interactive Viewer Model</label>
              <select
                value={formData.model_type}
                onChange={(e) => setFormData({ ...formData, model_type: e.target.value as any })}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="mesh_stand">Articulated Stand Geometry</option>
                <option value="mesh_keychain">Keychain / Monogram Mesh</option>
                <option value="mesh_planter">Hexagon Planter Mesh</option>
                <option value="mesh_vase">Voronoi Spiral Luminary</option>
                <option value="mesh_miniature">Resin Miniature Dragon</option>
                <option value="mesh_organizer">Honeycomb Organizer</option>
              </select>
            </div>
          </div>

          {/* Cloudinary Media Management Section */}
          <div className="space-y-2">
            <CloudinaryImageUploader
              productId={formData.slug || formData.name || 'product'}
              mainImage={formData.main_image || formData.image_url}
              mainPublicId={formData.public_id}
              galleryImages={formData.gallery_images}
              galleryPublicIds={formData.gallery_public_ids}
              onMainImageChange={handleMainImageChange}
              onGalleryImagesChange={handleGalleryImagesChange}
              disabled={isSaving}
            />

            {/* Optional Manual Direct URL Entry Toggle */}
            <div className="flex items-center justify-between text-[11px] pt-1 px-1">
              <button
                type="button"
                onClick={() => setShowManualUrl(!showManualUrl)}
                className="text-neutral-400 hover:text-cyan-400 flex items-center gap-1 font-mono transition-colors"
              >
                <LinkIcon className="w-3 h-3" />
                {showManualUrl ? 'Hide Manual URL Input' : 'Direct Cloudinary / Remote Image URL (Advanced)'}
              </button>
            </div>

            {showManualUrl && (
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2 text-xs animate-in fade-in">
                <label className="font-mono text-neutral-300">Custom Image URL</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => {
                    handleMainImageChange(e.target.value);
                  }}
                  placeholder="https://res.cloudinary.com/jushiok7/image/upload/..."
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            )}
          </div>

          {/* Available Colors Tags */}
          <div className="space-y-2">
            <label className="font-mono text-neutral-300">Available Colors / Filaments</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={colorInput}
                onChange={(e) => setColorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddColor();
                  }
                }}
                placeholder="Add filament color (e.g. Matte Black, Silk Gold)..."
                className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={handleAddColor}
                className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg flex items-center gap-1 font-mono"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {formData.available_colors.map((color) => (
                <span
                  key={color}
                  className="px-2.5 py-1 bg-neutral-800 text-neutral-200 rounded-md flex items-center gap-1.5 border border-neutral-700 font-mono text-[11px]"
                >
                  {color}
                  <button
                    type="button"
                    onClick={() => handleRemoveColor(color)}
                    className="hover:text-rose-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Availability & Featured Toggles */}
          <div className="pt-2 flex flex-wrap gap-6 border-t border-neutral-800">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_available}
                onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                className="w-4 h-4 rounded bg-neutral-950 border-neutral-700 text-cyan-500 focus:ring-0"
              />
              <span className="text-neutral-200 font-medium">In Stock / Available for Order</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_featured}
                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                className="w-4 h-4 rounded bg-neutral-950 border-neutral-700 text-amber-500 focus:ring-0"
              />
              <span className="text-neutral-200 font-medium">Feature on Homepage</span>
            </label>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-neutral-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:opacity-95 text-white font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : initialProduct ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
