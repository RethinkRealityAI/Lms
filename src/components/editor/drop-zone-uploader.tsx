'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, Loader2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface DropZoneUploaderProps {
  /** Supabase storage bucket */
  bucket: string;
  /** Path prefix inside the bucket (e.g. "images/", "videos/") */
  pathPrefix?: string;
  /** File input accept attribute (e.g. "image/*", "video/*") */
  accept: string;
  /** Label shown in the drop zone */
  label?: string;
  /** Hint text below the label */
  hint?: string;
  /** Current file URL (if already uploaded — shows preview) */
  currentUrl?: string;
  /** Callback with the public URL after upload */
  onUpload: (url: string) => void;
  /** Optional callback when the current file is removed */
  onRemove?: () => void;
  /** Preview mode — 'image' shows thumbnail, 'filename' shows URL */
  previewMode?: 'image' | 'filename';
  /** Additional class for the outer container */
  className?: string;
}

export function DropZoneUploader({
  bucket,
  pathPrefix = '',
  accept,
  label = 'Drop file here or click to upload',
  hint,
  currentUrl,
  onUpload,
  onRemove,
  previewMode = 'image',
  className = '',
}: DropZoneUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop();
      const path = `${pathPrefix}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      onUpload(urlData.publicUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.includes('bucket') || msg.includes('not found')
          ? `Storage bucket "${bucket}" not found. Create it in Supabase Storage.`
          : msg,
      );
    } finally {
      setUploading(false);
    }
  }, [bucket, pathPrefix, onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  // If we have a file already, show preview with replace/remove
  if (currentUrl && !error) {
    return (
      <div className={`relative rounded-lg overflow-hidden border border-gray-200 ${className}`}>
        {previewMode === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentUrl} alt="" className="w-full h-24 object-cover" />
        ) : (
          <div className="px-3 py-2.5 bg-gray-50">
            <p className="text-xs text-green-700 truncate">{currentUrl}</p>
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 hover:bg-black/40 transition-colors group">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 text-xs font-medium text-white bg-white/20 rounded-md backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/30"
          >
            Replace
          </button>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1 text-white bg-white/20 rounded-md backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/60"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`w-full flex flex-col items-center justify-center gap-1.5 border-2 border-dashed rounded-lg py-5 cursor-pointer transition-all duration-150 ${
          isDragOver
            ? 'border-[#1E3A5F] bg-[#1E3A5F]/5 scale-[1.01]'
            : 'border-gray-200 hover:border-[#1E3A5F] hover:bg-gray-50'
        } ${uploading ? 'opacity-60 cursor-wait' : ''}`}
      >
        {uploading ? (
          <Loader2 className="w-5 h-5 text-[#1E3A5F] animate-spin" />
        ) : (
          <Upload className={`w-5 h-5 ${isDragOver ? 'text-[#1E3A5F]' : 'text-gray-400'}`} />
        )}
        <span className={`text-xs font-medium ${isDragOver ? 'text-[#1E3A5F]' : 'text-gray-500'}`}>
          {uploading ? 'Uploading...' : isDragOver ? 'Drop to upload' : label}
        </span>
        {hint && !isDragOver && (
          <span className="text-[10px] text-gray-400">{hint}</span>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
