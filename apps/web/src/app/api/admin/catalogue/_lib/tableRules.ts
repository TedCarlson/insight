export type TableRule = {
  label: string;
  group: string;
  allowCreate: boolean;
  editableColumns: string[];
  readonlyColumns: string[];
  softDisableColumn?: string;
};

export const TABLE_RULES: Record<string, TableRule> = {
  person: {
    label: "Person",
    group: "Identity",
    allowCreate: true,
    editableColumns: ["full_name", "emails", "mobile", "notes", "role"],
    readonlyColumns: ["person_id"],
  },

  user_profile: {
    label: "User Profile",
    group: "Identity",
    allowCreate: false,
    editableColumns: ["status", "person_id"],
    readonlyColumns: ["auth_user_id"],
  },

  pc_org: {
    label: "PC-ORG",
    group: "Organization",
    allowCreate: true,
    editableColumns: ["pc_org_name", "pc_id", "active"],
    readonlyColumns: ["pc_org_id"],
    softDisableColumn: "active",
  },

  position_title: {
    label: "Position Title",
    group: "Reference",
    allowCreate: true,
    editableColumns: ["title", "active"],
    readonlyColumns: ["position_title_id"],
  },

  fiscal_month_dim: {
    label: "Fiscal Month",
    group: "Reference",
    allowCreate: false,
    editableColumns: ["start_date", "end_date", "label"],
    readonlyColumns: ["fiscal_month_id"],
  },
};