"use client";

import { API_DOCS_SCROLL_SPY_IDS, apiDocsJumpNavGroups } from "@/lib/api-docs/navigation";
import { useCallback } from "react";

import { DocsMobileJumpSelect } from "./docs-mobile-jump-select.tsx";
import { useDocsScrollSpyActive } from "./docs-scroll-spy-context";

const groups = apiDocsJumpNavGroups();

export function DocsApiMobileJumpNav() {
  const active = useDocsScrollSpyActive();
  const value = active ?? API_DOCS_SCROLL_SPY_IDS[0] ?? "";

  const onValueChange = useCallback((id: string) => {
    const target = document.querySelector(`#${id}`);
    if (target == null) return;
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
