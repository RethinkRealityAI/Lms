import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/tenant/server';

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { institutionId } = await getTenantContext();
  if (!institutionId) {
    return NextResponse.json({ error: 'Institution not found.' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('media_assets')
    .select('*')
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { institutionId } = await getTenantContext();
  if (!institutionId) {
    return NextResponse.json({ error: 'Institution not found.' }, { status: 404 });
  }

  const body = await request.json();
  const title = String(body?.title || '').trim();
  const fileUrl = String(body?.fileUrl || '').trim();
  const fileType = String(body?.fileType || 'external').trim();
  const description = String(body?.description || '').trim();

  if (!title || !fileUrl) {
    return NextResponse.json({ error: 'title and fileUrl are required.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('media_assets')
    .insert([
      {
        institution_id: institutionId,
        uploaded_by: user?.id ?? null,
        title,
        description,
        file_url: fileUrl,
        file_type: fileType,
      },
    ])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ item: data }, { status: 201 });
}
