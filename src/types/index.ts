// Declare model-viewer custom element for JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src?: string;
        alt?: string;
        'auto-rotate'?: boolean;
        'camera-controls'?: boolean;
      }, HTMLElement>;
    }
  }
}

export type UserRole = 'admin' | 'student';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category_id?: string;
  thumbnail_url?: string;
  created_by: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  description: string;
  content_type: 'video' | 'pdf' | 'iframe' | '3d';
  content_url: string;
  order_index: number;
  created_at: string;
}

export interface Quiz {
  id: string;
  lesson_id: string;
  title: string;
  created_at: string;
}

export interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: 'mcq' | 'fill_blank';
  options?: string[]; // For MCQ
  correct_answer: string;
  order_index: number;
}

export interface CourseEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
}

export interface Progress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  completed_at?: string;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  total_questions: number;
  completed_at: string;
}

export interface CourseReview {
  id: string;
  course_id: string;
  user_id: string;
  rating: number;
  review_text?: string;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface LessonComment {
  id: string;
  lesson_id: string;
  user_id: string;
  comment_text: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
  user?: User;
  replies?: LessonComment[];
}

export interface Certificate {
  id: string;
  user_id: string;
  course_id: string;
  issued_at: string;
  certificate_url?: string;
  course?: Course;
}
