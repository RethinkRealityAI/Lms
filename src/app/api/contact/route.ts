import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPPORT_EMAIL = 'tech@sicklecellanemia.ca';

// Rate-limit: simple in-memory tracker (per-IP, 5 submissions per hour)
const submissions = new Map<string, number[]>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const times = (submissions.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (times.length >= RATE_LIMIT) return true;
  times.push(now);
  submissions.set(ip, times);
  return false;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429 }
    );
  }

  let body: { name?: string; email?: string; subject?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { name, email, subject, message } = body;

  if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  // Store in Supabase using anon key (RLS allows public INSERT)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { error: dbError } = await supabase.from('contact_submissions').insert({
    name: name.trim(),
    email: email.trim(),
    subject: subject.trim(),
    message: message.trim(),
  });

  if (dbError) {
    console.error('Contact submission DB error:', dbError.message);
    return NextResponse.json({ error: 'Failed to save your message. Please try again.' }, { status: 500 });
  }

  // Send email notification via Resend (if API key is configured)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL ?? 'LMS Contact <onboarding@resend.dev>',
          to: [SUPPORT_EMAIL],
          subject: `[LMS Contact] ${subject.trim()}`,
          html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>From:</strong> ${name.trim()} &lt;${email.trim()}&gt;</p>
            <p><strong>Subject:</strong> ${subject.trim()}</p>
            <hr />
            <p>${message.trim().replace(/\n/g, '<br />')}</p>
          `,
        }),
      });
    } catch (emailErr) {
      // Log but don't fail — the submission is already saved in DB
      console.error('Resend email error:', emailErr);
    }
  }

  return NextResponse.json({ success: true });
}
