import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/mock-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 클라이언트가 큰 엑셀 파일을 Vercel 함수 우회해 Supabase Storage 의 imports 버킷에
 * 직접 업로드할 수 있도록 signed upload URL 을 발급한다.
 */
export async function POST() {
  if (!isAdmin()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase 미연결" },
      { status: 503 },
    );
  }

  const path = `xlsx/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.xlsx`;
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage
    .from("imports")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "signed url 생성 실패" },
      { status: 500 },
    );
  }
  return NextResponse.json({ path: data.path, token: data.token });
}
