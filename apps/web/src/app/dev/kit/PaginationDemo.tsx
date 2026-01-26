// apps/web/src/app/dev/kit/PaginationDemo.tsx
"use client";

import { useMemo, useState } from "react";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableFooter,
} from "@/components/ui/DataTable";

export default function PaginationDemo() {
  const totalItems = 28;
  const pageSize = 4;
  const totalPages = Math.ceil(totalItems / pageSize);
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return Array.from({ length: pageSize }).map((_, idx) => {
      const n = start + idx + 1;
      return {
        name: `Person ${n}`,
        role: n % 2 === 0 ? "Dispatcher" : "Driver",
        status: n % 3 === 0 ? "Pending" : "Active",
      };
    });
  }, [page]);

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <div className="space-y-3">
      <DataTable zebra hover>
        <DataTableHeader>
          <div className="col-span-4">Name</div>
          <div className="col-span-4">Role</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Action</div>
        </DataTableHeader>

        <DataTableBody zebra>
          {rows.map((r) => (
            <DataTableRow key={r.name} hover>
              <div className="col-span-4 font-medium">{r.name}</div>
              <div className="col-span-4 text-[var(--to-ink-muted)]">{r.role}</div>
              <div className="col-span-2">
                <Badge variant={r.status === "Active" ? "success" : "warning"}>{r.status}</Badge>
              </div>
              <div className="col-span-2 text-right">
                <Button type="button" variant="secondary" className="px-2 py-1 text-xs">
                  View
                </Button>
              </div>
            </DataTableRow>
          ))}
        </DataTableBody>

        <DataTableFooter>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-[var(--to-ink-muted)]">
              Showing <span className="font-semibold text-[var(--to-ink)]">{from}</span>–
              <span className="font-semibold text-[var(--to-ink)]">{to}</span> of{" "}
              <span className="font-semibold text-[var(--to-ink)]">{totalItems}</span>
            </div>

            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </DataTableFooter>
      </DataTable>
    </div>
  );
}
