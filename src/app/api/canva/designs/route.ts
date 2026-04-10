import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCanvaAccessToken } from '@/lib/canva/auth';
import { createCanvaDesign, getCanvaDesign } from '@/lib/canva/api';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('[Canva designs] No Supabase user session found');
    return NextResponse.json({ error: 'Not logged in — please refresh the page', needsAuth: false }, { status: 401 });
  }

  console.log('[Canva designs] User:', user.id, '— checking Canva tokens');
  const accessToken = await getCanvaAccessToken(supabase, user.id);
  if (!accessToken) {
    console.log('[Canva designs] No Canva tokens — needs auth');
    return NextResponse.json({ error: 'Canva not connected', needsAuth: true }, { status: 200 });
  }

  const body = await request.json();
  const { designId, width, height, title, entityType, entityId } = body;

  try {
    if (designId) {
      const design = await getCanvaDesign(accessToken, designId);
      return NextResponse.json({
        designId,
        editUrl: design.editUrl,
        entityType,
        entityId,
      });
    }

    const design = await createCanvaDesign(accessToken, {
      width: width ?? 1920,
      height: height ?? 1080,
      title: title ?? 'LMS Design',
    });

    return NextResponse.json({
      designId: design.designId,
      editUrl: design.editUrl,
      entityType,
      entityId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create design';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
