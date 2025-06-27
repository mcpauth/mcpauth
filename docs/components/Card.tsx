"use client";

import Link from "next/link";
import { Card as UICard, CardContent } from "@/components/ui/card";
import type { ReactNode } from "react";

interface CardProps {
  title: string;
  href: string;
  children?: ReactNode;
}

export default function Card({ title, href, children }: CardProps) {
  return (
    <UICard className="hover:shadow-md transition-shadow">
      <Link href={href} className="block h-full w-full">
        <CardContent className="p-4 h-full flex flex-col justify-between">
          <h3 className="text-lg font-medium mb-2">{title}</h3>
          {children ? <div className="text-sm text-muted-foreground">{children}</div> : null}
        </CardContent>
      </Link>
    </UICard>
  );
}
