import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTenantContext } from "@/lib/tenant/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { institutionId } = await getTenantContext();

  if (!institutionId) {
    return NextResponse.json({ error: "Institution not found." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("h5p_contents")
    .select("*")
    .eq("id", id)
    .eq("institution_id", institutionId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Content not found." }, { status: 404 });
  }

  return NextResponse.json({ item: data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { institutionId } = await getTenantContext();

  if (!institutionId) {
    return NextResponse.json({ error: "Institution not found." }, { status: 404 });
  }

  const body = await request.json();
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body?.title === "string") payload.title = body.title.trim();
  if (typeof body?.contentType === "string") payload.content_type = body.contentType.trim();
  if (typeof body?.contentKey === "string") payload.content_key = body.contentKey.trim();
  if (body?.metadata && typeof body.metadata === "object") payload.metadata = body.metadata;

  const { data, error } = await supabase
    .from("h5p_contents")
    .update(payload)
    .eq("id", id)
    .eq("institution_id", institutionId)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Content not found." }, { status: 404 });
  }

  return NextResponse.json({ item: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { institutionId } = await getTenantContext();

  if (!institutionId) {
    return NextResponse.json({ error: "Institution not found." }, { status: 404 });
  }

  const { error } = await supabase
    .from("h5p_contents")
    .delete()
    .eq("id", id)
    .eq("institution_id", institutionId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
