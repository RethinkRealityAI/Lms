'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { CertificateRenderer } from './certificate-renderer';
import { Paintbrush } from 'lucide-react';
import type { CertificateTemplate, CertificateLayoutConfig, CertificateFieldConfig, CertificateData } from '@/types';

interface TemplateEditorProps {
  template?: CertificateTemplate;
  onSave: (data: {
    name: string;
    description: string;
    layout_config: CertificateLayoutConfig;
    is_default: boolean;
  }) => Promise<void>;
  onCanvaDesign: (templateId?: string) => void;
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

export function TemplateEditor({ template, onSave, onCanvaDesign, saving }: TemplateEditorProps) {
  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [isDefault, setIsDefault] = useState(template?.is_default ?? false);
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
    canva_design_url: template?.canva_design_url ?? null,
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

        <div>
          <Button
            variant="outline"
            onClick={() => onCanvaDesign(template?.id)}
            className="w-full"
          >
            <Paintbrush className="h-4 w-4 mr-2" />
            {template?.canva_design_id ? 'Edit Background in Canva' : 'Design Background in Canva'}
          </Button>
          {template?.canva_design_url && (
            <p className="text-xs text-green-600 mt-1">Canva background applied</p>
          )}
        </div>

        {/* Field position editors */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-slate-700">Field Positions</h3>
          {Object.entries(layoutConfig.fields).map(([key, config]) => (
            <div key={key} className="border rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-slate-600">{FIELD_LABELS[key] ?? key}</p>
              <div className="grid grid-cols-4 gap-2">
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
            template={previewTemplate}
            data={SAMPLE_DATA}
            scale={0.5}
            showQR={false}
          />
        </div>
      </div>
    </div>
  );
}
