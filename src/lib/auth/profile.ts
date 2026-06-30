import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "./roles";

export async function getRequiredSession() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return { supabase, user };
}

export async function bootstrapProfile() {
  const { supabase, user } = await getRequiredSession();

  const email = user.email ?? "";
  const username = email.includes("@") ? email.split("@")[0] : `user_${user.id.slice(0, 8)}`;
  const fullName = (user.user_metadata?.full_name as string | undefined) ?? username;

  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("id, username, full_name, role, business_unit_ids")
    .eq("id", user.id)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return existing as Profile;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      username,
      full_name: fullName,
      role: "manager",
      business_unit_ids: [],
    })
    .select("id, username, full_name, role, business_unit_ids")
    .single();

  if (insertError) {
    throw insertError;
  }

  return inserted as Profile;
}
