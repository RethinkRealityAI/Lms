'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import CourseViewer from '@/components/student/course-viewer';

// Optional deep link (?lesson=&slide=), e.g. "Go to quiz" from the survey page.
// Read client-side: the tenant middleware rewrite does not carry the query string
// through to the server-side searchParams prop. CourseViewer only honours the link
// for a lesson the learner has already completed.
function StudentCourse({ courseId }: { courseId: string }) {
  const searchParams = useSearchParams();
  return (
    <CourseViewer
      courseId={courseId}
      initialLessonId={searchParams.get('lesson')}
      initialSlideId={searchParams.get('slide')}
    />
  );
}

export default function StudentCoursePage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = React.use(paramsPromise);
  return (
    <Suspense fallback={null}>
      <StudentCourse courseId={params.id} />
    </Suspense>
  );
}
