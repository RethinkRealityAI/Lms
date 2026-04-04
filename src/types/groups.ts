export interface UserGroup {
  id: string;
  institution_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserGroupWithCounts extends UserGroup {
  member_count: number;
  course_count: number;
}

export interface UserGroupMember {
  id: string;
  group_id: string;
  user_id: string | null;
  legacy_user_id: string | null;
  added_at: string;
  // Joined fields
  email?: string;
  full_name?: string | null;
  role?: string;
  source: 'active' | 'legacy';
}

export interface CourseUserAssignment {
  id: string;
  course_id: string;
  user_id: string;
  assigned_at: string;
  assigned_by: string | null;
  // Joined fields
  email?: string;
  full_name?: string | null;
}

export interface CourseGroupAssignment {
  id: string;
  course_id: string;
  group_id: string;
  assigned_at: string;
  assigned_by: string | null;
  // Joined fields
  group_name?: string;
  member_count?: number;
}

export interface CourseAssignments {
  users: CourseUserAssignment[];
  groups: CourseGroupAssignment[];
}
