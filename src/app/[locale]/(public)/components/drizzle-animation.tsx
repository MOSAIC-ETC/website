import { cn } from "@/lib/utils";

/* Input: 4×4 grid of 36px cells (0.5″/pixel). Output: 12×12 grid of
 * 13px cells (0.15″/spaxel) — the ~3.33× scale ratio of MaNGA → MOSAIC. */
const IN = { x: 12, y: 42, cell: 36, n: 4 };
const OUT = { x: 252, y: 32, cell: 13, n: 12 };

/* Input cells that "drizzle" onto the output grid, with staggered delays. */
const DROPS = [
  { col: 1, row: 1, delay: 0 },
  { col: 2, row: 3, delay: 3 },
  { col: 0, row: 2, delay: 6 },
];

function gridLines(x: number, y: number, cell: number, n: number) {
  const size = cell * n;
  const lines: string[] = [];
  for (let i = 0; i <= n; i++) {
    lines.push(`M ${x + i * cell} ${y} v ${size}`);
    lines.push(`M ${x} ${y + i * cell} h ${size}`);
  }
  return lines.join(" ");
}

type DrizzleAnimationProps = Readonly<{
  inputLabel: string;
  outputLabel: string;
  arrowLabel: string;
  className?: string;
}>;

/** Flux-conserving drizzle: coarse input pixels shrink to "drops" and
 *  deposit their flux onto the finer output grid. */
export function DrizzleAnimation({ inputLabel, outputLabel, arrowLabel, className }: DrizzleAnimationProps) {
  return (
    <svg
      viewBox="0 0 420 250"
      className={cn("w-full h-auto text-foreground select-none", className)}
      role="img"
      aria-hidden="true"
    >
      {/* Grids */}
      <path d={gridLines(IN.x, IN.y, IN.cell, IN.n)} stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" fill="none" />
      <path d={gridLines(OUT.x, OUT.y, OUT.cell, OUT.n)} stroke="currentColor" strokeOpacity="0.25" strokeWidth="0.75" fill="none" />

      {/* Arrow */}
      <g stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.5" fill="none">
        <path d="M 172 114 H 238" />
        <path d="M 231 108 L 238 114 L 231 120" />
      </g>
      <text x="205" y="102" textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.65" className="font-mono">
        {arrowLabel}
      </text>

      {/* Travelling packets + deposited flux */}
      {DROPS.map(({ col, row, delay }) => {
        const fromX = IN.x + col * IN.cell;
        const fromY = IN.y + row * IN.cell;
        const patchX = OUT.x + col * OUT.cell * 3;
        const patchY = OUT.y + row * OUT.cell * 3;
        const toX = patchX + (OUT.cell * 3) / 2 - IN.cell / 2;
        const toY = patchY + (OUT.cell * 3) / 2 - IN.cell / 2;

        return (
          <g key={`${col}-${row}`}>
            <rect
              className="dz-packet"
              width={IN.cell}
              height={IN.cell}
              fill="var(--chart-1)"
              style={
                {
                  "--fx": `${fromX}px`,
                  "--fy": `${fromY}px`,
                  "--tx": `${toX}px`,
                  "--ty": `${toY}px`,
                  "--dz-delay": `${delay}s`,
                } as React.CSSProperties
              }
            />
            <g className="dz-fill" fill="var(--chart-1)" style={{ "--dz-delay": `${delay}s` } as React.CSSProperties}>
              {[0, 1, 2].map((i) =>
                [0, 1, 2].map((j) => (
                  <rect
                    key={`${i}-${j}`}
                    x={patchX + i * OUT.cell + 1}
                    y={patchY + j * OUT.cell + 1}
                    width={OUT.cell - 2}
                    height={OUT.cell - 2}
                    fillOpacity={i === 1 && j === 1 ? 0.85 : 0.4}
                  />
                )),
              )}
            </g>
          </g>
        );
      })}

      {/* Labels */}
      <text x={IN.x + (IN.cell * IN.n) / 2} y="216" textAnchor="middle" fontSize="11" fill="currentColor" fillOpacity="0.65" className="font-mono">
        {inputLabel}
      </text>
      <text x={OUT.x + (OUT.cell * OUT.n) / 2} y="216" textAnchor="middle" fontSize="11" fill="currentColor" fillOpacity="0.65" className="font-mono">
        {outputLabel}
      </text>
    </svg>
  );
}
