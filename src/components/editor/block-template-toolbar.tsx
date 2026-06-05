'use client';

import { useCallback, useEffect, useState } from 'react';
import { BookmarkPlus, FolderOpen, Loader2, Trash2, LibraryBig } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useEditorStore } from '@/components/editor/editor-store-context';
import {
  applyBlockTemplate, createBlockTemplate, deleteBlockTemplate, getBlockTemplates,
  type BlockTemplate,
} from '@/lib/db/block-templates';

interface BlockTemplateToolbarProps {
  blockType: string;
  /** Friendly label for this block type (e.g. "Quiz"), used in copy + default names. */
  blockLabel: string;
  /** The block's current data (saved when "Save as template"). */
  data: Record<string, unknown>;
  /** Apply a template's data to the block (caller preserves layout/position). */
  onApply: (data: Record<string, unknown>) => void;
}

/** Best-effort human name from a block's data for the default template name. */
function deriveName(data: Record<string, unknown>, label: string): string {
  const candidates = ['title', 'question', 'heading', 'name', 'text', 'instructions', 'prompt'];
  for (const key of candidates) {
    const v = data?.[key];
    if (typeof v === 'string') {
      const clean = v.replace(/<[^>]*>/g, '').trim(); // strip any HTML
      if (clean) return clean.slice(0, 60);
    }
  }
  return `${label} template`;
}

export function BlockTemplateToolbar({ blockType, blockLabel, data, onApply }: BlockTemplateToolbarProps) {
  const institutionId = useEditorStore((s) => s.institutionId);
  const [templates, setTemplates] = useState<BlockTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('');
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const loadTemplates = useCallback(async () => {
    if (!institutionId) return;
    setLoading(true);
    const rows = await getBlockTemplates(createClient(), institutionId, blockType);
    setTemplates(rows);
    setLoading(false);
  }, [institutionId, blockType]);

  // Reset selection + reload when the block type changes (panel reused across blocks).
  useEffect(() => { setSelectedId(''); loadTemplates(); }, [loadTemplates]);

  const handleApply = () => {
    const template = templates.find((t) => t.id === selectedId);
    if (!template) { toast.error('Choose a template first'); return; }
    onApply(applyBlockTemplate(template));
    toast.success(`Loaded "${template.name}"`);
  };

  const handleSave = async () => {
    if (!institutionId) { toast.error('Institution not loaded'); return; }
    const name = saveName.trim();
    if (!name) { toast.error('Template name is required'); return; }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { template, error } = await createBlockTemplate(supabase, {
      institutionId, blockType, name,
      description: saveDescription.trim() || undefined,
      data, createdBy: user?.id,
    });
    setSaving(false);
    if (error || !template) {
      toast.error('Failed to save template', { description: error ?? undefined });
      return;
    }
    toast.success(`Saved "${template.name}"`);
    setSaveOpen(false);
    setSaveName('');
    setSaveDescription('');
    await loadTemplates();
    setSelectedId(template.id);
  };

  const handleDelete = async () => {
    const template = templates.find((t) => t.id === selectedId);
    if (!template) return;
    if (!window.confirm(`Delete template "${template.name}"? This cannot be undone.`)) return;
    const { error } = await deleteBlockTemplate(createClient(), selectedId);
    if (error) { toast.error('Failed to delete template', { description: error }); return; }
    toast.success('Template deleted');
    setSelectedId('');
    await loadTemplates();
  };

  if (!institutionId) return null;

  return (
    <div className="px-4 py-3 border-b border-gray-100 bg-slate-50/60">
      <div className="flex items-center gap-1.5 mb-2">
        <LibraryBig className="w-3.5 h-3.5 text-slate-400" />
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Template library</p>
        {templates.length > 0 && (
          <span className="ml-auto text-[10px] text-slate-400">{templates.length} saved</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="bg-white h-8 text-xs">
            <SelectValue placeholder={loading ? 'Loading…' : `Load a saved ${blockLabel.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {templates.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground select-none">No saved templates yet</div>
            ) : (
              templates.map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <Button
            type="button" size="sm" variant="outline"
            className="flex-1 h-8 text-xs bg-white"
            disabled={!selectedId || loading}
            onClick={handleApply}
          >
            <FolderOpen className="h-3.5 w-3.5 mr-1.5" /> Load
          </Button>
          <Button
            type="button" size="sm" variant="outline"
            className="flex-1 h-8 text-xs bg-white"
            onClick={() => { setSaveName(deriveName(data, blockLabel)); setSaveDescription(''); setSaveOpen(true); }}
          >
            <BookmarkPlus className="h-3.5 w-3.5 mr-1.5" /> Save
          </Button>
          {selectedId && (
            <Button
              type="button" size="sm" variant="outline"
              className="h-8 bg-white text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
              onClick={handleDelete}
              aria-label="Delete template"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save {blockLabel} as template</DialogTitle>
            <DialogDescription>
              Saves this {blockLabel.toLowerCase()}&apos;s content (not its position) so you can reuse it in any course.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="block-template-name">Template name</Label>
              <Input
                id="block-template-name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder={`e.g. ${blockLabel} — reusable`}
              />
            </div>
            <div>
              <Label htmlFor="block-template-desc">Description (optional)</Label>
              <Input
                id="block-template-desc"
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                placeholder="When to use this"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
