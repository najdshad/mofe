"use client";

import { tagColor, tagColorActive } from "@/lib/tag-colors";

interface TableTagFilterProps {
  allTags: string[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function TableTagFilter({
  allTags,
  selectedTags,
  onTagsChange,
}: TableTagFilterProps) {
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  return (
    <div
      role="group"
      aria-label="فیلتر برچسب میز"
      className="flex items-center gap-2 overflow-x-auto py-1"
      dir="rtl"
    >
      {allTags.map((tag) => {
        const selected = selectedTags.includes(tag);
        const [bg, border, text] = selected ? tagColorActive(tag) : tagColor(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            className={`shrink-0 rounded-[var(--radius-control)] border px-3 py-1.5 text-sm leading-tight transition-colors duration-150 ${bg} ${border} ${text}`}
          >
            {tag}
          </button>
        );
      })}
      {selectedTags.length > 0 && (
        <button
          type="button"
          onClick={() => onTagsChange([])}
          className="shrink-0 rounded-[var(--radius-control)] bg-surface px-3 py-1.5 text-sm leading-tight text-ink-muted transition-colors duration-150"
        >
          حذف فیلتر
        </button>
      )}
    </div>
  );
}
