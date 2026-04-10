import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCanvaAccessToken } from '@/lib/canva/auth';
import { listCanvaDesigns, listCanvaFolderItems } from '@/lib/canva/api';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }

  const accessToken = await getCanvaAccessToken(supabase, user.id);
  if (!accessToken) {
    return NextResponse.json({ error: 'Canva not connected', needsAuth: true }, { status: 200 });
  }

  const query = request.nextUrl.searchParams.get('query') ?? undefined;
  const folderId = request.nextUrl.searchParams.get('folderId') ?? undefined;
  const continuation = request.nextUrl.searchParams.get('continuation') ?? undefined;
  const limit = 20;

  try {
    if (folderId) {
      const result = await listCanvaFolderItems(accessToken, folderId, {
        limit,
        continuation,
        itemTypes: 'design,folder',
      });
      return NextResponse.json(result);
    }

    const result = await listCanvaDesigns(accessToken, { query, limit, continuation });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to browse Canva';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
