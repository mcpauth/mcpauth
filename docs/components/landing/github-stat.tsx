import Link from "next/link";
import { Star } from "lucide-react";

function kFormatter(num: number): string {
  if (Math.abs(num) > 999) {
    return (Math.sign(num) * (Math.abs(num) / 1000)).toFixed(1) + "k";
  }
  return String(num);
}

export const GithubStat = ({ stars }: { stars: string | null }) => {
	  let total = 0;
  if (stars) {
    total = parseInt(stars.replace(/,/g, ""), 10);
  }

  return (
    <Link
      href="https://github.com/mcpauth/mcpauth"
      target="_blank"
      className="relative group inline-flex items-center justify-center overflow-hidden rounded-none border border-input bg-transparent px-4 py-2 text-sm font-medium text-black dark:text-white shadow-sm transition-all duration-300 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none"
    >
      {/* shimmer */}
      <div className="flex items-center gap-2">
        <Star className="h-4 w-4" />
        <span>Star on GitHub</span>
      </div>
      {stars && (
        <span className="ml-3 flex items-center gap-1 font-mono text-xs tabular-nums tracking-wider">
          <Star className="h-4 w-4 text-yellow-400 group-hover:text-yellow-300 transition-colors" />
          {kFormatter(total)}
        </span>
      )}
    </Link>
  );
};
