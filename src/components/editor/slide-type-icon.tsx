'use client';

import { FileText, Video, HelpCircle, AlertTriangle, Globe, MousePointerClick } from 'lucide-react';
import type { SlideType } from '@/types';

interface SlideTypeIconProps {
  type: SlideType;
  className?: string;
}

const icons: Record<SlideType, typeof FileText> = {
  title: FileText,
  content: FileText,
  media: Video,
  quiz: HelpCircle,
  disclaimer: AlertTriangle,
  interactive: Globe,
  cta: MousePointerClick,
};

export function SlideTypeIcon({ type, className = 'w-3.5 h-3.5' }: SlideTypeIconProps) {
  const Icon = icons[type] ?? FileText;
  return <Icon className={className} />;
}
