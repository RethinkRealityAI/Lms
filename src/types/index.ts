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

export type UserRole =
  | 'platform_admin'
  | 'institution_admin'
  | 'instructor'
  | 'student'
  | 'admin'; // Backward-compatible legacy value

export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  occupation?: string;
  affiliation?: string;
  country?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  institution_id?: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Course {
  id: string;
  institution_id?: string;
  title: string;
  description: string;
  category_id?: string;
  thumbnail_url?: string;
  created_by: string;
  is_published: boolean;
  access_mode?: 'all' | 'restricted';
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface Module {
  id: string;
  course_id: string;
  institution_id?: string;
  title: string;
  description?: string;
  order_index: number;
  is_published: boolean;
  prerequisite_module_id?: string;
  unlock_date?: string;
  created_at: string;
  updated_at: string;
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  institution_id?: string;
  course_id: string;
  title: string;
  description: string;
  content_type: 'video' | 'pdf' | 'iframe' | '3d';
  content_url: string;
  order_index: number;
  created_at: string;
  module_id?: string;
  is_required: boolean;
  prerequisite_lesson_id?: string;
  title_image_url?: string | null;
}

export type LessonBlockType =
  | 'rich_text'
  | 'video'
  | 'image'
  | 'pdf'
  | 'iframe'
  | 'model3d'
  | 'h5p'
  | 'canvas'
  | 'quiz_summary'
  | 'download'
  | 'cta'
  | 'image_gallery'
  | 'audio'
  | 'hotspot'
  | 'quiz_inline'
  | 'callout';

export interface LessonBlock {
  id: string;
  institution_id: string;
  lesson_id: string;
  slide_id?: string;
  block_type: string;
  title?: string;
  data: Record<string, unknown>;
  order_index: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  is_visible: boolean;
  settings: Record<string, unknown>;
  version: number;
}

export interface Quiz {
  id: string;
  lesson_id: string;
  title: string;
  created_at: string;
  max_attempts: number;
  passing_score_percentage: number;
  scoring_mode: 'best' | 'latest' | 'average' | 'first';
  time_limit_minutes?: number;
  shuffle_questions: boolean;
}

export interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: string;
  question_data: Record<string, unknown>;
  correct_answer_data: Record<string, unknown>;
  points: number;
  explanation?: string;
  options?: string[]; // For MCQ - kept for backward compat
  correct_answer?: string; // Kept for backward compat
  order_index: number;
}

export interface QuizResponse {
  id: string;
  attempt_id: string;
  question_id: string;
  response_data: Record<string, unknown>;
  is_correct?: boolean;
  points_awarded?: number;
  answered_at: string;
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
  attempt_number: number;
  status: 'in_progress' | 'submitted' | 'graded';
  max_score?: number;
  percentage?: number;
  time_started?: string;
  graded_by?: string;
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

// --- Slide types ---

export type SlideType = 'title' | 'content' | 'media' | 'quiz' | 'disclaimer' | 'interactive' | 'cta' | 'canvas';
export type SlideStatus = 'draft' | 'published';
export type CourseStatus = 'draft' | 'published' | 'archived';

export interface Slide {
  id: string;
  lesson_id: string;
  slide_type: SlideType;
  title: string | null;
  order_index: number;
  status: SlideStatus;
  settings: Record<string, unknown>;
  canvas_data: Record<string, unknown> | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SlideTemplate {
  id: string;
  name: string;
  description: string | null;
  default_blocks: Array<{ block_type: string; data: Record<string, unknown> }>;
  thumbnail_url: string | null;
  institution_id: string | null;
  created_at: string;
}

export interface ContentActivityLog {
  id: string;
  institution_id: string | null;
  user_id: string | null;
  entity_type: 'course' | 'module' | 'lesson' | 'slide' | 'block';
  entity_id: string;
  action: 'created' | 'updated' | 'deleted' | 'published' | 'reordered';
  changes: Record<string, { old: unknown; new: unknown }>;
  created_at: string;
}

// --- Theme types ---

export interface InstitutionTheme {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  fontScale: number;
  logoUrl?: string;
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  slideTransition: 'none' | 'fade' | 'slide';
}

// --- Editor state types ---

export type EntitySelection =
  | { type: 'course'; id: string }
  | { type: 'module'; id: string }
  | { type: 'lesson'; id: string }
  | { type: 'slide'; id: string }
  | { type: 'block'; id: string };

export interface EditorAction {
  type: string;
  entityType: string;
  entityId: string;
  previousState: unknown;
  newState: unknown;
  timestamp: number;
}

export interface LegacyUser {
  id: string;
  institution_id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  roles: string | null;
  occupation: string | null;
  affiliation: string | null;
  country: string | null;
  date_registered: string | null;
  avg_progress: number;
  avg_score: number | null;
  completions: number;
  completed_percent: number;
  external_id: string | null;
  invited_at: string | null;
  accepted_at: string | null;
  linked_user_id: string | null;
  created_at: string;
}

export interface UserInvitation {
  id: string;
  institution_id: string;
  email: string;
  role: string;
  invited_by: string;
  custom_message: string | null;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  legacy_user_id: string | null;
  sent_at: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
  inviter_name?: string;
  inviter_email?: string;
}

export * from './groups';
