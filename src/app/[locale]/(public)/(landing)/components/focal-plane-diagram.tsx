import { cn } from "@/lib/utils";

const CENTER = 180;
const FIELD_RADIUS = 164;

/* Deterministic LCG so server and client renders agree. */
function makeRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function scatter(count: number, seed: number, maxRadius: number) {
  const random = makeRandom(seed);
  return Array.from({ length: count }, () => {
    const radius = maxRadius * Math.sqrt(random());
    const angle = 2 * Math.PI * random();
    return {
      x: CENTER + radius * Math.cos(angle),
      y: CENTER + radius * Math.sin(angle),
    };
  });
}

const VIS_TARGETS = scatter(60, 7, FIELD_RADIUS - 8);
const NIR_TARGETS = scatter(26, 23, FIELD_RADIUS - 10);

const IFU_POSITIONS = [
  { x: 110, y: 95 },
  { x: 235, y: 75 },
  { x: 290, y: 150 },
  { x: 255, y: 250 },
  { x: 160, y: 290 },
  { x: 80, y: 230 },
  { x: 175, y: 170 },
  { x: 300, y: 220 },
];

const IFU_HEX = Array.from({ length: 6 }, (_, i) => {
  const angle = (Math.PI / 3) * i + Math.PI / 6;
  return `${(9 * Math.cos(angle)).toFixed(2)},${(9 * Math.sin(angle)).toFixed(2)}`;
}).join(" ");

type FocalPlaneDiagramProps = Readonly<{
  lit: boolean;
  fieldLabel: string;
  className?: string;
}>;

/**
 * Schematic of MOSAIC's patrol field: MOS VIS targets (dots), MOS NIR
 * targets (diamonds) and deployable IFUs (hexagons). Shape redundantly
 * encodes mode so identity never rests on color alone.
 */
export function FocalPlaneDiagram({ lit, fieldLabel, className }: FocalPlaneDiagramProps) {
  return (
    <svg
      viewBox="0 0 360 360"
      className={cn("w-full h-auto select-none", lit && "fp-lit", className)}
      role="img"
      aria-hidden="true"
    >
      {/* Patrol field boundary */}
      <g className="dim-target" data-mode="field">
        <circle
          cx={CENTER}
          cy={CENTER}
          r={FIELD_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.35"
          strokeWidth="1"
          strokeDasharray="4 5"
        />
        <text
          x={CENTER}
          y={26}
          textAnchor="middle"
          fontSize="11"
          fill="currentColor"
          fillOpacity="0.6"
          className="font-mono"
        >
          {fieldLabel}
        </text>
      </g>

      {/* MOS VIS targets */}
      <g className="dim-target" data-mode="vis" fill="var(--chart-1)">
        {VIS_TARGETS.map((dot, i) => (
          <circle
            key={i}
            className="fp-el"
            cx={dot.x.toFixed(1)}
            cy={dot.y.toFixed(1)}
            r="2.5"
            style={{ "--fp-delay": `${(i * 0.02).toFixed(2)}s`, "--fp-opacity": 0.9 } as React.CSSProperties}
          />
        ))}
      </g>

      {/* MOS NIR targets */}
      <g className="dim-target" data-mode="nir" fill="var(--chart-3)">
        {NIR_TARGETS.map((dot, i) => (
          <rect
            key={i}
            className="fp-el"
            x={(dot.x - 2.6).toFixed(1)}
            y={(dot.y - 2.6).toFixed(1)}
            width="5.2"
            height="5.2"
            transform={`rotate(45 ${dot.x.toFixed(1)} ${dot.y.toFixed(1)})`}
            style={{ "--fp-delay": `${(1.1 + i * 0.04).toFixed(2)}s`, "--fp-opacity": 0.9 } as React.CSSProperties}
          />
        ))}
      </g>

      {/* Deployable IFUs */}
      <g
        className="dim-target"
        data-mode="ifu"
        fill="var(--chart-2)"
        fillOpacity="0.25"
        stroke="var(--chart-2)"
        strokeWidth="1.5"
      >
        {IFU_POSITIONS.map((pos, i) => (
          <polygon
            key={i}
            className="fp-el"
            points={IFU_HEX}
            transform={`translate(${pos.x} ${pos.y})`}
            style={{ "--fp-delay": `${(2.1 + i * 0.12).toFixed(2)}s`, "--fp-opacity": 1 } as React.CSSProperties}
          />
        ))}
      </g>
    </svg>
  );
}
