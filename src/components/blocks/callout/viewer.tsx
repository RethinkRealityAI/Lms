'use client';

import { Info, AlertTriangle, Lightbulb, CheckCircle } from 'lucide-react';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { CalloutData } from '@/lib/content/blocks/callout/schema';

const VARIANT_CONFIG = {
  info: { icon: Info, className: 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-100' },
  warning: { icon: AlertTriangle, className: 'bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-950/30 dark:border-yellow-800 dark:text-yellow-100' },
  tip: { icon: Lightbulb, className: 'bg-green-50 border-green-200 text-green-900 dark:bg-green-950/30 dark:border-green-800 dark:text-green-100' },
  success: { icon: CheckCircle, className: 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-100' },
};

export default function CalloutViewer({ data }: BlockViewerProps<CalloutData>) {
  const { icon: Icon, className } = VARIANT_CONFIG[data.variant ?? 'info'];
  return (
    <div className={`flex gap-3 rounded-lg border p-4 ${className}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        {data.title && <p className="mb-1 font-semibold">{data.title}</p>}
        <div className="prose-sm" dangerouslySetInnerHTML={{ __html: data.html }} />
      </div>
    </div>
  );
}
