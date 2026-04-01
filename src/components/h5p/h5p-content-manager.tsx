'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface H5PContentItem {
  id: string;
  title: string;
  content_key: string;
  content_type?: string;
  metadata?: Record<string, any>;
}

export function H5PContentManager() {
  const [items, setItems] = useState<H5PContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [contentKey, setContentKey] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/h5p/content', { cache: 'no-store' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load H5P content');
      setItems(body.items || []);
    } catch (error: any) {
      toast.error('Failed to load H5P content', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !contentKey.trim()) {
      toast.error('Title and content key are required.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/h5p/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          contentKey: contentKey.trim(),
          contentType: 'h5p',
          metadata: {
            embedUrl: embedUrl.trim() || null,
          },
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to create H5P content');

      toast.success('H5P content registered.');
      setTitle('');
      setContentKey('');
      setEmbedUrl('');
      await loadItems();
    } catch (error: any) {
      toast.error('Failed to create H5P content', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="space-y-3 rounded-lg border p-4">
        <h3 className="text-lg font-semibold">Register H5P Content</h3>
        <div className="space-y-1">
          <Label htmlFor="h5p-title">Title</Label>
          <Input id="h5p-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="h5p-content-key">Content Key</Label>
          <Input
            id="h5p-content-key"
            value={contentKey}
            onChange={(e) => setContentKey(e.target.value)}
            placeholder="h5p-interactive-video-lesson-01"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="h5p-embed-url">Embed URL (optional)</Label>
          <Input
            id="h5p-embed-url"
            value={embedUrl}
            onChange={(e) => setEmbedUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save H5P Content'}
        </Button>
      </form>

      <div className="space-y-3 rounded-lg border p-4">
        <h3 className="text-lg font-semibold">Registered H5P Content</h3>
        {loading ? <p>Loading...</p> : null}
        {!loading && items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No H5P items yet.</p>
        ) : null}
        {!loading &&
          items.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">Key: {item.content_key}</p>
              <p className="text-xs text-muted-foreground">
                Embed URL: {item.metadata?.embedUrl || 'not configured'}
              </p>
            </div>
          ))}
      </div>
    </div>
  );
}
