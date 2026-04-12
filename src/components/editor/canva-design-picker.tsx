'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paintbrush, FolderOpen, Search, ChevronLeft, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface CanvaDesignItem {
  id: string;
  title?: string;
  thumbnail?: { url: string; width: number; height: number };
  type?: string;
  design?: { id: string; title?: string; thumbnail?: { url: string } };
  folder?: { id: string; name: string; thumbnail?: { url: string } };
}

interface CanvaDesignPickerProps {
  /** Called when user selects a design — receives the exported image URL */
  onSelect: (imageUrl: string, designId: string) => void;
  /** Entity to attach the Canva design to (for tracking in the return flow) */
  entityType: 'slide' | 'template';
  entityId: string;
  /** Compact mode hides the search bar initially */
  compact?: boolean;
}

export function CanvaDesignPicker({ onSelect, entityType, entityId, compact }: CanvaDesignPickerProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CanvaDesignItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);

  const fetchDesigns = useCallback(async (query?: string, folder?: string | null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('query', query);
      if (folder) params.set('folderId', folder);
      const resp = await fetch(`/api/canva/browse?${params}`);
      const data = await resp.json();
      if (data.needsAuth) {
        setNeedsAuth(true);
        setItems([]);
        return;
      }
      if (data.error) {
        toast.error(data.error);
        setItems([]);
        return;
      }
      setNeedsAuth(false);
      setItems(data.items ?? []);
    } catch {
      toast.error('Failed to load Canva designs');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOpen = () => {
    setOpen(true);
    setFolderId(null);
    setFolderName(null);
    fetchDesigns();
  };

  const handleSelectDesign = async (designId: string) => {
    setImporting(designId);
    try {
      // Export the design via our return handler (server-side export + upload)
      const resp = await fetch(
        `/api/canva/return?designId=${designId}&entityType=${entityType}&entityId=${entityId}`
      );
      const html = await resp.text();

      // Parse the postMessage data from the response to get the imageUrl
      const match = html.match(/imageUrl:\s*"([^"]+)"/);
      if (match?.[1]) {
        onSelect(match[1], designId);
        setOpen(false);
        toast.success('Canva design imported');
      } else if (resp.ok) {
        // The return handler updated the entity directly — trigger a refresh
        onSelect('', designId);
        setOpen(false);
        toast.success('Canva design applied');
      } else {
        toast.error('Failed to export design from Canva');
      }
    } catch {
      toast.error('Failed to import Canva design');
    } finally {
      setImporting(null);
    }
  };

  const handleNewDesign = async () => {
    try {
      const resp = await fetch('/api/canva/designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          width: entityType === 'template' ? 1056 : 1920,
          height: entityType === 'template' ? 816 : 1080,
          title: entityType === 'template' ? 'Certificate Background' : 'Slide Background',
          entityType,
          entityId,
        }),
      });
      const data = await resp.json();

      if (data.needsAuth) {
        window.open('/api/auth/canva', 'canva-auth', 'width=600,height=700,popup=yes');
        return;
      }
      if (data.error) {
        toast.error(data.error);
        return;
      }

      window.open(data.editUrl, '_blank');
      toast.info('Design in Canva, then come back and use "Browse Designs" to import it.', {
        duration: 8000,
      });
    } catch {
      toast.error('Failed to connect to Canva');
    }
  };

  if (!open) {
    return (
      <div className="flex gap-1.5">
        <button
          onClick={handleNewDesign}
          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:border-[#1E3A5F] hover:text-[#1E3A5F] transition-colors"
        >
          <Paintbrush className="h-3 w-3" />
          New in Canva
        </button>
        <button
          onClick={handleOpen}
          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:border-[#1E3A5F] hover:text-[#1E3A5F] transition-colors"
        >
          <FolderOpen className="h-3 w-3" />
          Browse Canva
        </button>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-3 space-y-2.5 bg-slate-50">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-600">
          {folderName ?? 'Your Canva Designs'}
        </p>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {folderId && (
        <button
          onClick={() => { setFolderId(null); setFolderName(null); fetchDesigns(search || undefined); }}
          className="flex items-center text-xs text-[#1E3A5F] hover:underline"
        >
          <ChevronLeft className="h-3 w-3 mr-0.5" />
          Back
        </button>
      )}

      {!folderId && (
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1.5 h-3 w-3 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchDesigns(search || undefined)}
              placeholder="Search..."
              className="pl-6 h-7 text-xs"
            />
          </div>
          <Button size="sm" onClick={() => fetchDesigns(search || undefined)} className="h-7 text-xs bg-[#1E3A5F] px-2">
            Go
          </Button>
        </div>
      )}

      {needsAuth && (
        <div className="text-center py-4">
          <p className="text-xs text-slate-500 mb-2">Connect Canva first</p>
          <Button size="sm" onClick={() => window.open('/api/auth/canva', 'canva-auth', 'width=600,height=700,popup=yes')} className="text-xs">
            Connect
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      )}

      {!loading && !needsAuth && items.length === 0 && (
        <p className="text-center text-xs text-slate-400 py-4">No designs found</p>
      )}

      {!loading && !needsAuth && items.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
          {items.map((item) => {
            if (item.type === 'folder' && item.folder) {
              return (
                <button
                  key={item.folder.id}
                  onClick={() => { setFolderId(item.folder!.id); setFolderName(item.folder!.name); fetchDesigns(undefined, item.folder!.id); }}
                  className="border rounded overflow-hidden hover:ring-1 hover:ring-[#1E3A5F] transition-all bg-white"
                >
                  <div className="h-12 bg-slate-100 flex items-center justify-center">
                    <FolderOpen className="h-5 w-5 text-slate-300" />
                  </div>
                  <p className="text-[9px] font-medium text-slate-500 p-1 truncate">{item.folder.name}</p>
                </button>
              );
            }

            const designId = item.id ?? item.design?.id;
            const title = item.title ?? item.design?.title;
            const thumbUrl = item.thumbnail?.url ?? item.design?.thumbnail?.url;
            if (!designId) return null;

            const isImporting = importing === designId;

            return (
              <button
                key={designId}
                onClick={() => !isImporting && handleSelectDesign(designId)}
                disabled={!!importing}
                className="border rounded overflow-hidden hover:ring-1 hover:ring-[#1E3A5F] transition-all bg-white disabled:opacity-50"
              >
                {isImporting ? (
                  <div className="h-12 flex items-center justify-center bg-slate-50">
                    <Loader2 className="h-4 w-4 animate-spin text-[#1E3A5F]" />
                  </div>
                ) : thumbUrl ? (
                  <img src={thumbUrl} alt={title ?? ''} className="h-12 w-full object-cover" />
                ) : (
                  <div className="h-12 bg-slate-100 flex items-center justify-center">
                    <Paintbrush className="h-4 w-4 text-slate-300" />
                  </div>
                )}
                <p className="text-[9px] font-medium text-slate-500 p-1 truncate">{title ?? 'Untitled'}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}