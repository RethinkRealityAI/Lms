import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCanvaAccessToken } from '@/lib/canva/auth';
import { exportCanvaDesign } from '@/lib/canva/api';

export async function GET(request: NextRequest) {
  const designId = request.nextUrl.searchParams.get('designId');
  const entityType = request.nextUrl.searchParams.get('entityType');
  const entityId = request.nextUrl.searchParams.get('entityId');

  if (!designId || !entityType || !entityId) {
    return new NextResponse('Missing parameters', { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const accessToken = await getCanvaAccessToken(supabase, user.id);
    if (!accessToken) {
      return new NextResponse('Canva not connected', { status: 401 });
    }

    const downloadUrl = await exportCanvaDesign(accessToken, designId, {
      type: 'png',
      width: 1920,
    });

    const imageResp = await fetch(downloadUrl);
    const imageBuffer = await imageResp.arrayBuffer();

    const timestamp = Date.now();
    const storagePath = entityType === 'template'
      ? `certificates/templates/${entityId}/${timestamp}.png`
      : `slides/${entityId}/${timestamp}.png`;

    const { error: uploadError } = await supabase.storage
      .from('canva-exports')
      .upload(storagePath, Buffer.from(imageBuffer), {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('canva-exports')
      .getPublicUrl(storagePath);

    if (entityType === 'template') {
      await supabase
        .from('certificate_templates')
        .update({
          canva_design_id: designId,
          canva_design_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entityId);

      await supabase
        .from('certificates')
        .update({ pdf_url: null })
        .eq('template_id', entityId);
    } else {
      await supabase
        .from('slides')
        .update({
          canva_design_id: designId,
          canva_design_url: publicUrl,
        })
        .eq('id', entityId);
    }

    return new NextResponse(
      `<html><body><script>
        window.opener?.postMessage({
          type: 'canva-design-complete',
          designId: ${JSON.stringify(designId)},
          imageUrl: ${JSON.stringify(publicUrl)},
          entityType: ${JSON.stringify(entityType)},
          entityId: ${JSON.stringify(entityId)}
        }, '*');
        window.close();
      </script><p>Design saved. You can close this tab.</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed';
    return new NextResponse(
      `<html><body><p>Error: ${message}</p><a href="javascript:window.close()">Close</a></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}
