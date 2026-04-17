// path: apps/web/src/shared/surfaces/MetricsControlsStrip.tsx

"use client";

export type MetricsControlsValue = {
  office_label: string | null;
  affiliation_type: string | null;
  contractor_name?: string | null;
  reports_to_person_id?: string | null;
  team_scope_mode?: "ROLLUP" | "DIRECT" | "AFFILIATION_DIRECT";
};

type SelectOption = {
  value: string;
  label: string;
};

type Props = {
  officeOptions: string[];
  affiliationOptions: string[];
  contractorOptions?: string[];
  supervisorOptions?: SelectOption[];
  value: MetricsControlsValue;
  onChange: (next: MetricsControlsValue) => void;
  onReset: () => void;
  showOffice?: boolean;
  showAffiliation?: boolean;
  showContractor?: boolean;
  showSupervisor?: boolean;
  showTeamScope?: boolean;
};

export default function MetricsControlsStrip(props: Props) {
  const {
    officeOptions,
    affiliationOptions,
    contractorOptions = [],
    supervisorOptions = [],
    value,
    onChange,
    onReset,
    showOffice = true,
    showAffiliation = true,
    showContractor = contractorOptions.length > 0,
    showSupervisor = supervisorOptions.length > 0,
    showTeamScope = false,
  } = props;

  const visibleControlCount = [
    showOffice,
    showAffiliation,
    showContractor,
    showSupervisor,
    showTeamScope,
  ].filter(Boolean).length;

  if (visibleControlCount === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border bg-card px-3 py-2.5">
      <div className="flex flex-wrap items-end gap-2">
        {showOffice ? (
          <div className="min-w-[180px]">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Office
            </div>
            <select
              value={value.office_label ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  office_label: e.target.value || null,
                })
              }
              className="h-9 w-full rounded-lg border bg-background px-2 text-sm"
            >
              <option value="">All Offices</option>
              {officeOptions.map((office) => (
                <option key={office} value={office}>
                  {office}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {showAffiliation ? (
          <div className="min-w-[180px]">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Affiliation
            </div>
            <select
              value={value.affiliation_type ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  affiliation_type: e.target.value || null,
                  contractor_name:
                    e.target.value === "CONTRACTOR"
                      ? value.contractor_name ?? null
                      : null,
                })
              }
              className="h-9 w-full rounded-lg border bg-background px-2 text-sm"
            >
              <option value="">All Groups</option>
              {affiliationOptions.map((affiliation) => (
                <option key={affiliation} value={affiliation}>
                  {affiliation}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {showContractor ? (
          <div className="min-w-[180px]">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Contractor
            </div>
            <select
              value={value.contractor_name ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  contractor_name: e.target.value || null,
                })
              }
              className="h-9 w-full rounded-lg border bg-background px-2 text-sm"
            >
              <option value="">All Contractors</option>
              {contractorOptions.map((contractor) => (
                <option key={contractor} value={contractor}>
                  {contractor}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {showSupervisor ? (
          <div className="min-w-[220px]">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Supervisor Team
            </div>
            <select
              value={value.reports_to_person_id ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  reports_to_person_id: e.target.value || null,
                  team_scope_mode: e.target.value
                    ? value.team_scope_mode ?? "DIRECT"
                    : "DIRECT",
                })
              }
              className="h-9 w-full rounded-lg border bg-background px-2 text-sm"
            >
              <option value="">All Teams</option>
              {supervisorOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {showTeamScope ? (
          <div className="min-w-[180px]">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Team Scope
            </div>
            <select
              value={value.team_scope_mode ?? "DIRECT"}
              onChange={(e) =>
                onChange({
                  ...value,
                  team_scope_mode:
                    (e.target.value as
                      | "ROLLUP"
                      | "DIRECT"
                      | "AFFILIATION_DIRECT") || "DIRECT",
                })
              }
              className="h-9 w-full rounded-lg border bg-background px-2 text-sm"
            >
              <option value="DIRECT">Direct</option>
              <option value="ROLLUP">Rollup</option>
              <option value="AFFILIATION_DIRECT">Affiliation Direct</option>
            </select>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-9 items-center justify-center rounded-lg border px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
        >
          Clear
        </button>
      </div>
    </div>
  );
}