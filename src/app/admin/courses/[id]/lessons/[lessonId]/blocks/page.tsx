'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { withInstitutionPath } from '@/lib/tenant/path';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAllBlockTypes, getBlockType } from '@/lib/content/block-registry';
import type { LessonBlock, LessonBlockType } from '@/types';

const URL_BLOCKS = new Set<LessonBlockType>(['video', 'image', 'pdf', 'iframe', 'model3d', 'download']);

export default function LessonBlocksPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const params = React.use(paramsPromise);
  const [lessonTitle, setLessonTitle] = useState('');
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<LessonBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    block_type: 'rich_text' as LessonBlockType,
    title: '',
    url: '',
    text: '',
    contentKey: '',
  });
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const selectedDefinition = useMemo(
    () => getBlockType(form.block_type),
    [form.block_type]
  );

  const load = async () => {
    setLoading(true);
    const { data: lesson } = await supabase
      .from('lessons')
      .select('id, title, institution_id')
      .eq('id', params.lessonId)
      .single();
    if (lesson) {
      setLessonTitle(lesson.title);
      setInstitutionId(lesson.institution_id);
    }

    const { data: blockRows } = await supabase
      .from('lesson_blocks')
      .select('*')
      .eq('lesson_id', params.lessonId)
      .order('order_index', { ascending: true });
    setBlocks((blockRows as LessonBlock[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [params.lessonId]);

  const addBlock = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!institutionId) return;

    setSaving(true);
    const nextIndex = blocks.length;
    const data: Record<string, any> = {};
    if (URL_BLOCKS.has(form.block_type)) data.url = form.url;
    if (form.block_type === 'rich_text') data.text = form.text;
    if (form.block_type === 'h5p') data.contentKey = form.contentKey;
    if (!data.url && !data.text && !data.contentKey) {
      data.description = form.title;
    }

    await supabase.from('lesson_blocks').insert([
      {
        institution_id: institutionId,
        lesson_id: params.lessonId,
        block_type: form.block_type,
        title: form.title,
        data,
        order_index: nextIndex,
      },
    ]);

    setForm({
      block_type: 'rich_text',
      title: '',
      url: '',
      text: '',
      contentKey: '',
    });
    await load();
    setSaving(false);
  };

  const deleteBlock = async (blockId: string) => {
    await supabase.from('lesson_blocks').delete().eq('id', blockId);
    await load();
  };

  return (
    <div className="space-y-6 px-4 sm:px-0">
      <Button variant="outline" onClick={() => router.push(withInstitutionPath(`/admin/courses/${params.id}`, pathname))}>
        Back to Course
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Lesson Blocks: {lessonTitle || params.lessonId}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={addBlock} className="space-y-3 rounded-lg border p-4">
            <h3 className="font-semibold">Add Block</h3>
            <div className="space-y-1">
              <Label htmlFor="block-type">Block Type</Label>
              <select
                id="block-type"
                value={form.block_type}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, block_type: e.target.value as LessonBlockType }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {getAllBlockTypes().map((item) => (
                  <option key={item.type} value={item.type}>
                    {item.label}
                  </option>
                ))}
              </select>
              {selectedDefinition ? (
                <p className="text-xs text-muted-foreground">{selectedDefinition.description}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="block-title">Title</Label>
              <Input
                id="block-title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            {URL_BLOCKS.has(form.block_type) ? (
              <div className="space-y-1">
                <Label htmlFor="block-url">URL</Label>
                <Input
                  id="block-url"
                  value={form.url}
                  onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
                  placeholder="https://..."
                  required
                />
              </div>
            ) : null}
            {form.block_type === 'rich_text' ? (
              <div className="space-y-1">
                <Label htmlFor="block-text">Text</Label>
                <Textarea
                  id="block-text"
                  rows={4}
                  value={form.text}
                  onChange={(e) => setForm((prev) => ({ ...prev, text: e.target.value }))}
                />
              </div>
            ) : null}
            {form.block_type === 'h5p' ? (
              <div className="space-y-1">
                <Label htmlFor="block-content-key">H5P Content Key</Label>
                <Input
                  id="block-content-key"
                  value={form.contentKey}
                  onChange={(e) => setForm((prev) => ({ ...prev, contentKey: e.target.value }))}
                  placeholder="h5p-interactive-video-lesson-01"
                  required
                />
              </div>
            ) : null}
            <Button type="submit" disabled={saving}>
              {saving ? 'Adding...' : 'Add Block'}
            </Button>
          </form>

          <div className="space-y-3">
            <h3 className="font-semibold">Existing Blocks</h3>
            {loading ? <p>Loading...</p> : null}
            {!loading && blocks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No blocks yet.</p>
            ) : null}
            {blocks.map((block) => (
              <div key={block.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      #{block.order_index + 1} {block.title || block.block_type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Type: {block.block_type}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => deleteBlock(block.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
