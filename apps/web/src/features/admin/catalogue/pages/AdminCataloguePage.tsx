"use client";

import { useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { CatalogueLayout } from "../components/CatalogueLayout";
import { TablePlaceholder } from "../components/TablePlaceholder";

export function AdminCataloguePage() {
  const [tableKey, setTableKey] = useState<string | null>(null);

  return (
    <CatalogueLayout selectedTable={tableKey} onSelectTable={setTableKey}>
      {tableKey ? (
        <TablePlaceholder tableKey={tableKey} />
      ) : (
        <EmptyState
          title="Select a table"
          message="Choose a table from the catalogue to view and manage records."
        />
      )}
    </CatalogueLayout>
  );
}