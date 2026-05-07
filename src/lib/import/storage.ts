import { createServiceClient } from "@/lib/supabase/server";

const BUCKET = "product-images";

/**
 * 산지이음 엑셀 임베드 이미지를 Supabase Storage 의 `<external_id>/<filename>` 경로에 저장.
 * 같은 external_id 로 재업로드 시 덮어쓴다(upsert).
 *
 * @returns 매장 노출용 public URL
 */
export async function uploadImage(
  externalId: string,
  filename: string,
  contentType: string,
  bytes: Buffer,
): Promise<string | null> {
  const supabase = createServiceClient();
  const key = `${externalId}/${filename}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, bytes, { contentType, upsert: true });

  if (error) {
    console.warn("Storage upload failed:", externalId, error.message);
    return null;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return data.publicUrl;
}
