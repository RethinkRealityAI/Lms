'use client';

import { useCallback, useContext, useEffect, useState } from 'react';
import { BookmarkPlus, FolderOpen, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EditorStoreContext } from '@/components/editor/editor-store-context';
import {
  applySurveyTemplate,
  createSurveyTemplate,
  deleteSurveyTemplate,
  getSurveyTemplates,
  type SurveyTemplate,
} from '@/lib/db/survey-templates';
import type { SurveyData } from '@/lib/content/blocks/survey/schema';

interface SurveyTemplateToolbarProps {
  data: SurveyData;
  onApply: (data: SurveyData) => void;
}

export function SurveyTemplateToolbar({ data, onApply }: SurveyTemplateToolbarProps) {
  // Read the editor store WITHOUT throwing when rendered outside the course editor.
  // The admin Surveys hub reuses SurveyEditor to build templates, where there is no
  // EditorStoreContext.Provider — useEditorStore() would throw and crash the page.
  // institutionId is set once at course load and never changes, so a non-reactive
  // getState() read is correct; when there's no store (the hub), institutionId is
  // undefined and the redundant save/load toolbar hides itself (return null below).
  const store = useContext(EditorStoreContext);
  const institutionId = store?.getState().institutionId;
  const [templates, setTemplates] = useState<SurveyTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('');
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const loadTemplates = useCallback(async () => {
    if (!institutionId) return;
    setLoading(true);
    const supabase = createClient();
    const rows = await getSurveyTemplates(supabase, institutionId);
    setTemplates(rows);
    setLoading(false);
  }, [institutionId]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleApply = () => {
    const template = templates.find((t) => t.id === selectedId);
    if (!template) {
      toast.error('Select a template first');
      return;
    }
    onApply(applySurveyTemplate(template));
    toast.success(`Loaded template "${template.name}"`);
  };

  const handleSave = async () => {
    if (!institutionId) {
      toast.error('Institution not loaded');
      return;
    }
    const name = saveName.trim();
    if (!name) {
      toast.error('Template name is required');
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { template, error } = await createSurveyTemplate(supabase, {
      institutionId,
      name,
      description: saveDescription.trim() || undefined,
      data,
      createdBy: user?.id,
    });
    setSaving(false);
    if (error || !template) {
      toast.error('Failed to save template', { description: error ?? undefined });
      return;
    }
    toast.success(`Saved template "${template.name}"`);
    setSaveOpen(false);
    setSaveName('');
    setSaveDescription('');
    await loadTemplates();
    setSelectedId(template.id);
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    const template = templates.find((t) => t.id === selectedId);
    if (!template) return;
    if (!window.confirm(`Delete template "${template.name}"? This cannot be undone.`)) return;

    const supabase = createClient();
    const { error } = await deleteSurveyTemplate(supabase, selectedId);
    if (error) {
      toast.error('Failed to delete template', { description: error });
      return;
    }
    toast.success('Template deleted');
    setSelectedId('');
    await loadTemplates();
  };

  if (!institutionId) return null;

  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3 space-y-3">
      <div>
        <p className="text-xs font-semibold text-violet-800 uppercase tracking-wider">Survey templates</p>
        <p className="text-[11px] text-violet-600/80 mt-0.5">
          Save this survey or load a reusable template from your institution
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="bg-white h-9 text-sm">
            <SelectValue placeholder={loading ? 'Loading templates…' : 'Choose a saved template'} />
          </SelectTrigger>
          <SelectContent>
            {templates.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground select-none">
                No templates saved yet
              </div>
            ) : (
              templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} ({t.data.questions?.length ?? 0} questions)
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="flex-1 min-w-[120px] bg-white"
            disabled={!selectedId || loading}
            onClick={handleApply}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <FolderOpen className="h-3.5 w-3.5 mr-1.5" />}
            Load template
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="flex-1 min-w-[120px] bg-white"
            onClick={() => {
              setSaveName(data.title?.trim() || 'Survey template');
              setSaveOpen(true);
            }}
          >
            <BookmarkPlus className="h-3.5 w-3.5 mr-1.5" />
            Save as template
          </Button>
          {selectedId && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="bg-white text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save survey template</DialogTitle>
            <DialogDescription>
              Saves the current title, description, and all questions for reuse in any course.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="survey-template-name">Template name</Label>
              <Input
                id="survey-template-name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g. Module completion feedback"
              />
            </div>
            <div>
              <Label htmlFor="survey-template-desc">Description (optional)</Label>
              <Input
                id="survey-template-desc"
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                placeholder="When to use this survey"
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
