export type LobKey = string;

export type EdgePermissionKey = string;

export type EdgeScope = "global" | "pc_org";

export type PcOrgOption = {
  pc_org_id: string;
  pc_org_name: string;
};

export type EdgeUserRow = {
  authUserId: string;
  email: string | null;
  fullName: string | null;

  // optional display fields (safe for admin grid)
  status?: string | null;
  isEmployee?: boolean | null; // server decides (e.g., ITG employee filter)
};

export type EdgePermissionsGridRow = {
  user: EdgeUserRow;
  grants: Record<EdgePermissionKey, boolean>;
};

export type EdgePermissionsGridResponse = {
  permissionKeys: EdgePermissionKey[];
  rows: EdgePermissionsGridRow[];

  page: {
    pageIndex: number;
    pageSize: number;
    totalRows?: number; // optional
  };

  // used for delegation mode (pc_org scope)
  pcOrgs?: PcOrgOption[];
};

export type EdgePermissionsQuery = {
  q?: string; // search
  lob?: LobKey | "ALL";

  scope?: EdgeScope;
  pcOrgId?: string | null;

  pageIndex?: number;
  pageSize?: number;
};

export type EdgePermissionTogglePayload = {
  scope: EdgeScope;
  pcOrgId?: string | null;

  targetAuthUserId: string;
  permissionKey: EdgePermissionKey;
  enabled: boolean;

  lob?: LobKey | "ALL";
};