"use client";

import type { ReactNode } from "react";

interface CardsProps {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4;
}

/**
 * Generic Cards wrapper used inside MDX docs.
 * Renders children in a responsive grid with reasonable spacing.
 */
export default function Cards({ children, cols = 3 }: CardsProps) {
  const colClass = {
    1: "grid-cols-1",
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  }[cols];

  return (
    <div className={`grid gap-4 ${colClass}`}>{children}</div>
  );
}
