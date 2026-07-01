import { redirect } from "next/navigation";
import { bootstrapProfile } from "./profile";
import { canAccessModule } from "./roles";

export async function requireModuleAccess(moduleName: "evaluaciones" | "rrhh" | "admin" | "sop") {
  const profile = await bootstrapProfile();

  if (!canAccessModule(profile.role, moduleName)) {
    redirect("/app?error=No+tienes+permiso+para+este+modulo");
  }

  return profile;
}
