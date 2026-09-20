import React, { useState, useEffect, useRef } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { ShowcaseItem } from '../../types';
import { showcaseService } from '../../services/showcaseService';
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  validateImageFile,
  getOptimizedImageUrl,
  checkCloudinaryConfig,
} from '../../lib/cloudinary';
import { useToast } from '../../hooks/useToast';
import {
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
  Clock,
  ExternalLink,
  Image as ImageIcon,
  Sliders,
  Play,
  Pause,
  X,
  Sparkles,
} from 'lucide-react';

export const AdminShowcase: React.FC = () => {
  const { showToast } = useToast();
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cldConfigured, setCldConfigured] = useState<boolean | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShowcaseItem | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    button_text: 'Browse Catalog',
    button_link: '/products',
    display_duration: 5,
    display_order: 0,
    is_active: true,
    image_url: '',
    cloudinary_public_id: '',
  });

  // Image Upload state inside modal
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick live preview state
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewElapsed, setPreviewElapsed] = useState(0);
  const [previewPaused, setPreviewPaused] = useState(false);

  const loadShowcase = async () => {
    setLoading(true);
    try {
      const data = await showcaseService.getAllShowcase();
      setItems(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load showcase slides.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShowcase();
    checkCloudinaryConfig().then((res) => {
      setCldConfigured(res.configured);
    });
  }, []);

  // Live preview timer simulation
  const activeItems = items.filter((i) => i.is_active);
  const currentPreviewItem = activeItems[previewIndex];
  const previewDuration = currentPreviewItem
    ? Math.max(2, Math.min(60, currentPreviewItem.display_duration || 5))
    : 5;

  useEffect(() => {
    if (activeItems.length <= 1 || previewPaused) return;

    const interval = setInterval(() => {
      setPreviewElapsed((prev) => {
        const next = prev + 100;
        if (next >= previewDuration * 1000) {
          setPreviewIndex((curr) => (curr + 1) % activeItems.length);
          return 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [activeItems.length, previewDuration, previewPaused]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      title: 'Custom 3D Printing',
      subtitle: 'Precision crafted on demand',
      button_text: 'Browse Catalog',
      button_link: '/products',
      display_duration: 5,
      display_order: items.length,
      is_active: true,
      image_url: '',
      cloudinary_public_id: '',
    });
    setImagePreview(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: ShowcaseItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      subtitle: item.subtitle,
      button_text: item.button_text,
      button_link: item.button_link,
      display_duration: item.display_duration,
      display_order: item.display_order,
      is_active: item.is_active,
      image_url: item.image_url,
      cloudinary_public_id: item.cloudinary_public_id || '',
    });
    setImagePreview(item.image_url);
    setIsModalOpen(true);
  };

  // Handle Image Selection and Upload to Cloudinary
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      showToast(validation.error || 'Invalid image file.', 'error');
      return;
    }

    setUploadingImage(true);
    try {
      const response = await uploadToCloudinary({
        file,
        folder: '3d-printing/showcase',
        tags: ['3d-printing', 'showcase', 'homepage'],
      });

      setFormData((prev) => ({
        ...prev,
        image_url: response.secure_url,
        cloudinary_public_id: response.public_id,
      }));
      setImagePreview(response.secure_url);
      showToast('Showcase image uploaded to Cloudinary successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload image to Cloudinary.', 'error');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Save Modal Form (Create or Update)
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.image_url) {
      showToast('Please upload a showcase image.', 'error');
      return;
    }

    // Validate Display Duration: 2 to 60 seconds
    const duration = Number(formData.display_duration);
    if (isNaN(duration) || duration < 2 || duration > 60) {
      showToast('Display Duration must be between 2 and 60 seconds.', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        // If updating and new image replaced previous Cloudinary asset
        if (
          editingItem.cloudinary_public_id &&
          formData.cloudinary_public_id &&
          editingItem.cloudinary_public_id !== formData.cloudinary_public_id
        ) {
          try {
            await deleteFromCloudinary(editingItem.cloudinary_public_id);
          } catch (cldErr) {
            console.warn('Could not delete replaced Cloudinary asset:', cldErr);
          }
        }

        await showcaseService.updateShowcaseItem(editingItem.id, {
          title: formData.title,
          subtitle: formData.subtitle,
          button_text: formData.button_text,
          button_link: formData.button_link,
          display_duration: duration,
          display_order: Number(formData.display_order) || 0,
          is_active: formData.is_active,
          image_url: formData.image_url,
          cloudinary_public_id: formData.cloudinary_public_id,
        });
        showToast('Showcase slide updated successfully.', 'success');
      } else {
        await showcaseService.createShowcaseItem({
          title: formData.title,
          subtitle: formData.subtitle,
          button_text: formData.button_text,
          button_link: formData.button_link,
          display_duration: duration,
          display_order: Number(formData.display_order) || items.length,
          is_active: formData.is_active,
          image_url: formData.image_url,
          cloudinary_public_id: formData.cloudinary_public_id,
        });
        showToast('New showcase slide added successfully.', 'success');
      }

      setIsModalOpen(false);
      await loadShowcase();
    } catch (err: any) {
      showToast(err.message || 'Failed to save showcase slide.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Inline update display duration
  const handleDurationChange = async (id: string, newDuration: number) => {
    if (isNaN(newDuration) || newDuration < 2 || newDuration > 60) {
      showToast('Duration must be between 2 and 60 seconds.', 'error');
      return;
    }

    try {
      await showcaseService.updateShowcaseItem(id, { display_duration: newDuration });
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, display_duration: newDuration } : i))
      );
      showToast(`Duration updated to ${newDuration}s.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update duration.', 'error');
    }
  };

  // Toggle Active Status
  const handleToggleActive = async (item: ShowcaseItem) => {
    try {
      const nextActive = !item.is_active;
      await showcaseService.toggleActive(item.id, nextActive);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_active: nextActive } : i))
      );
      showToast(`Slide ${nextActive ? 'enabled' : 'disabled'}.`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle status.', 'error');
    }
  };

  // Delete Slide
  const handleDelete = async (item: ShowcaseItem) => {
    if (!window.confirm(`Are you sure you want to delete this showcase slide? This will remove the Cloudinary image asset as well.`)) {
      return;
    }

    try {
      await showcaseService.deleteShowcaseItem(item.id, item.cloudinary_public_id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      showToast('Showcase slide deleted.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete showcase slide.', 'error');
    }
  };

  // Move Up / Move Down
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    // Update display_order numbers
    const updated = newItems.map((item, idx) => ({
      ...item,
      display_order: idx,
    }));

    setItems(updated);

    try {
      await showcaseService.reorderShowcaseItems(
        updated.map((item) => ({ id: item.id, display_order: item.display_order }))
      );
      showToast('Order updated.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to reorder items.', 'error');
      loadShowcase();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-6 h-6 text-cyan-500" />
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white">
                Homepage Showcase
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
              Configure the hero rotating carousel with Cloudinary images, individual display durations, and dynamic titles.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadShowcase}
              className="p-2.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 border border-slate-300 dark:border-neutral-800 transition-colors cursor-pointer"
              title="Refresh Showcase"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Showcase Slide</span>
            </button>
          </div>
        </div>

        {/* Cloudinary Status Banner if not configured */}
        {cldConfigured === false && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <span className="font-semibold">Cloudinary Not Configured:</span> Showcase image uploads require Cloudinary environment variables. Check your settings.
            </div>
          </div>
        )}

        {/* Live Preview & Stats Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Live Carousel Preview Card */}
          <div className="lg:col-span-5 bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-500" />
                <h3 className="font-display font-semibold text-sm text-slate-900 dark:text-white">
                  Live Carousel Simulation
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPaused(!previewPaused)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-neutral-800 text-[11px] font-mono text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
              >
                {previewPaused ? (
                  <>
                    <Play className="w-3 h-3 text-cyan-500" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3 h-3 text-amber-500" />
                    <span>Pause</span>
                  </>
                )}
              </button>
            </div>

            {activeItems.length === 0 ? (
              <div className="aspect-video bg-slate-100 dark:bg-neutral-950 rounded-xl border border-dashed border-slate-300 dark:border-neutral-800 flex flex-col items-center justify-center p-4 text-center">
                <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  No active showcase slides. Add slides to preview.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Visual Preview Box */}
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black shadow-inner">
                  {currentPreviewItem && (
                    <img
                      src={getOptimizedImageUrl(currentPreviewItem.image_url, { width: 600, height: 340 })}
                      alt={currentPreviewItem.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                  {/* Top indicators */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono text-white">
                    <span className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10">
                      {previewIndex + 1} / {activeItems.length}
                    </span>
                    <span className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 text-cyan-400">
                      {Math.min(previewDuration, Math.floor(previewElapsed / 1000))}s / {previewDuration}s
                    </span>
                  </div>

                  {/* Bottom caption */}
                  <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-md p-2 rounded-lg border border-white/10 text-white">
                    <div className="text-xs font-semibold truncate">{currentPreviewItem?.title || 'Untitled'}</div>
                    <div className="text-[10px] text-neutral-300 truncate">{currentPreviewItem?.subtitle || 'No subtitle'}</div>
                  </div>
                </div>

                {/* Progress Bar Track */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 w-full">
                    {activeItems.map((item, idx) => {
                      const isCurrent = idx === previewIndex;
                      const isPassed = idx < previewIndex;
                      const pct = isCurrent
                        ? Math.min(100, (previewElapsed / (previewDuration * 1000)) * 100)
                        : isPassed
                        ? 100
                        : 0;

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            setPreviewIndex(idx);
                            setPreviewElapsed(0);
                          }}
                          className="flex-1 cursor-pointer py-1"
                        >
                          <div className="h-1.5 bg-slate-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-cyan-500 rounded-full transition-all duration-75"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>●━━━○ Progress</span>
                    <span>{previewDuration}s duration</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Quick Instructions & Summary */}
          <div className="lg:col-span-7 bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h3 className="font-display font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Automatic Looping & Per-Image Timer Rules
              </h3>
              <ul className="text-xs text-slate-600 dark:text-neutral-400 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
                  <span>
                    <strong>Configurable Timer:</strong> Each image can have its own duration between <strong>2 and 60 seconds</strong> (default 5s).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
                  <span>
                    <strong>Cloudinary Storage:</strong> All image assets are uploaded securely to Cloudinary. Deleting a slide from here also removes the asset from Cloudinary.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
                  <span>
                    <strong>Progress Bar & Hover Pause:</strong> The customer homepage displays a live <code className="text-[11px] bg-slate-100 dark:bg-neutral-800 px-1 py-0.5 rounded">3s / 5s</code> progress indicator. On desktop, hovering over the carousel pauses the timer.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
                  <span>
                    <strong>Reordering:</strong> Use the <ArrowUp className="w-3 h-3 inline text-slate-400" /> and <ArrowDown className="w-3 h-3 inline text-slate-400" /> buttons to organize the sequence in which slides rotate.
                  </span>
                </li>
              </ul>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500 dark:text-neutral-400">
                Total Slides: <strong>{items.length}</strong> | Active: <strong>{activeItems.length}</strong>
              </span>
              <span className="text-cyan-600 dark:text-cyan-400">
                Total Cycle: {activeItems.reduce((acc, curr) => acc + (curr.display_duration || 5), 0)}s
              </span>
            </div>
          </div>
        </div>

        {/* Showcase Items Table / List */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between">
            <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">
              Showcase Slides ({items.length})
            </h2>
            <span className="text-xs text-slate-500 dark:text-neutral-400 font-mono">
              Sorted by display order
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
              <p className="text-xs text-slate-500 dark:text-neutral-400 font-mono">Loading showcase slides...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <ImageIcon className="w-12 h-12 text-slate-300 dark:text-neutral-700 mx-auto" />
              <h3 className="font-display font-semibold text-sm text-slate-900 dark:text-white">
                No Showcase Slides Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-sm mx-auto">
                Get started by adding your first showcase slide. Upload a high-resolution image to Cloudinary and set its rotation timer.
              </p>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-md shadow-cyan-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Slide</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-neutral-800 overflow-x-auto">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
                    !item.is_active ? 'opacity-60 bg-slate-50/50 dark:bg-neutral-950/40' : 'hover:bg-slate-50 dark:hover:bg-neutral-800/40'
                  }`}
                >
                  {/* Left: Thumbnail & Info */}
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Reorder Buttons */}
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMove(index, 'up')}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === items.length - 1}
                        onClick={() => handleMove(index, 'down')}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Image Thumbnail */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-neutral-800 shrink-0 relative group">
                      <img
                        src={getOptimizedImageUrl(item.image_url, { width: 160, height: 160, crop: 'fill' })}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      <a
                        href={item.image_url}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                        title="Open full image"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>

                    {/* Metadata Details */}
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400">
                          #{index + 1}
                        </span>
                        <h4 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                          {item.title || 'Untitled Slide'}
                        </h4>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-neutral-400 truncate max-w-md">
                        {item.subtitle || 'No subtitle'}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono text-slate-500 dark:text-neutral-400">
                        <span>
                          Button: <strong className="text-slate-700 dark:text-neutral-300">{item.button_text}</strong> ({item.button_link})
                        </span>
                        {item.cloudinary_public_id && (
                          <span className="truncate max-w-[180px] text-slate-400" title={item.cloudinary_public_id}>
                            ID: {item.cloudinary_public_id}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Display Duration & Actions */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-neutral-800">
                    {/* Display Duration Field: [ 5 ] seconds */}
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-neutral-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-neutral-700/60">
                      <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span className="text-[11px] font-mono text-slate-600 dark:text-neutral-400">
                        Display Duration
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="2"
                          max="60"
                          value={item.display_duration}
                          onChange={(e) => handleDurationChange(item.id, parseInt(e.target.value, 10))}
                          className="w-12 px-1.5 py-0.5 text-center text-xs font-mono font-bold bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded text-slate-900 dark:text-white"
                          title="Display duration in seconds (2 - 60s)"
                        />
                        <span className="text-[11px] font-mono text-slate-500">sec</span>
                      </div>
                    </div>

                    {/* Active Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        item.is_active
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                          : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 border border-slate-200 dark:border-neutral-700'
                      }`}
                    >
                      {item.is_active ? 'Active' : 'Disabled'}
                    </button>

                    {/* Edit and Delete Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 transition-colors cursor-pointer"
                        title="Edit Slide Details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                        title="Delete Slide"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add / Edit Slide Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-cyan-500" />
                  <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                    {editingItem ? 'Edit Showcase Slide' : 'Add New Showcase Slide'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body Form */}
              <form onSubmit={handleSaveForm} className="p-6 space-y-5">
                {/* Cloudinary Image Uploader Area */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 block">
                    Showcase Image (Cloudinary) *
                  </label>

                  {imagePreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-neutral-800 bg-slate-900 aspect-video max-h-48 group">
                      <img
                        src={getOptimizedImageUrl(imagePreview, { width: 800, height: 450, crop: 'fill' })}
                        alt="Showcase preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-md"
                        >
                          Replace Image
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 dark:border-neutral-700 hover:border-cyan-500 dark:hover:border-cyan-400 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50 dark:bg-neutral-950/50"
                    >
                      {uploadingImage ? (
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                          <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400">
                            Uploading image to Cloudinary...
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <UploadCloud className="w-8 h-8 text-slate-400 dark:text-neutral-500" />
                          <div className="text-xs font-semibold text-slate-800 dark:text-neutral-200">
                            Click to select & upload image
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-neutral-400">
                            Direct upload to Cloudinary (JPG, PNG, WebP up to 10MB)
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleImageFileChange}
                    disabled={uploadingImage}
                  />
                </div>

                {/* Title & Subtitle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 block">
                      Title
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Custom 3D Products"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 block">
                      Subtitle
                    </label>
                    <input
                      type="text"
                      value={formData.subtitle}
                      onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                      placeholder="e.g. Precision crafted on demand"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Button Text & Button Link */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 block">
                      Button Text
                    </label>
                    <input
                      type="text"
                      value={formData.button_text}
                      onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                      placeholder="e.g. Browse Catalog"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 block">
                      Button Link
                    </label>
                    <input
                      type="text"
                      value={formData.button_link}
                      onChange={(e) => setFormData({ ...formData, button_link: e.target.value })}
                      placeholder="e.g. /products or /track"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* 
                  ============================================================
                  Display Duration Field:
                  Display Duration
                  [ 5 ] seconds
                  Validation: min 2s, max 60s, default 5s
                  ============================================================
                */}
                <div className="p-4 rounded-xl bg-slate-100/70 dark:bg-neutral-950/60 border border-slate-200 dark:border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-cyan-500" />
                        <span>Display Duration</span>
                      </label>
                      <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                        How long this specific image stays visible before rotating to the next.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-300 dark:border-neutral-700 rounded-lg overflow-hidden bg-white dark:bg-neutral-900 shadow-sm">
                        <input
                          type="number"
                          min="2"
                          max="60"
                          value={formData.display_duration}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              display_duration: Math.max(2, Math.min(60, parseInt(e.target.value, 10) || 5)),
                            })
                          }
                          className="w-16 px-2 py-1.5 text-center text-sm font-mono font-bold bg-transparent text-slate-900 dark:text-white focus:outline-none"
                        />
                        <span className="px-2.5 py-1.5 bg-slate-100 dark:bg-neutral-800 text-[11px] font-mono text-slate-600 dark:text-neutral-400 border-l border-slate-300 dark:border-neutral-700">
                          seconds
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-neutral-400">
                    <span>Minimum: 2 seconds</span>
                    <span>Maximum: 60 seconds</span>
                    <span>Default: 5 seconds</span>
                  </div>
                </div>

                {/* Display Order & Active Checkbox */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_active_checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 w-4 h-4"
                    />
                    <label htmlFor="is_active_checkbox" className="text-xs font-semibold text-slate-700 dark:text-neutral-300 cursor-pointer">
                      Active on Homepage Carousel
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-neutral-400 font-mono">Order:</span>
                    <input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value, 10) || 0 })}
                      className="w-14 px-2 py-1 text-center text-xs rounded bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 font-mono"
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving || uploadingImage || !formData.image_url}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{editingItem ? 'Update Slide' : 'Create Slide'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
