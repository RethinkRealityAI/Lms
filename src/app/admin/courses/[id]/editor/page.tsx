import React from 'react';
import { CourseEditorShell } from '@/components/editor/course-editor-shell';

export default function EditorPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = React.use(paramsPromise);
  // The editor shell renders as a fixed full-viewport overlay (z-[60])
  // so it covers the admin layout's nav and padding completely.
  return <CourseEditorShell courseId={params.id} />;
}
