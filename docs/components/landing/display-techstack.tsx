import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const TechStackDisplay = ({
  skills,
  className,
}: {
  skills: string[];
  className?: string;
}) => {
	return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-3 md:gap-4",
        className,
      )}
    >
			{skills.map((skill) => (
				<TooltipProvider delayDuration={30} key={skill}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={
                  "px-3 py-1.5 rounded-full text-xs md:text-sm font-medium bg-gradient-to-tr from-stone-200 via-stone-100 to-stone-50 dark:from-stone-800 dark:via-stone-900 dark:to-stone-950 border border-white/20 dark:border-black/40 shadow-sm hover:shadow-md"
                }
              >
                {skill}
              </span>
            </TooltipTrigger>
            <TooltipContent className="text-xs text-white/80 bg-stone-900/90 backdrop-blur-md border border-white/10">
              {skill}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
			))}
		</div>
  );
};
