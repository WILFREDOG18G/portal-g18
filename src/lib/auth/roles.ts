export type AppRole = "admin" | "rrhh" | "manager";

export type Profile = {
  id: string;
  username: string;
  full_name: string;
  role: AppRole;
  business_unit_ids: string[];
};

export function canAccessModule(role: AppRole, moduleName: "evaluaciones" | "rrhh" | "admin" | "sop") {
  if (role === "admin" || role === "rrhh") return true;

  if (role === "manager") {
    return moduleName === "evaluaciones" || moduleName === "admin" || moduleName === "sop";
  }

  return false;
}
