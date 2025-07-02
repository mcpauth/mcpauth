"use client";

import React, { useState } from "react";
import clsx from "clsx";
import { useTheme } from "next-themes";
import { Highlight, themes } from "prism-react-renderer";
import { Check, Copy } from "lucide-react";

function TrafficLightsIcon(props: React.ComponentPropsWithoutRef<"svg">) {
  return (
    <svg aria-hidden="true" viewBox="0 0 42 10" fill="none" {...props}>
      <circle cx="5" cy="5" r="4.5" className="fill-red-500/70" />
      <circle cx="21" cy="5" r="4.5" className="fill-yellow-400/70" />
      <circle cx="37" cy="5" r="4.5" className="fill-green-500/70" />
    </svg>
  );
}

interface CodeFile {
  name: string;
  content: string;
  language: string;
}

interface CodeWindowProps {
  files: CodeFile[];
  className?: string;
}

export function CodeWindow({ files, className }: CodeWindowProps) {
  const tabs = files.map((file) => ({
    ...file,
    content: file.content.trim(),
  }));

  const [active, setActive] = useState(0);
  const [mounted, setMounted] = useState(false);
  React.useEffect(() => setMounted(true), []);

  const { resolvedTheme } = useTheme();
  const [copied, setCopied] = useState(false);

  const theme = resolvedTheme === "dark" ? themes.dracula : themes.github;

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-left text-[13px] leading-5",
        className
      )}
    >
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-100 dark:bg-zinc-800/50">
        <TrafficLightsIcon className="h-2.5 w-auto" />
        <button
          onClick={() => {
            navigator.clipboard.writeText(tabs[active].content).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
          className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-300"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy
            </>
          )}
        </button>
      </div>
      {/* Tabs */}
      <div className="flex gap-2 px-4 py-1.5 bg-zinc-100/60 dark:bg-zinc-800/40 border-t border-zinc-200 dark:border-zinc-800">
        {tabs.map((t, i) => (
          <button
            key={t.name}
            onClick={() => setActive(i)}
            className={clsx(
              "px-2 py-0.5 rounded-md text-xs font-medium transition-colors",
              i === active
                ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
                : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
            )}
          >
            {t.name}
          </button>
        ))}
      </div>
      {mounted && (
        <Highlight theme={theme} code={tabs[active].content} language={tabs[active].language as any}>
        {({ style, tokens, getLineProps, getTokenProps }) => (
          <pre className="overflow-x-auto p-4" style={style as React.CSSProperties}>
            {tokens.map((line, i) => {
              const lineProps = getLineProps({ line, key: i }) as any;
              const { key: lineKey, ...restLineProps } = lineProps;
              return (
                <div key={lineKey} {...restLineProps}>
                  {line.map((token, j) => {
                    const tokenProps = getTokenProps({ token, key: j }) as any;
                    const { key: tokenKey, ...restTokenProps } = tokenProps;
                    return <span key={tokenKey} {...restTokenProps} />;
                  })}
                </div>
              );
            })}
          </pre>
        )}
      </Highlight>
      )}
    </div>
  );
}
