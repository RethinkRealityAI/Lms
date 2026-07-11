import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  FEEDBACK_TYPES,
  isFeedbackType,
  isValidCategory,
  type FeedbackType,
  type FeedbackContext,
} from '@/lib/content/feedback-taxonomy';

const SUPPORT_EMAIL = 'tech@sicklecellanemia.ca';

// Rate-limit: simple in-memory tracker (per-IP, 5 submissions per hour).
const submissions = new Map<string, number[]>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const times = (submissions.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (times.length >= RATE_LIMIT) return true;
  times.push(now);
  submissions.set(ip, times);
  return false;
}

interface FeedbackBody {
  type?: string;
  category?: string | null;
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  context?: FeedbackContext;
}

/** Default subject when the client doesn't supply one (authed issue/suggestion/bug). */
function defaultSubject(type: FeedbackType, context: FeedbackContext | undefined): string {
  const scope = context?.course_title || context?.lesson_title || 'Student portal';
  switch (type) {
    case 'issue': return `Issue report — ${scope}`;
    case 'suggestion': return 'Suggestion';
    case 'bug': return 'Bug report';
    default: return 'Contact';
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 });
  }

  let body: FeedbackBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const type: FeedbackType = isFeedbackType(body.type) ? body.type : 'contact';
  const message = body.message?.trim() ?? '';
  const email = body.email?.trim() ?? '';
  const name = body.name?.trim() || null;
  const category = body.category?.trim() || null;
  const context = (body.context && typeof body.context === 'object' ? body.context : {}) as FeedbackContext;

  if (!message) return NextResponse.json({ error: 'A message is required' }, { status: 400 });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
  }
  if (category && !isValidCategory(type, category)) {
    return NextResponse.json({ error: 'Invalid category for this feedback type' }, { status: 400 });
  }

  const subject = body.subject?.trim() || defaultSubject(type, context);

  // Session-aware server client: derives user_id securely (not spoofable) and lets
  // RLS enforce `user_id = auth.uid()`. Anonymous (public form) → user null.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  // Resolve institution from the slug (header/cookie set by middleware); fall back to
  // the signed-in user's own institution.
  const slug = request.headers.get('x-institution-slug') || request.cookies.get('institution_slug')?.value || null;
  let institutionId: string | null = null;
  if (slug) {
    const { data: inst } = await supabase.from('institutions').select('id').eq('slug', slug).maybeSingle();
    institutionId = inst?.id ?? null;
  }
  if (!institutionId && userId) {
    const { data: u } = await supabase.from('users').select('institution_id').eq('id', userId).maybeSingle();
    institutionId = u?.institution_id ?? null;
  }

  const { error: dbError } = await supabase.from('feedback_submissions').insert({
    type,
    category,
    name,
    email,
    subject,
    message,
    user_id: userId,
    institution_id: institutionId,
    context,
    status: 'new',
  });

  if (dbError) {
    console.error('Feedback submission DB error:', dbError.message);
    return NextResponse.json({ error: 'Failed to save your feedback. Please try again.' }, { status: 500 });
  }

  // Best-effort email notification (never fails the request — the row is saved).
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const typeLabel = FEEDBACK_TYPES[type].label;
      const contextLines = Object.entries(context)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `<li><strong>${k}:</strong> ${String(v)}</li>`)
        .join('');
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL ?? 'LMS Feedback <onboarding@resend.dev>',
          to: [SUPPORT_EMAIL],
          subject: `[LMS ${typeLabel}] ${subject}`,
          html: `
            <h2>New ${typeLabel}</h2>
            <p><strong>From:</strong> ${name ?? 'Anonymous'} &lt;${email}&gt;</p>
            <p><strong>Type:</strong> ${typeLabel}${category ? ` &middot; ${category}` : ''}</p>
            <hr />
            <p>${message.replace(/\n/g, '<br />')}</p>
            ${contextLines ? `<hr /><ul>${contextLines}</ul>` : ''}
          `,
        }),
      });
    } catch (emailErr) {
      console.error('Resend email error:', emailErr);
    }
  }

  return NextResponse.json({ success: true });
}
