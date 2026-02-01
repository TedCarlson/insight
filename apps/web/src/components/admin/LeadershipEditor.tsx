"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Props = {
  pcOrgId: string;
  pcOrgName: string | null;
  regionId: string | null;
  divisionId: string | null;
};

type TargetType = "user" | "person";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.trim());
}

function supabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createBrowserClient(url, anon);
}

async function rpc<T = any>(schema: "api" | "public", fn: string, args: Record<string, any>) {
  const sb = supabaseBrowser();
  const client: any = schema === "api" ? (sb as any).schema("api") : sb;
  const { data, error } = await client.rpc(fn, args);
  if (error) throw error;
  return data as T;
}

type LookupItem = {
  type: "user" | "person";
  id: string;
  label: string;
  sublabel?: string;
  extra?: any;
};

async function leaderLookup(type: "user" | "person", q: string): Promise<LookupItem[]> {
  const res = await fetch("/api/admin/leader-lookup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type, q, limit: 12 }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error ?? "Lookup failed");
  return (json?.items ?? []) as LookupItem[];
}

export default function LeadershipEditor({ pcOrgId, pcOrgName, regionId, divisionId }: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");

  // Editor inputs
  const [scope, setScope] = useState<"pc" | "region" | "division">("pc");
  const [roleKey, setRoleKey] = useState<string>("pc_manager");
  const [targetType, setTargetType] = useState<TargetType>("user");
  const [targetId, setTargetId] = useState<string>("");

  // Lookup UI
  const [q, setQ] = useState("");
  const [lookupType, setLookupType] = useState<TargetType>("user");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupItems, setLookupItems] = useState<LookupItem[]>([]);
  const [lookupError, setLookupError] = useState<string>("");

  // Current leader display
  const [currentLeader, setCurrentLeader] = useState<any>(null);

  const scopeMeta = useMemo(() => {
    if (scope === "pc") {
      return {
        label: "PC",
        idLabel: "pc_org_id",
        idValue: pcOrgId,
        idMissing: false,
        roleSuggestions: ["pc_manager", "pc_director"],
        readTable: "pc_org_leadership",
      };
    }
    if (scope === "region") {
      return {
        label: "Region",
        idLabel: "region_id",
        idValue: regionId ?? "",
        idMissing: !regionId,
        roleSuggestions: ["regional_director", "regional_vp", "regional_manager"],
        readTable: "region_leadership",
      };
    }
    return {
      label: "Division",
      idLabel: "division_id",
      idValue: divisionId ?? "",
      idMissing: !divisionId,
      roleSuggestions: ["vp", "division_director", "division_manager"],
      readTable: "division_leadership",
    };
  }, [scope, pcOrgId, regionId, divisionId]);

  useEffect(() => {
    setRoleKey(scopeMeta.roleSuggestions[0] ?? "leader");
    setCurrentLeader(null);
    setStatus("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  async function loadCurrent() {
    setStatus("");
    setCurrentLeader(null);

    if (scopeMeta.idMissing) {
      setStatus(`${scopeMeta.label} is not linked on this pc_org (missing ${scopeMeta.idLabel}).`);
      return;
    }

    try {
      const sb = supabaseBrowser();
      const { data, error } = await sb
        .from(scopeMeta.readTable)
        .select("*")
        .eq(scopeMeta.idLabel, scopeMeta.idValue)
        .eq("role_key", roleKey)
        .eq("is_primary", true)
        .maybeSingle();

      if (error) throw error;
      setCurrentLeader(data ?? null);
    } catch (e: any) {
      setStatus(e?.message ?? "Failed to load current leader");
    }
  }

  useEffect(() => {
    loadCurrent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, roleKey]);

  async function doLookup() {
    const query = q.trim();
    setLookupError("");
    setLookupItems([]);

    if (!query) return;

    setLookupBusy(true);
    try {
      const items = await leaderLookup(lookupType, query);
      setLookupItems(items);
    } catch (e: any) {
      setLookupError(e?.message ?? "Lookup failed");
    } finally {
      setLookupBusy(false);
    }
  }

  function choose(item: LookupItem) {
    setTargetType(item.type);
    setTargetId(item.id);
    setStatus(`Selected ${item.type}: ${item.label}`);
  }

  async function save() {
    setStatus("");

    if (scopeMeta.idMissing) {
      setStatus(`Cannot save: ${scopeMeta.label} missing on this org.`);
      return;
    }
    if (!roleKey.trim()) {
      setStatus("Role key is required.");
      return;
    }

    const id = targetId.trim();
    if (!isUuid(id)) {
      setStatus("Leader ID must be a UUID (use lookup or paste a UUID).");
      return;
    }

    setLoading(true);
    try {
      if (scope === "pc") {
        await rpc("api", "pc_org_set_primary_leader", {
          p_pc_org_id: pcOrgId,
          p_role_key: roleKey.trim(),
          p_leader_user_id: targetType === "user" ? id : null,
          p_leader_person_id: targetType === "person" ? id : null,
        });
      } else if (scope === "region") {
        await rpc("api", "region_set_primary_leader", {
          p_region_id: scopeMeta.idValue,
          p_role_key: roleKey.trim(),
          p_leader_user_id: targetType === "user" ? id : null,
          p_leader_person_id: targetType === "person" ? id : null,
        });
      } else {
        await rpc("api", "division_set_primary_leader", {
          p_division_id: scopeMeta.idValue,
          p_role_key: roleKey.trim(),
          p_leader_user_id: targetType === "user" ? id : null,
          p_leader_person_id: targetType === "person" ? id : null,
        });
      }

      setStatus("Saved ✅");
      await loadCurrent();
    } catch (e: any) {
      setStatus(e?.message ?? "Save failed");
    } finally {
      setLoading(false);
    }
  }

  async function removePrimary() {
    setStatus("");

    if (scopeMeta.idMissing) {
      setStatus(`Cannot remove: ${scopeMeta.label} missing on this org.`);
      return;
    }
    if (!roleKey.trim()) {
      setStatus("Role key is required.");
      return;
    }

    setLoading(true);
    try {
      if (scope === "pc") {
        await rpc("api", "pc_org_remove_primary_leader", {
          p_pc_org_id: pcOrgId,
          p_role_key: roleKey.trim(),
        });
      } else if (scope === "region") {
        await rpc("api", "region_remove_primary_leader", {
          p_region_id: scopeMeta.idValue,
          p_role_key: roleKey.trim(),
        });
      } else {
        await rpc("api", "division_remove_primary_leader", {
          p_division_id: scopeMeta.idValue,
          p_role_key: roleKey.trim(),
        });
      }

      setStatus("Removed ✅");
      setTargetId("");
      await loadCurrent();
    } catch (e: any) {
      setStatus(e?.message ?? "Remove failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border p-4 space-y-4">
      <div className="flex flex-col gap-1">
        <div className="text-lg font-semibold">Org Leadership Editor</div>
        <div className="text-sm text-muted-foreground">
          Selected PC: <span className="font-medium">{pcOrgName ?? pcOrgId}</span>
        </div>
      </div>

      {/* EDITOR */}
      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1">
          <div className="text-sm font-medium">Scope</div>
          <select
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={scope}
            onChange={(e) => setScope(e.target.value as any)}
          >
            <option value="pc">PC</option>
            <option value="region" disabled={!regionId}>
              Region
            </option>
            <option value="division" disabled={!divisionId}>
              Division
            </option>
          </select>
          <div className="text-xs text-muted-foreground">
            {scopeMeta.label} ID: <span className="font-mono">{scopeMeta.idMissing ? "—" : scopeMeta.idValue}</span>
          </div>
        </label>

        <label className="space-y-1">
          <div className="text-sm font-medium">Role key</div>
          <input
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={roleKey}
            onChange={(e) => setRoleKey(e.target.value)}
            placeholder="e.g. regional_director"
          />
          <div className="text-xs text-muted-foreground">
            Suggestions:{" "}
            {scopeMeta.roleSuggestions.map((r) => (
              <button key={r} type="button" className="mr-2 underline" onClick={() => setRoleKey(r)}>
                {r}
              </button>
            ))}
          </div>
        </label>

        <label className="space-y-1">
          <div className="text-sm font-medium">Leader type</div>
          <select
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={targetType}
            onChange={(e) => setTargetType(e.target.value as TargetType)}
          >
            <option value="user">App user</option>
            <option value="person">Person record</option>
          </select>
          <div className="text-xs text-muted-foreground">Use lookup below to fill the UUID.</div>
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto] items-end">
        <label className="space-y-1">
          <div className="text-sm font-medium">Leader ID (UUID)</div>
          <input
            className="w-full rounded-md border px-3 py-2 text-sm font-mono"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={loading}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save leader"}
          </button>

          <button
            type="button"
            onClick={removePrimary}
            disabled={loading}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            title="Removes the primary leader for this scope + role key"
          >
            Remove leader
          </button>
        </div>
      </div>

      {/* LOOKUP */}
      <div className="rounded-xl border p-3 space-y-3">
        <div className="text-sm font-semibold">Find leader (search + click)</div>

        <div className="grid gap-3 md:grid-cols-[220px_1fr_auto] items-end">
          <label className="space-y-1">
            <div className="text-sm font-medium">Lookup type</div>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={lookupType}
              onChange={(e) => setLookupType(e.target.value as TargetType)}
            >
              <option value="user">Auth user (email)</option>
              <option value="person">Person (name/email)</option>
            </select>
          </label>

          <label className="space-y-1">
            <div className="text-sm font-medium">Search</div>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={lookupType === "user" ? "type an email fragment…" : "type a name fragment…"}
              onKeyDown={(e) => {
                if (e.key === "Enter") doLookup();
              }}
            />
          </label>

          <button
            type="button"
            onClick={doLookup}
            disabled={lookupBusy}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            {lookupBusy ? "Searching…" : "Search"}
          </button>
        </div>

        {lookupError ? <div className="text-sm">{lookupError}</div> : null}

        {lookupItems.length > 0 ? (
          <div className="rounded-lg border">
            {lookupItems.map((it) => (
              <button
                key={`${it.type}:${it.id}`}
                type="button"
                onClick={() => choose(it)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between"
              >
                <span>
                  <span className="font-medium">{it.label}</span> <span className="text-muted-foreground">({it.type})</span>
                  {it.extra ? <span className="ml-2 text-xs text-muted-foreground">{String(it.extra)}</span> : null}
                </span>
                <span className="text-xs font-mono text-muted-foreground">{it.id}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">No results yet. Search to load candidates.</div>
        )}
      </div>

      {/* CURRENT */}
      <div className="rounded-lg bg-muted/30 p-3">
        <div className="text-sm font-medium">Current primary leader</div>
        <div className="mt-2 text-sm">
          {currentLeader ? (
            <pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(currentLeader, null, 2)}</pre>
          ) : (
            <span className="text-muted-foreground">None set for this role.</span>
          )}
        </div>
      </div>

      {status ? <div className="text-sm">{status}</div> : null}
    </div>
  );
}