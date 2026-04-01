import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/tenant/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ contentKey: string }> }
) {
  const { contentKey } = await params;
  const supabase = await createClient();
  const { institutionId } = await getTenantContext();

  if (!institutionId) {
    return NextResponse.json({ error: 'Institution not found.' }, { status: 404 });
  }

  const { data } = await supabase
    .from('h5p_contents')
    .select('*')
    .eq('institution_id', institutionId)
    .eq('content_key', contentKey)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ error: 'H5P content not found.' }, { status: 404 });
  }

  // Placeholder endpoint for @lumieducation/h5p-react integration.
  // Return a clear error until the full @lumieducation/h5p-server runtime is wired.
  return NextResponse.json(
    {
      error:
        'H5P runtime endpoint not configured. Add @lumieducation/h5p-server backend wiring for player models.',
      content: data,
    },
    { status: 501 }
  );
}
