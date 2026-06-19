"use client";

import * as stylex from "@stylexjs/stylex";

import { Select, SelectItem, SelectSection, SelectSectionHeader } from "@/design-system/select";

import { docsStyles } from "./docs-page.stylex.tsx";

export type DocsJumpNavGroup = {
  label: string;
  options: Array<{ id: string; label: string }>;
};

export function DocsMobileJumpSelect({
  groups,
  value,
  onValueChange,
  ariaLabel,
}: {
  groups: Array<DocsJumpNavGroup>;
  value: string;
  onValueChange: (value: string) => void;
  ariaLabel: string;
}) {
  return (
    <div {...stylex.props(docsStyles.mobileJumpBar)}>
      <Select
        aria-label={ariaLabel}
        label="Jump to"
        labelVariant="horizontal"
        selectedKey={value}
        style={docsStyles.mobileJumpSelectField}
        onSelectionChange={(key) => {
          if (key == null) return;
          onValueChange(String(key));
        }}
      >
        {groups.map((group) => (
          <SelectSection key={group.label}>
            <SelectSectionHeader>{group.label}</SelectSectionHeader>
            {group.options.map((option) => (
              <SelectItem key={option.id} id={option.id} textValue={option.label}>
                {option.label}
              </SelectItem>
            ))}
          </SelectSection>
        ))}
      </Select>
    </div>
  );
}
