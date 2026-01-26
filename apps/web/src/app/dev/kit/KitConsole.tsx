"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { IconButton } from "@/components/ui/IconButton";
import { Toolbar } from "@/components/ui/Toolbar";

type CardVariant = "default" | "subtle" | "elevated";
type ButtonVariant = "primary" | "secondary" | "ghost";

export type KitSection = { id: string; label: string };

export type KitConsoleState = {
  jumpTo: string;
  cardVariant: CardVariant;
  buttonVariant: ButtonVariant;
};

const STORAGE_KEY = "insight.kit.console.v1";
const EVENT_NAME = "insight:kit-console";

const DEFAULT_STATE: KitConsoleState = {
  jumpTo: "variants",
  cardVariant: "default",
  buttonVariant: "primary",
};

function safeParse(value: string | null): KitConsoleState | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<KitConsoleState>;
    const next: KitConsoleState = {
      jumpTo: typeof parsed.jumpTo === "string" ? parsed.jumpTo : DEFAULT_STATE.jumpTo,
      cardVariant:
        parsed.cardVariant === "subtle" || parsed.cardVariant === "elevated"
          ? parsed.cardVariant
          : "default",
      buttonVariant:
        parsed.buttonVariant === "secondary" || parsed.buttonVariant === "ghost"
          ? parsed.buttonVariant
          : "primary",
    };
    return next;
  } catch {
    return null;
  }
}

export function loadKitConsoleState(): KitConsoleState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  const parsed = safeParse(window.localStorage.getItem(STORAGE_KEY));
  return parsed ?? DEFAULT_STATE;
}

export function saveKitConsoleState(next: KitConsoleState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function useKitConsoleState() {
  const [state, setState] = useState<KitConsoleState>(() => {
  // IMPORTANT: Next can render this file on the server even if it's a client component.
  if (typeof window === "undefined") return DEFAULT_STATE;
  return loadKitConsoleState();
});

  useEffect(() => {
    const onUpdate = () => setState(loadKitConsoleState());
    window.addEventListener(EVENT_NAME, onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener(EVENT_NAME, onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  const update = useCallback((patch: Partial<KitConsoleState>) => {
    const next = { ...loadKitConsoleState(), ...patch };
    saveKitConsoleState(next);
  }, []);

  const reset = useCallback(() => saveKitConsoleState(DEFAULT_STATE), []);

  return useMemo(() => ({ state, update, reset }), [state, update, reset]);
}

export default function KitConsole({ sections }: { sections: KitSection[] }) {
  const { state, update, reset } = useKitConsoleState();

  const jump = useCallback(
    (id: string) => {
      update({ jumpTo: id });
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [update]
  );

  return (
    <Card variant="subtle" className="to-kit-console">
      <Toolbar
        left={
          <>
            <Field label="Jump to">
              <Select value={state.jumpTo} onChange={(e) => jump(e.target.value)}>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Card variant (workbench)">
              <Select
                value={state.cardVariant}
                onChange={(e) => update({ cardVariant: e.target.value as any })}
              >
                <option value="default">default</option>
                <option value="subtle">subtle</option>
                <option value="elevated">elevated</option>
              </Select>
            </Field>

            <Field label="Button variant (workbench)">
              <Select
                value={state.buttonVariant}
                onChange={(e) => update({ buttonVariant: e.target.value as any })}
              >
                <option value="primary">primary</option>
                <option value="secondary">secondary</option>
                <option value="ghost">ghost</option>
              </Select>
            </Field>
          </>
        }
        right={
          <IconButton
            aria-label="Reset kit console"
            icon={<span aria-hidden>↺</span>}
            variant="ghost"
            onClick={reset}
          />
        }
      />
    </Card>
  );
}
