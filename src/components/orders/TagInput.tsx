"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  existingTags: string[];
  placeholder?: string;
}

export function TagInput({
  tags,
  onChange,
  existingTags,
  placeholder = "افزودن برچسب...",
}: TagInputProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = input.trim()
    ? existingTags.filter(
        (t) =>
          !tags.includes(t) &&
          t.toLowerCase().includes(input.trim().toLowerCase()),
      )
    : [];

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (!trimmed || tags.includes(trimmed)) return;
      onChange([...tags, trimmed]);
      setInput("");
      setShowSuggestions(false);
      setHighlightedIdx(-1);
    },
    [tags, onChange],
  );

  const removeTag = useCallback(
    (tag: string) => {
      onChange(tags.filter((t) => t !== tag));
    },
    [tags, onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (highlightedIdx >= 0 && highlightedIdx < filtered.length) {
        addTag(filtered[highlightedIdx]);
      } else if (input.trim()) {
        addTag(input.trim());
      }
      return;
    }

    if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIdx((prev) =>
        prev < filtered.length - 1 ? prev + 1 : 0,
      );
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIdx((prev) =>
        prev > 0 ? prev - 1 : filtered.length - 1,
      );
      return;
    }

    if (e.key === "Escape") {
      setShowSuggestions(false);
      setHighlightedIdx(-1);
      return;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.endsWith(",")) {
      addTag(val.slice(0, -1));
      return;
    }
    setInput(val);
    setShowSuggestions(true);
    setHighlightedIdx(-1);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs text-ink"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-line hover:text-ink"
              aria-label={`حذف ${tag}`}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          dir="auto"
          className="w-full rounded-[var(--radius-control)] border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted/50 text-right transition-colors focus:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
        />
        {showSuggestions && filtered.length > 0 && (
          <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-40 overflow-auto rounded-[var(--radius-control)] border border-line bg-paper shadow-lg">
            {filtered.map((suggestion, idx) => (
              <li
                key={suggestion}
                onClick={() => addTag(suggestion)}
                onMouseEnter={() => setHighlightedIdx(idx)}
                className={`cursor-pointer px-4 py-2 text-sm text-right transition-colors ${
                  idx === highlightedIdx
                    ? "bg-ink/10 text-ink"
                    : "text-ink hover:bg-surface"
                }`}
              >
                {suggestion}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
