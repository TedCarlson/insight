export type AccessPass = {
  auth_user_id: string;
  person_id: string | null;
  pc_org_id: string | null;

  status: string;

  is_admin?: boolean;
  is_owner?: boolean;

  permissions?: string[];

  ui?: {
    allowed_modules?: string[];
  };
};

export function hasCapability(pass: AccessPass, cap: string) {
  if (pass?.is_owner) return true;
  if (pass?.is_admin) return true;
  if (!pass?.permissions) return false;

  return pass.permissions.includes(cap);
}

export function requireCapability(pass: AccessPass, cap: string) {
  if (!hasCapability(pass, cap)) {
    const err: any = new Error("forbidden");
    err.status = 403;
    throw err;
  }
}

export function hasModule(pass: AccessPass, module: string) {
  if (pass?.is_owner) return true;
  if (pass?.is_admin) return true;

  return pass?.ui?.allowed_modules?.includes(module) ?? false;
}

export function requireModule(pass: AccessPass, module: string) {
  if (!hasModule(pass, module)) {
    const err: any = new Error("forbidden");
    err.status = 403;
    throw err;
  }
}