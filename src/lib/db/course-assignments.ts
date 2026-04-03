import type { SupabaseClient } from '@supabase/supabase-js';
import type { CourseAssignments, CourseUserAssignment, CourseGroupAssignment } from '@/types';

export async function getCourseAssignments(
  supabase: SupabaseClient,
  courseId: string
): Promise<CourseAssignments> {
  const [userResult, groupResult] = await Promise.all([
    supabase
      .from('course_user_assignments')
      .select('*, users:user_id(email, full_name)')
      .eq('course_id', courseId),
    supabase
      .from('course_group_assignments')
      .select('*, user_groups:group_id(name, user_group_members(count))')
      .eq('course_id', courseId),
  ]);

  const users: CourseUserAssignment[] = (userResult.data ?? []).map((a: any) => ({
    id: a.id,
    course_id: a.course_id,
    user_id: a.user_id,
    assigned_at: a.assigned_at,
    assigned_by: a.assigned_by,
    email: a.users?.email,
    full_name: a.users?.full_name,
  }));

  const groups: CourseGroupAssignment[] = (groupResult.data ?? []).map((a: any) => ({
    id: a.id,
    course_id: a.course_id,
    group_id: a.group_id,
    assigned_at: a.assigned_at,
    assigned_by: a.assigned_by,
    group_name: a.user_groups?.name,
    member_count: a.user_groups?.user_group_members?.[0]?.count ?? 0,
  }));

  return { users, groups };
}

export async function setCourseUserAssignments(
  supabase: SupabaseClient,
  courseId: string,
  userIds: string[],
  assignedBy: string
): Promise<void> {
  // Delete assignments not in the new list
  if (userIds.length > 0) {
    await supabase
      .from('course_user_assignments')
      .delete()
      .eq('course_id', courseId)
      .not('user_id', 'in', `(${userIds.join(',')})`);
  } else {
    await supabase
      .from('course_user_assignments')
      .delete()
      .eq('course_id', courseId);
  }

  // Insert new assignments (upsert-like: ignore conflicts)
  if (userIds.length > 0) {
    const rows = userIds.map((user_id) => ({
      course_id: courseId,
      user_id,
      assigned_by: assignedBy,
    }));
    await supabase
      .from('course_user_assignments')
      .upsert(rows, { onConflict: 'course_id,user_id', ignoreDuplicates: true });
  }
}

export async function setCourseGroupAssignments(
  supabase: SupabaseClient,
  courseId: string,
  groupIds: string[],
  assignedBy: string
): Promise<void> {
  if (groupIds.length > 0) {
    await supabase
      .from('course_group_assignments')
      .delete()
      .eq('course_id', courseId)
      .not('group_id', 'in', `(${groupIds.join(',')})`);
  } else {
    await supabase
      .from('course_group_assignments')
      .delete()
      .eq('course_id', courseId);
  }

  if (groupIds.length > 0) {
    const rows = groupIds.map((group_id) => ({
      course_id: courseId,
      group_id,
      assigned_by: assignedBy,
    }));
    await supabase
      .from('course_group_assignments')
      .upsert(rows, { onConflict: 'course_id,group_id', ignoreDuplicates: true });
  }
}

export async function getVisibleCourseIds(
  supabase: SupabaseClient,
  userId: string,
  institutionId: string
): Promise<string[]> {
  // Get all published courses for institution
  const { data: allCourses, error: coursesErr } = await supabase
    .from('courses')
    .select('id, access_mode')
    .eq('institution_id', institutionId)
    .eq('is_published', true);

  if (coursesErr || !allCourses) return [];

  const openCourseIds = allCourses
    .filter((c: any) => c.access_mode === 'all')
    .map((c: any) => c.id);

  const restrictedCourseIds = allCourses
    .filter((c: any) => c.access_mode === 'restricted')
    .map((c: any) => c.id);

  if (restrictedCourseIds.length === 0) return openCourseIds;

  // Check direct user assignments
  const { data: userAssignments } = await supabase
    .from('course_user_assignments')
    .select('course_id')
    .eq('user_id', userId)
    .in('course_id', restrictedCourseIds);

  // Check group assignments
  const { data: groupMemberships } = await supabase
    .from('user_group_members')
    .select('group_id')
    .eq('user_id', userId);

  const userGroupIds = (groupMemberships ?? []).map((m: any) => m.group_id);

  let groupAssignedCourseIds: string[] = [];
  if (userGroupIds.length > 0) {
    const { data: groupAssignments } = await supabase
      .from('course_group_assignments')
      .select('course_id')
      .in('group_id', userGroupIds)
      .in('course_id', restrictedCourseIds);

    groupAssignedCourseIds = (groupAssignments ?? []).map((a: any) => a.course_id);
  }

  const directCourseIds = (userAssignments ?? []).map((a: any) => a.course_id);
  const visibleRestricted = [...new Set([...directCourseIds, ...groupAssignedCourseIds])];

  return [...openCourseIds, ...visibleRestricted];
}
