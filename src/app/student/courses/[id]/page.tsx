'use client';

import React from 'react';
import CourseViewer from '@/components/student/course-viewer';

export default function StudentCoursePage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = React.use(paramsPromise);
  return <CourseViewer courseId={params.id} />;
}
