"use client";

import { useMemo, useState } from "react";
import { PageShell, PageHeader } from "@/components/ui/PageShell";

import HistoryFiltersCard from "../components/HistoryFiltersCard";
import HistorySelectionCard from "../components/HistorySelectionCard";
import HistoryChangeLogCard from "../components/HistoryChangeLogCard";
import HistorySegmentSummaryCard from "../components/HistorySegmentSummaryCard";
import HistoryCheckInWeeklyCard from "../components/HistoryCheckInWeeklyCard";

import { useTechHistorySearch } from "../hooks/useTechHistorySearch";
import { useTechHistoryData } from "../hooks/useTechHistoryData";

import type { TechSearchItem } from "../lib/history.types";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function TechRouteHistoryPage() {
  const [techQuery, setTechQuery] = useState("");
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());
  const [selectedTech, setSelectedTech] = useState<TechSearchItem | null>(null);
  const [expandedSegments, setExpandedSegments] = useState<Record<string, boolean>>({});

  const {
    canSearch,
    searchOpen,
    setSearchOpen,
    searchBusy,
    searchError,
    setSearchError,
    searchItems,
    setSearchItems,
  } = useTechHistorySearch(techQuery);

  const { historyBusy, historyError, history, checkInBusy, checkInError, checkIn } =
    useTechHistoryData({
      selectedTech,
      fromDate,
      toDate,
    });

  const selectedTechLabel = useMemo(() => {
    if (!selectedTech) return null;
    return `${selectedTech.full_name} • ${selectedTech.tech_id}`;
  }, [selectedTech]);

  function onPickTech(item: TechSearchItem) {
    setSelectedTech(item);
    setTechQuery(`${item.full_name} • ${item.tech_id}`);
    setSearchItems([]);
    setSearchOpen(false);
    setSearchError(null);
    setExpandedSegments({});
  }

  function onClearTech() {
    setSelectedTech(null);
    setTechQuery("");
    setSearchItems([]);
    setSearchOpen(false);
    setSearchError(null);
    setExpandedSegments({});
  }

  function onClearedSelectionByTyping() {
    setSelectedTech(null);
    setExpandedSegments({});
  }

  function onToggleSegment(segmentId: string) {
    setExpandedSegments((prev) => ({
      ...prev,
      [segmentId]: !prev[segmentId],
    }));
  }

  return (
    <PageShell>
      <PageHeader
        title="Tech Route History"
        subtitle="View historical baseline route changes, work pattern shifts, and weekly check-in activity"
      />

      <div className="space-y-4">
        <HistoryFiltersCard
          techQuery={techQuery}
          setTechQuery={setTechQuery}
          fromDate={fromDate}
          setFromDate={setFromDate}
          toDate={toDate}
          setToDate={setToDate}
          selectedTech={selectedTech}
          onPickTech={onPickTech}
          onClearTech={onClearTech}
          onClearedSelectionByTyping={onClearedSelectionByTyping}
          canSearch={canSearch}
          searchOpen={searchOpen}
          setSearchOpen={setSearchOpen}
          searchBusy={searchBusy}
          searchError={searchError}
          searchItems={searchItems}
        />

        <HistorySelectionCard
          selectedTechLabel={selectedTechLabel}
          fromDate={fromDate}
          toDate={toDate}
        />

        {historyBusy ? (
          <div className="rounded-2xl border bg-[var(--to-surface)] p-4">
            <p className="text-sm text-[var(--to-ink-muted)]">Loading route history…</p>
          </div>
        ) : historyError ? (
          <div className="rounded-2xl border bg-[var(--to-surface)] p-4">
            <p className="text-sm text-[var(--to-danger,#b91c1c)]">{historyError}</p>
          </div>
        ) : !selectedTech ? (
          <div className="rounded-2xl border bg-[var(--to-surface)] p-4">
            <p className="text-sm text-[var(--to-ink-muted)]">
              Select a technician and date range to load route history.
            </p>
          </div>
        ) : history ? (
          <>
            <HistoryChangeLogCard events={history.events} />

            <HistorySegmentSummaryCard
              segments={history.segments}
              expandedSegments={expandedSegments}
              onToggleSegment={onToggleSegment}
            />

            <HistoryCheckInWeeklyCard
              rows={checkIn?.rows ?? []}
              loading={checkInBusy}
              error={checkInError}
            />
          </>
        ) : (
          <div className="rounded-2xl border bg-[var(--to-surface)] p-4">
            <p className="text-sm text-[var(--to-ink-muted)]">No history loaded yet.</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}