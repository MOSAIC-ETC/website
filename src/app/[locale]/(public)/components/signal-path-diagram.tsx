"use client";

import { cn } from "@/lib/utils";

import { useReducedMotion } from "./use-reduced-motion";

const SPECTRUM = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

/* Source photons: star → atmosphere → mirror → disperser → detector. */
const SIGNAL_PATH = "M 50 70 C 130 80, 220 95, 305 100 L 455 105 L 612 105";
/* Sky photons join inside the atmosphere band. */
const SKY_PATH = "M 172 18 C 172 60, 235 96, 305 100 L 455 105 L 612 105";

export type ModelTerm = "signal" | "background" | "noise";

type SignalPathDiagramProps = Readonly<{
  labels: Readonly<Record<"source" | "sky" | "telescope" | "disperser" | "detector", string>>;
  onHighlight: (term: ModelTerm | null) => void;
  className?: string;
}>;

/**
 * Animated photon path of the SNR model. Groups carry `data-term`
 * attributes matching the equation terms so hover state dims the
 * unrelated stages (see landing.css).
 */
export function SignalPathDiagram({ labels, onHighlight, className }: SignalPathDiagramProps) {
  const reducedMotion = useReducedMotion();

  const hoverProps = (term: ModelTerm) => ({
    onMouseEnter: () => onHighlight(term),
    onMouseLeave: () => onHighlight(null),
  });

  return (
    <svg
      viewBox="0 0 760 230"
      className={cn("w-full h-auto text-foreground select-none", className)}
      role="img"
      aria-hidden="true"
    >
      {/* Source star + beam (C_s) */}
      <g className="dim-target" data-term="signal" {...hoverProps("signal")}>
        <path d={SIGNAL_PATH} fill="none" stroke="var(--chart-1)" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 4" />
        <circle cx="50" cy="70" r="6" fill="var(--chart-1)" />
        {[0, 45, 90, 135].map((angle) => (
          <line
            key={angle}
            x1={50 - 11 * Math.cos((angle * Math.PI) / 180)}
            y1={70 - 11 * Math.sin((angle * Math.PI) / 180)}
            x2={50 + 11 * Math.cos((angle * Math.PI) / 180)}
            y2={70 + 11 * Math.sin((angle * Math.PI) / 180)}
            stroke="var(--chart-1)"
            strokeWidth="1"
            strokeOpacity="0.6"
          />
        ))}
        {!reducedMotion &&
          [0, 1.7, 3.4].map((begin) => (
            <circle key={begin} r="3" fill="var(--chart-1)">
              <animateMotion dur="5s" begin={`${begin}s`} repeatCount="indefinite" path={SIGNAL_PATH} />
            </circle>
          ))}
        <text x="50" y="215" textAnchor="middle" fontSize="11" fill="currentColor" fillOpacity="0.65">
          {labels.source}
        </text>
      </g>

      {/* Atmosphere band + sky photons (C_b) */}
      <g className="dim-target" data-term="background" {...hoverProps("background")}>
        <path
          d="M 152 25 q 8 40 0 80 t 0 80 h 42 q -8 -40 0 -80 t 0 -80 Z"
          fill="var(--chart-3)"
          fillOpacity="0.1"
          stroke="var(--chart-3)"
          strokeOpacity="0.4"
          strokeWidth="1"
        />
        {!reducedMotion &&
          [0.8, 3.1].map((begin) => (
            <circle key={begin} r="3" fill="var(--chart-3)">
              <animateMotion dur="4.5s" begin={`${begin}s`} repeatCount="indefinite" path={SKY_PATH} />
            </circle>
          ))}
        <text x="173" y="215" textAnchor="middle" fontSize="11" fill="currentColor" fillOpacity="0.65">
          {labels.sky}
        </text>
      </g>

      {/* Primary mirror (not a term — never dimmed) */}
      <g>
        <path d="M 318 55 Q 296 102 318 150" fill="none" stroke="currentColor" strokeOpacity="0.7" strokeWidth="4" strokeLinecap="round" />
        <text x="310" y="215" textAnchor="middle" fontSize="11" fill="currentColor" fillOpacity="0.65">
          {labels.telescope}
        </text>
      </g>

      {/* Disperser + spectral fan */}
      <g>
        <polygon points="443,88 471,105 443,122" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.25" />
        {SPECTRUM.map((color, i) => (
          <line key={color} x1="468" y1="105" x2="600" y2={75 + i * 15} stroke={color} strokeWidth="1.25" strokeOpacity="0.55" />
        ))}
        <text x="455" y="215" textAnchor="middle" fontSize="11" fill="currentColor" fillOpacity="0.65">
          {labels.disperser}
        </text>
      </g>

      {/* Detector (RON, DARK) */}
      <g className="dim-target" data-term="noise" {...hoverProps("noise")}>
        <rect x="606" y="58" width="76" height="94" rx="3" fill="none" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.5" />
        {[1, 2, 3].map((i) => (
          <line key={`v${i}`} x1={606 + i * 19} y1="58" x2={606 + i * 19} y2="152" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" />
        ))}
        {[1, 2, 3, 4].map((i) => (
          <line key={`h${i}`} x1="606" y1={58 + i * 18.8} x2="682" y2={58 + i * 18.8} stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" />
        ))}
        <text x="644" y="178" textAnchor="middle" fontSize="10" fill="currentColor" className="noise-pulse font-mono">
          RON · DARK
        </text>
        <text x="644" y="215" textAnchor="middle" fontSize="11" fill="currentColor" fillOpacity="0.65">
          {labels.detector}
        </text>
      </g>
    </svg>
  );
}
