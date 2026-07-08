"use client";

import { cn } from "@/lib/utils";

import { useReducedMotion } from "./use-reduced-motion";

const PACKET_PATH = "M 130 70 H 630";

type ArchitectureDiagramProps = Readonly<{
  labels: Readonly<Record<"server" | "server-note" | "manifest" | "cache" | "worker" | "results", string>>;
  className?: string;
}>;

/** The client-side pipeline: static files → IndexedDB cache → Web Worker → results.
 *  A data packet loops through, dwelling at each stage. */
export function ArchitectureDiagram({ labels, className }: ArchitectureDiagramProps) {
  const reducedMotion = useReducedMotion();

  return (
    <svg
      viewBox="0 0 760 170"
      className={cn("w-full h-auto text-foreground select-none", className)}
      role="img"
      aria-hidden="true"
    >
      {/* Connectors */}
      <g stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.25" fill="none">
        <path d="M 130 70 H 210" />
        <path d="M 310 70 H 360" />
        <path d="M 480 70 H 560" />
      </g>
      <text x="170" y="58" textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.55" className="font-mono">
        {labels.manifest}
      </text>

      {/* Server — static bytes only */}
      <g>
        <rect x="20" y="42" width="110" height="56" rx="6" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.5" />
        <text x="75" y="75" textAnchor="middle" fontSize="11" fill="currentColor" fillOpacity="0.8">
          {labels.server}
        </text>
        <text
          x="75"
          y="120"
          textAnchor="middle"
          fontSize="10"
          fill="currentColor"
          fillOpacity="0.5"
          textDecoration="line-through"
        >
          {labels["server-note"]}
        </text>
      </g>

      {/* IndexedDB cache — cylinder */}
      <g stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.5" fill="none">
        <path d="M 210 52 v 40 a 50 9 0 0 0 100 0 v -40" />
        <ellipse cx="260" cy="52" rx="50" ry="9" />
      </g>
      <text x="260" y="80" textAnchor="middle" fontSize="11" fill="currentColor" fillOpacity="0.8">
        IndexedDB
      </text>
      <text x="260" y="128" textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.5">
        {labels.cache}
      </text>

      {/* Web Worker */}
      <g>
        <rect x="360" y="42" width="120" height="56" rx="6" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.5" />
        <circle className="worker-pulse" cx="420" cy="70" r="14" fill="none" stroke="var(--chart-1)" strokeWidth="1.5" />
        <text x="420" y="75" textAnchor="middle" fontSize="11" fill="currentColor" fillOpacity="0.8">
          Web Worker
        </text>
        <text x="420" y="120" textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.5">
          {labels.worker}
        </text>
      </g>

      {/* Results — mini SNR spectrum */}
      <g>
        <rect x="560" y="42" width="140" height="56" rx="6" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.5" />
        <path
          d="M 572 84 l 12 -14 l 10 7 l 11 -18 l 10 5 l 12 -9 l 11 12 l 12 -16 l 11 6 l 12 -5 l 12 9 l 11 -11"
          fill="none"
          stroke="var(--chart-1)"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
        <text x="630" y="120" textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.5">
          {labels.results}
        </text>
      </g>

      {/* Data packet looping through the pipeline */}
      {!reducedMotion && (
        <circle r="4" fill="var(--chart-1)">
          <animateMotion
            dur="6s"
            repeatCount="indefinite"
            path={PACKET_PATH}
            calcMode="linear"
            keyPoints="0;0.26;0.26;0.58;0.58;1"
            keyTimes="0;0.25;0.4;0.6;0.75;1"
          />
        </circle>
      )}
    </svg>
  );
}
