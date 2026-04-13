'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { CertificateRenderer } from './certificate-renderer';
import { resolveInstitutionSlug } from '@/lib/tenant/path';
import { createClient } from '@/lib/supabase/client';
import { Paintbrush, FolderOpen, Search, ChevronLeft, Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import type { CertificateTemplate, CertificateLayoutConfig, CertificateFieldConfig, CertificateBackgroundConfig, CertificateData } from '@/types';

interface CanvaBrowseItem {
  id: string;
  title?: string;
  thumbnail?: { url: string; width: number; height: number };
  type?: string;
  folder?: { id: string; name: string; thumbnail?: { url: string } };
  design?: { id: string; title?: string; thumbnail?: { url: string; width: number; height: number } };
}

interface TemplateEditorProps {
  template?: CertificateTemplate;
  onSave: (data: {
    name: string;
    description: string;
    layout_config: CertificateLayoutConfig;
    is_default: boolean;
  }) => Promise<void>;
  onCanvaDesign: (templateId?: string) => void;
  onSelectCanvaDesign?: (designId: string) => void;
  saving?: boolean;
}

const SAMPLE_DATA: CertificateData = {
  student_name: 'Jane Doe',
  course_title: 'Fundamentals of Effective Advocacy',
  completion_date: 'April 9, 2026',
  certificate_number: 'GANSID-2026-00001',
  institution_name: 'Global Action Network for Sickle Cell & Other Inherited Blood Disorders',
};

const FIELD_LABELS: Record<string, string> = {
  student_name: 'Student Name',
  course_title: 'Course Title',
  completion_date: 'Completion Date',
  certificate_number: 'Certificate Number',
  institution_name: 'Institution Name',
};

const GRADIENT_DIRECTIONS: { value: string; label: string }[] = [
  { value: '135deg', label: 'Diagonal (to bottom right)' },
  { value: '90deg', label: 'Horizontal (to right)' },
  { value: '180deg', label: 'Vertical (to bottom)' },
  { value: '45deg', label: 'Diagonal (to top right)' },
  { value: '270deg', label: 'Horizontal (to left)' },
  { value: '0deg', label: 'Vertical (to top)' },
  { value: '315deg', label: 'Diagonal (to top left)' },
  { value: '225deg', label: 'Diagonal (to bottom left)' },
];

export function TemplateEditor({ template, onSave, onCanvaDesign, onSelectCanvaDesign, saving }: TemplateEditorProps) {
  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [isDefault, setIsDefault] = useState(template?.is_default ?? false);
  const [canvaDesignUrl, setCanvaDesignUrl] = useState<string | null>(template?.canva_design_url ?? null);
  const [showBrowser, setShowBrowser] = useState(false);
  const [browseItems, setBrowseItems] = useState<CanvaBrowseItem[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseSearch, setBrowseSearch] = useState('');
  const [browseFolderId, setBrowseFolderId] = useState<string | null>(null);
  const [browseFolderName, setBrowseFolderName] = useState<string | null>(null);
  const [browseNeedsAuth, setBrowseNeedsAuth] = useState(false);

  const [bgUploading, setBgUploading] = useState(false);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  const handleBgImageUpload = useCallback(async (file: File) => {
    setBgUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop();
      const path = `certificate-backgrounds/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('canva-exports')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from('canva-exports').getPublicUrl(path);
      setLayoutConfig((prev) => ({
        ...prev,
        background: {
          ...prev.background,
          type: 'image' as const,
          imageUrl: urlData.publicUrl,
        },
      }));
      toast.success('Background image uploaded');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Upload failed', {
        description: msg.includes('bucket') || msg.includes('not found')
          ? 'Storage bucket "canva-exports" not found. Create it in Supabase Storage.'
          : msg,
      });
    } finally {
      setBgUploading(false);
    }
  }, []);

  const fetchDesigns = useCallback(async (query?: string, folderId?: string | null) => {
    setBrowseLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('query', query);
      if (folderId) params.set('folderId', folderId);
      const resp = await fetch(`/api/canva/browse?${params}`);
      const data = await resp.json();
      if (data.needsAuth) {
        setBrowseNeedsAuth(true);
        setBrowseItems([]);
        return;
      }
      if (data.error) {
        toast.error(data.error);
        setBrowseItems([]);
        return;
      }
      setBrowseNeedsAuth(false);
      setBrowseItems(data.items ?? []);
    } catch {
      toast.error('Failed to load Canva designs');
    } finally {
      setBrowseLoading(false);
    }
  }, []);

  const handleOpenBrowser = () => {
    setShowBrowser(true);
    setBrowseFolderId(null);
    setBrowseFolderName(null);
    fetchDesigns();
  };

  const handleSearchDesigns = () => {
    setBrowseFolderId(null);
    setBrowseFolderName(null);
    fetchDesigns(browseSearch || undefined);
  };

  const handleOpenFolder = (folderId: string, folderName: string) => {
    setBrowseFolderId(folderId);
    setBrowseFolderName(folderName);
    fetchDesigns(undefined, folderId);
  };

  const handleSelectDesign = async (designId: string) => {
    if (onSelectCanvaDesign) {
      onSelectCanvaDesign(designId);
    }
    setShowBrowser(false);
    toast.success('Design selected — exporting background...');
  };
  const [layoutConfig, setLayoutConfig] = useState<CertificateLayoutConfig>(
    template?.layout_config ?? {
      width: 1056,
      height: 816,
      orientation: 'landscape' as const,
      fields: {
        student_name: { x: 528, y: 340, fontSize: 36, fontWeight: 'bold', color: '#FFFFFF', align: 'center' as const },
        course_title: { x: 528, y: 400, fontSize: 22, color: '#E2E8F0', align: 'center' as const },
        completion_date: { x: 528, y: 460, fontSize: 16, color: '#94A3B8', align: 'center' as const },
        certificate_number: { x: 940, y: 770, fontSize: 11, color: '#64748B', align: 'right' as const },
        institution_name: { x: 528, y: 520, fontSize: 13, color: '#94A3B8', align: 'center' as const },
      },
    }
  );

  const updateBackground = (updates: Partial<CertificateBackgroundConfig>) => {
    setLayoutConfig((prev) => ({
      ...prev,
      background: {
        type: 'default' as const,
        ...prev.background,
        ...updates,
      },
    }));
  };

  const updateField = (fieldKey: string, prop: keyof CertificateFieldConfig, value: number | string) => {
    setLayoutConfig((prev) => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldKey]: {
          ...prev.fields[fieldKey as keyof typeof prev.fields],
          [prop]: prop === 'fontSize' || prop === 'x' || prop === 'y' ? Number(value) : value,
        },
      },
    }));
  };

  const handleSubmit = async () => {
    await onSave({ name, description, layout_config: layoutConfig, is_default: isDefault });
  };

  const previewTemplate: CertificateTemplate = {
    id: template?.id ?? '',
    institution_id: template?.institution_id ?? '',
    name,
    description,
    canva_design_id: template?.canva_design_id ?? null,
    canva_design_url: canvaDesignUrl,
    layout_config: layoutConfig,
    is_default: isDefault,
    created_by: null,
    created_at: '',
    updated_at: '',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Form */}
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="template-name">Template Name</Label>
          <Input
            id="template-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. GANSID Advocacy Certificate"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="template-desc">Description</Label>
          <Textarea
            id="template-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description for internal use"
            rows={2}
          />
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={isDefault} onCheckedChange={setIsDefault} id="is-default" />
          <Label htmlFor="is-default">Set as institution default</Label>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => onCanvaDesign(template?.id)}
            >
              <Paintbrush className="h-4 w-4 mr-1.5" />
              {template?.canva_design_id ? 'Edit in Canva' : 'New Design'}
            </Button>
            <Button
              variant="outline"
              onClick={handleOpenBrowser}
            >
              <FolderOpen className="h-4 w-4 mr-1.5" />
              Browse Designs
            </Button>
          </div>
          {canvaDesignUrl && (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <p className="text-xs text-green-700 font-medium">Canva background applied</p>
              <button
                type="button"
                onClick={() => setCanvaDesignUrl(null)}
                className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Canva Design Browser */}
        {showBrowser && (
          <div className="border rounded-xl p-4 space-y-3 bg-slate-50">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-700">
                {browseFolderName ? `Folder: ${browseFolderName}` : 'Your Canva Designs'}
              </h4>
              <Button size="sm" variant="ghost" onClick={() => setShowBrowser(false)} className="text-xs">
                Close
              </Button>
            </div>

            {browseFolderId && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setBrowseFolderId(null); setBrowseFolderName(null); fetchDesigns(browseSearch || undefined); }}
                className="text-xs"
              >
                <ChevronLeft className="h-3 w-3 mr-1" />
                Back to all designs
              </Button>
            )}

            {!browseFolderId && (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    value={browseSearch}
                    onChange={(e) => setBrowseSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchDesigns()}
                    placeholder="Search designs..."
                    className="pl-7 h-8 text-xs"
                  />
                </div>
                <Button size="sm" onClick={handleSearchDesigns} className="h-8 text-xs bg-[#1E3A5F]">
                  Search
                </Button>
              </div>
            )}

            {browseNeedsAuth && (
              <div className="text-center py-6">
                <p className="text-sm text-slate-500 mb-2">Connect your Canva account to browse designs</p>
                <Button size="sm" onClick={() => window.open('/api/auth/canva', 'canva-auth', 'width=600,height=700,popup=yes')}>
                  Connect Canva
                </Button>
              </div>
            )}

            {browseLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            )}

            {!browseLoading && !browseNeedsAuth && browseItems.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-6">No designs found</p>
            )}

            {!browseLoading && !browseNeedsAuth && browseItems.length > 0 && (
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {browseItems.map((item) => {
                  // Folder item from folder listing
                  if (item.type === 'folder' && item.folder) {
                    return (
                      <button
                        key={item.folder.id}
                        onClick={() => handleOpenFolder(item.folder!.id, item.folder!.name)}
                        className="group border rounded-lg overflow-hidden hover:ring-2 hover:ring-[#1E3A5F] transition-all bg-white"
                      >
                        <div className="h-16 bg-slate-100 flex items-center justify-center">
                          <FolderOpen className="h-8 w-8 text-slate-300" />
                        </div>
                        <p className="text-[10px] font-medium text-slate-600 p-1.5 truncate">{item.folder.name}</p>
                      </button>
                    );
                  }

                  // Design item — either from designs list or folder listing
                  const designId = item.id ?? item.design?.id;
                  const title = item.title ?? item.design?.title;
                  const thumbnailUrl = item.thumbnail?.url ?? item.design?.thumbnail?.url;

                  if (!designId) return null;

                  return (
                    <button
                      key={designId}
                      onClick={() => handleSelectDesign(designId)}
                      className="group border rounded-lg overflow-hidden hover:ring-2 hover:ring-[#1E3A5F] transition-all bg-white"
                    >
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt={title ?? 'Design'}
                          className="h-16 w-full object-cover"
                        />
                      ) : (
                        <div className="h-16 bg-slate-100 flex items-center justify-center">
                          <Paintbrush className="h-6 w-6 text-slate-300" />
                        </div>
                      )}
                      <p className="text-[10px] font-medium text-slate-600 p-1.5 truncate">{title ?? 'Untitled'}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Background customization */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-slate-700">Background</h3>
          <div className="border rounded-lg p-3 space-y-3">
            <div>
              <Label className="text-xs">Background Type</Label>
              <select
                value={canvaDesignUrl && (!layoutConfig.background || layoutConfig.background.type === 'default') ? 'canva' : (layoutConfig.background?.type ?? 'default')}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'canva') {
                    // Restore Canva background (only possible if template had one)
                    setCanvaDesignUrl(template?.canva_design_url ?? null);
                    setLayoutConfig((prev) => {
                      const { background: _bg, ...rest } = prev;
                      return rest as CertificateLayoutConfig;
                    });
                    return;
                  }
                  const type = val as CertificateBackgroundConfig['type'];
                  if (type === 'default') {
                    // Clear Canva background too — user wants the institution default
                    setCanvaDesignUrl(null);
                    setLayoutConfig((prev) => {
                      const { background: _bg, ...rest } = prev;
                      return rest as CertificateLayoutConfig;
                    });
                  } else {
                    // Clear Canva background when choosing a custom background type
                    if (canvaDesignUrl) {
                      setCanvaDesignUrl(null);
                    }
                    updateBackground({ type });
                  }
                }}
                className="w-full h-8 text-xs border rounded px-2 mt-1"
              >
                {(template?.canva_design_url || canvaDesignUrl) && (
                  <option value="canva">Canva Design</option>
                )}
                <option value="default">Default (Institution Theme)</option>
                <option value="solid">Solid Color</option>
                <option value="gradient">Gradient</option>
                <option value="image">Image</option>
              </select>
            </div>

            {layoutConfig.background?.type === 'solid' && (
              <div>
                <Label className="text-xs">Color</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="color"
                    value={layoutConfig.background.color ?? '#1E3A5F'}
                    onChange={(e) => updateBackground({ color: e.target.value })}
                    className="h-8 w-12 p-0.5 shrink-0"
                  />
                  <Input
                    type="text"
                    value={layoutConfig.background.color ?? '#1E3A5F'}
                    onChange={(e) => updateBackground({ color: e.target.value })}
                    className="h-8 text-xs font-mono"
                    placeholder="#1E3A5F"
                  />
                </div>
              </div>
            )}

            {layoutConfig.background?.type === 'gradient' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">From</Label>
                    <div className="flex gap-1 mt-1">
                      <Input
                        type="color"
                        value={layoutConfig.background.gradientFrom ?? '#1A3C6E'}
                        onChange={(e) => updateBackground({ gradientFrom: e.target.value })}
                        className="h-8 w-10 p-0.5 shrink-0"
                      />
                      <Input
                        type="text"
                        value={layoutConfig.background.gradientFrom ?? '#1A3C6E'}
                        onChange={(e) => updateBackground({ gradientFrom: e.target.value })}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">To</Label>
                    <div className="flex gap-1 mt-1">
                      <Input
                        type="color"
                        value={layoutConfig.background.gradientTo ?? '#0F172A'}
                        onChange={(e) => updateBackground({ gradientTo: e.target.value })}
                        className="h-8 w-10 p-0.5 shrink-0"
                      />
                      <Input
                        type="text"
                        value={layoutConfig.background.gradientTo ?? '#0F172A'}
                        onChange={(e) => updateBackground({ gradientTo: e.target.value })}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Direction</Label>
                  <select
                    value={layoutConfig.background.gradientDirection ?? '135deg'}
                    onChange={(e) => updateBackground({ gradientDirection: e.target.value })}
                    className="w-full h-8 text-xs border rounded px-2 mt-1"
                  >
                    {GRADIENT_DIRECTIONS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
                {/* Gradient preview swatch */}
                <div
                  className="h-6 rounded border"
                  style={{
                    background: `linear-gradient(${layoutConfig.background.gradientDirection ?? '135deg'}, ${layoutConfig.background.gradientFrom ?? '#1A3C6E'}, ${layoutConfig.background.gradientTo ?? '#0F172A'})`,
                  }}
                />
              </>
            )}

            {layoutConfig.background?.type === 'image' && (
              <div className="space-y-2">
                {layoutConfig.background.imageUrl ? (
                  <div className="relative rounded-lg overflow-hidden border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={layoutConfig.background.imageUrl}
                      alt="Background preview"
                      className="w-full h-24 object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 hover:bg-black/40 transition-colors group">
                      <button
                        type="button"
                        onClick={() => bgFileInputRef.current?.click()}
                        className="px-2.5 py-1 text-xs font-medium text-white bg-white/20 rounded-md backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/30"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={() => updateBackground({ imageUrl: undefined })}
                        className="p-1 text-white bg-white/20 rounded-md backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/60"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => !bgUploading && bgFileInputRef.current?.click()}
                    className={`w-full flex flex-col items-center justify-center gap-1.5 border-2 border-dashed rounded-lg py-5 cursor-pointer transition-all duration-150 ${
                      bgUploading ? 'opacity-60 cursor-wait' : 'border-gray-200 hover:border-[#1E3A5F] hover:bg-gray-50'
                    }`}
                  >
                    {bgUploading ? (
                      <Loader2 className="w-5 h-5 text-[#1E3A5F] animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5 text-gray-400" />
                    )}
                    <span className="text-xs font-medium text-gray-500">
                      {bgUploading ? 'Uploading...' : 'Upload background image'}
                    </span>
                    <span className="text-[10px] text-gray-400">PNG, JPG, or WebP</span>
                  </div>
                )}
                <input
                  ref={bgFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleBgImageUpload(file);
                    if (bgFileInputRef.current) bgFileInputRef.current.value = '';
                  }}
                />
                <Input
                  type="text"
                  value={layoutConfig.background.imageUrl ?? ''}
                  onChange={(e) => updateBackground({ imageUrl: e.target.value })}
                  className="h-8 text-xs"
                  placeholder="Or paste image URL"
                />
              </div>
            )}
          </div>
        </div>

        {/* Field position editors */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-slate-700">Field Positions</h3>
          {Object.entries(layoutConfig.fields).map(([key, config]) => (
            <div key={key} className="border rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-slate-600">{FIELD_LABELS[key] ?? key}</p>
              <div className="grid grid-cols-5 gap-2">
                <div>
                  <Label className="text-xs">Y</Label>
                  <Input
                    type="number"
                    value={config.y}
                    onChange={(e) => updateField(key, 'y', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Size</Label>
                  <Input
                    type="number"
                    value={config.fontSize}
                    onChange={(e) => updateField(key, 'fontSize', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Color</Label>
                  <Input
                    type="color"
                    value={config.color}
                    onChange={(e) => updateField(key, 'color', e.target.value)}
                    className="h-8 p-0.5"
                  />
                </div>
                <div>
                  <Label className="text-xs">Weight</Label>
                  <select
                    value={config.fontWeight ?? 'normal'}
                    onChange={(e) => updateField(key, 'fontWeight', e.target.value)}
                    className="w-full h-8 text-xs border rounded px-1"
                  >
                    <option value="normal">Normal</option>
                    <option value="300">Light</option>
                    <option value="600">Semibold</option>
                    <option value="bold">Bold</option>
                    <option value="800">Extra Bold</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Align</Label>
                  <select
                    value={config.align}
                    onChange={(e) => updateField(key, 'align', e.target.value)}
                    className="w-full h-8 text-xs border rounded px-1"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!name.trim() || saving}
          className="w-full bg-[#1E3A5F] hover:bg-[#162d4a]"
        >
          {saving ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
        </Button>
      </div>

      {/* Right: Live Preview */}
      <div className="lg:sticky lg:top-4">
        <h3 className="text-sm font-bold text-slate-500 mb-3">Live Preview</h3>
        <div className="bg-slate-100 rounded-xl p-4 flex justify-center">
          <CertificateRenderer
            key={`${canvaDesignUrl ?? 'no-canva'}-${layoutConfig.background?.type ?? 'default'}-${layoutConfig.background?.imageUrl ?? ''}`}
            template={previewTemplate}
            data={SAMPLE_DATA}
            scale={0.5}
            showQR={false}
            institutionSlug={resolveInstitutionSlug()}
          />
        </div>
      </div>
    </div>
  );
}
