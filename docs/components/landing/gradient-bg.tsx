import { cn } from "@/lib/utils";
import type React from "react";

export const GradientBG = ({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) => {
	return (
		<div
			className={cn(
				"bg-neutral-50 dark:bg-neutral-900 border dark:border-neutral-800 rounded-sm p-2",
				className,
			)}
		>
			{children}
		</div>
	);
};
