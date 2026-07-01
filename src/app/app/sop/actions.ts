"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bootstrapProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createSopDocument(formData: FormData) {
  const profile = await bootstrapProfile();
  const supabase = createClient();

  const businessUnitId = String(formData.get("businessUnitId") ?? "").trim();
  const areaId = String(formData.get("areaId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const version = String(formData.get("version") ?? "").trim();
  const file = formData.get("file");

  if (!title || !(file instanceof File) || file.size === 0) {
    redirect("/app/sop?error=Titulo+y+archivo+son+obligatorios");
  }

  const extension = file.name.includes(".") ? file.name.split(".").pop() : "dat";
  const safeName = sanitizeFileName(file.name);
  const folder = businessUnitId || "general";
  const path = `${folder}/${Date.now()}-${safeName || `documento.${extension}`}`;

  const { error: uploadError } = await supabase.storage
    .from("sop-documents")
    .upload(path, file, {
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

  if (uploadError) {
    redirect(`/app/sop?error=${encodeURIComponent(uploadError.message)}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from("sop-documents")
    .getPublicUrl(path);

  const { error: insertError } = await supabase.from("sop_documents").insert({
    business_unit_id: businessUnitId || null,
    area_id: areaId || null,
    title,
    description: description || null,
    version: version || null,
    file_url: publicUrlData.publicUrl,
    uploaded_by: profile.id,
  });

  if (insertError) {
    redirect(`/app/sop?error=${encodeURIComponent(insertError.message)}`);
  }

  revalidatePath("/app/sop");
  redirect("/app/sop?message=Documento+SOP+subido+correctamente");
}
