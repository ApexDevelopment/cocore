"use client";

import type { LexiconDocsEntry } from "@/lib/lexicon-docs/types";

import { lexiconDocsJumpNavGroups, lexiconDocsScrollSpyIds } from "@/lib/lexicon-docs/navigation";
import { useCallback, useMemo } from "react";

import { DocsMobileJumpSelect } from "./docs-mobile-jump-select.tsx";
import { useDocsScrollSpyActive } from "./docs-scroll-spy-context";

export function DocsLexiconsMobileJumpNav({ entries }: { entries: Array<LexiconDocsEntry> }) {
  const active = useDocsScrollSpyActive();
  const scrollSpyIds = useMemo(() => lexiconDocsScrollSpyIds(entries), [entries]);
  const groups = useMemo(() => lexiconDocsJumpNavGroups(entries), [entries]);
  const value = active ?? scrollSpyIds[0] ?? "";

  const onValueChange = useCallback((id: string) => {
    const target = document.querySelector(`#${id}`);
    if (target == null) {
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    globalThis.history.replaceState(null, "", `#${id}`);
  }, []);

  return (
    <DocsMobileJumpSelect
      ariaLabel="Jump to section"
      groups={groups}
      value={value}
      onValueChange={onValueChange}
    />
  );
}
