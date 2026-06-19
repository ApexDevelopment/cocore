"use client";

import { useRouterState } from "@tanstack/react-router";
import { useCallback } from "react";

import { DocsMobileJumpSelect } from "@/components/docs/docs-mobile-jump-select.tsx";
import {
  INFERENCE_DOCS_CATALOG,
  inferenceDocsHref,
  inferenceDocsJumpNavGroups,
  type InferenceDocsSlug,
} from "@/lib/inference-docs/navigation.ts";

const groups = inferenceDocsJumpNavGroups();
const OVERVIEW_KEY = "overview";

function activeSlug(pathname: string): InferenceDocsSlug | null {
  const prefix = "/docs/inference/";
  if (pathname === "/docs/inference" || pathname === "/docs/inference/") return null;
  if (!pathname.startsWith(prefix)) return null;
  const slug = pathname.slice(prefix.length);
  return slug as InferenceDocsSlug;
}

const selectGroups = groups.map((group) => ({
  label: group.label,
  options: group.options.map((option) => ({
    id: option.slug ?? OVERVIEW_KEY,
    label: option.label,
  })),
}));

export function InferenceDocsMobileNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const value = activeSlug(pathname) ?? OVERVIEW_KEY;

  const onValueChange = useCallback((id: string) => {
    const slug = id === OVERVIEW_KEY ? null : (id as InferenceDocsSlug);
    globalThis.location.assign(inferenceDocsHref(slug));
  }, []);

  return (
    <DocsMobileJumpSelect
      ariaLabel="Jump to page"
      groups={selectGroups}
      value={value}
      onValueChange={onValueChange}
    />
  );
}

export function inferenceDocsPageTitle(pathname: string): string {
  const slug = activeSlug(pathname);
  const entry = INFERENCE_DOCS_CATALOG.find((item) => item.slug === slug);
  return entry?.title ?? "Inference API";
}
