"use client";

import { cn } from "@/lib/utils";

import { useInView } from "./use-in-view";

type RevealProps = Readonly<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}>;

/** Fades content in (once) when it scrolls into view. */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const [ref, inView] = useInView<HTMLDivElement>(0.15);

  return (
    <div
      ref={ref}
      className={cn("opacity-0", inView && "animate-fade-in-up", className)}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
