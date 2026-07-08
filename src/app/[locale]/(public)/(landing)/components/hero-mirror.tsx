import { cn } from "@/lib/utils";

/* Spectral colors are physical (violet → red), not theme tokens. */
const SPECTRUM = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

const HEX_SIZE = 15;
const CENTER_X = 170;
const CENTER_Y = 180;

type Hex = Readonly<{ x: number; y: number; ring: number; delay: number; opacity: number }>;

/* Flat-top hexagonal grid, rings 2–5. Rings 0–1 are skipped: the ELT
 * primary has a central obstruction. All values are deterministic so
 * server and client renders match. */
function buildHexes(): Hex[] {
  const hexes: Hex[] = [];

  for (let q = -5; q <= 5; q++) {
    for (let r = -5; r <= 5; r++) {
      const ring = (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
      if (ring < 2 || ring > 5) continue;

      hexes.push({
        x: CENTER_X + HEX_SIZE * 1.5 * q,
        y: CENTER_Y + HEX_SIZE * Math.sqrt(3) * (r + q / 2),
        ring,
        delay: ring * 0.12 + ((q * 5 + r * 9 + 55) % 7) * 0.05,
        opacity: 0.2 + ((q * 3 + r * 7 + 55) % 5) * 0.035,
      });
    }
  }

  return hexes;
}

const HEXES = buildHexes();

const HEX_POINTS = Array.from({ length: 6 }, (_, i) => {
  const angle = (Math.PI / 3) * i;
  return `${(13.2 * Math.cos(angle)).toFixed(2)},${(13.2 * Math.sin(angle)).toFixed(2)}`;
}).join(" ");

/* Beam leaving the mirror, then dispersing into a spectral fan. */
const BEAM_ORIGIN = { x: 296, y: 180 };
const DISPERSER = { x: 352, y: 150 };
const FAN_ENDPOINTS = [60, 105, 150, 195, 240];

export function HeroMirror({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      viewBox="0 0 460 360"
      className={cn("w-full h-auto text-primary select-none", className)}
      role="img"
      aria-hidden="true"
    >
      {/* Segmented primary mirror */}
      <g>
        {HEXES.map((hex) => (
          <polygon
            key={`${hex.x}-${hex.y}`}
            className="hex"
            points={HEX_POINTS}
            transform={`translate(${hex.x.toFixed(1)} ${hex.y.toFixed(1)})`}
            fill="currentColor"
            style={
              {
                "--hex-delay": `${hex.delay.toFixed(2)}s`,
                "--hex-opacity": hex.opacity.toFixed(2),
              } as React.CSSProperties
            }
          />
        ))}
      </g>

      {/* Collimated beam to the disperser */}
      <path
        className="beam"
        d={`M ${BEAM_ORIGIN.x} ${BEAM_ORIGIN.y} L ${DISPERSER.x} ${DISPERSER.y}`}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.5"
        fill="none"
        style={{ "--beam-length": 70, "--beam-delay": "1.1s" } as React.CSSProperties}
      />

      {/* Dispersed spectrum */}
      {FAN_ENDPOINTS.map((y, i) => (
        <path
          key={y}
          className="beam"
          d={`M ${DISPERSER.x} ${DISPERSER.y} L 452 ${y}`}
          stroke={SPECTRUM[i]}
          strokeWidth="1.75"
          strokeOpacity="0.85"
          strokeLinecap="round"
          fill="none"
          style={
            {
              "--beam-length": 150,
              "--beam-delay": `${(1.5 + i * 0.12).toFixed(2)}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </svg>
  );
}
