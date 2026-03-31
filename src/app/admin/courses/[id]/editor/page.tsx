import React from 'react';
import { CourseEditorShell } from '@/components/editor/course-editor-shell';

export default function EditorPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = React.use(paramsPromise);
  return <CourseEditorShell courseId={params.id} />;
}
