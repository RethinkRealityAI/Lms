import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTenantContext } from "@/lib/tenant/server";

export async function GET() {
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
    .eq("institution_id", institutionId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
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
  const title = String(body?.title || "").trim();
  const contentKey = String(body?.contentKey || "").trim();
  const contentType = String(body?.contentType || "h5p").trim();
  const metadata = body?.metadata && typeof body.metadata === "object" ? body.metadata : {};

  if (!title || !contentKey) {
    return NextResponse.json({ error: "title and contentKey are required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("h5p_contents")
    .insert([
      {
        institution_id: institutionId,
        title,
        content_key: contentKey,
        content_type: contentType,
        metadata,
        created_by: user?.id ?? null,
      },
    ])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data }, { status: 201 });
}
