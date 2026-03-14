"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { CartesianGrid, Line, XAxis, YAxis, Brush, ComposedChart, Tooltip } from "recharts";
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";

export interface LineConfig {
  dataKey: string;
  type?: "monotone" | "linear" | "step" | "basis" | "natural";
  strokeWidth?: number;
}

export interface InteractiveChartProps<T extends Record<string, any>> {
  data: T[];
  chartConfig: ChartConfig;
  lines: LineConfig[];
  xAxisKey: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  xAxisTickFormatter?: (value: string) => string;
  tooltipContent?: React.ReactElement;
  brushTickFormatter?: (value: string) => string;
  height?: number;
  showLegend?: boolean;
  resetLabel?: React.ReactElement | string;
}

const SELECTION_COLOR = "oklch(0.488 0.243 264.376)";
const BRUSH_VISUAL_HEIGHT = 50;
const BRUSH_TOP_GAP = 30;
const BRUSH_HEIGHT = BRUSH_VISUAL_HEIGHT + BRUSH_TOP_GAP;
const CHART_MARGIN = { top: 10, right: 10, left: 16, bottom: 24 };
const YAXIS_WIDTH = 48;

function useChartInteraction(dataLength: number, height: number) {
  const [range, setRange] = useState({ left: 0, right: Math.max(0, dataLength - 1) });
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  
  // Keep refs synced for native event listeners without causing stale closures
  const rangeRef = useRef(range);
  useEffect(() => { rangeRef.current = range; }, [range]);

  const rafRef = useRef<number | null>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragCurrentX = useRef(0);

  // Sync range when data changes safely
  useEffect(() => {
    setRange({ left: 0, right: Math.max(0, dataLength - 1) });
  }, [dataLength]);

  const pixelToIndex = useCallback((pixelX: number): number => {
    const wrapper = chartWrapperRef.current;
    if (!wrapper) return 0;

    const plotLeft = CHART_MARGIN.left + YAXIS_WIDTH;
    const plotRight = wrapper.clientWidth - CHART_MARGIN.right;
    const plotWidth = plotRight - plotLeft;

    if (plotWidth <= 0) return rangeRef.current.left;

    const fraction = Math.max(0, Math.min(1, (pixelX - plotLeft) / plotWidth));
    const { left, right } = rangeRef.current;
    const visibleCount = right - left;
    return Math.round(left + fraction * visibleCount);
  }, []);

  const updateOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    const wrapper = chartWrapperRef.current;
    if (!overlay || !wrapper) return;

    if (!isDragging.current) {
      overlay.style.display = "none";
      return;
    }

    const x1 = Math.min(dragStartX.current, dragCurrentX.current);
    const x2 = Math.max(dragStartX.current, dragCurrentX.current);
    const width = x2 - x1;

    // Avoid flicker on simple clicks
    if (width < 4) {
      overlay.style.display = "none";
      return;
    }

    const plotLeft = CHART_MARGIN.left + YAXIS_WIDTH;
    const plotRight = wrapper.clientWidth - CHART_MARGIN.right;

    const clampedX1 = Math.max(plotLeft, x1);
    const clampedX2 = Math.min(plotRight, x2);

    if (clampedX2 <= clampedX1) {
      overlay.style.display = "none";
      return;
    }

    const plotTop = CHART_MARGIN.top;
    const plotBottom = (wrapper.clientHeight || height) - BRUSH_HEIGHT;

    overlay.style.display = "block";
    overlay.style.left = `${clampedX1}px`;
    overlay.style.top = `${plotTop}px`;
    overlay.style.width = `${clampedX2 - clampedX1}px`;
    overlay.style.height = `${Math.max(0, plotBottom - plotTop)}px`;
  }, [height]);

  useEffect(() => {
    const wrapper = chartWrapperRef.current;
    if (!wrapper) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      e.preventDefault();
      e.stopPropagation();

      if (dataLength === 0) return;

      const direction = e.deltaY < 0 ? 1 : -1;
      const wrapperRect = wrapper.getBoundingClientRect();
      const mousePercentage = (e.clientX - wrapperRect.left) / wrapperRect.width;

      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const { left, right } = rangeRef.current;
        const zoomAmount = (right - left) * 0.1 * direction;

        const newLeft = Math.max(0, left + Math.floor(zoomAmount * mousePercentage));
        const newRight = Math.min(dataLength - 1, right - Math.ceil(zoomAmount * (1 - mousePercentage)));

        if (newLeft < newRight) {
          setRange({ left: newLeft, right: newRight });
        }
      });
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;

      const wrapperRect = wrapper.getBoundingClientRect();
      const localY = e.clientY - wrapperRect.top;
      const localX = e.clientX - wrapperRect.left;

      if (localY > (wrapper.clientHeight || height) - BRUSH_HEIGHT) return;

      const plotLeft = CHART_MARGIN.left + YAXIS_WIDTH;
      const plotRight = wrapper.clientWidth - CHART_MARGIN.right;
      if (localX < plotLeft || localX > plotRight) return;

      isDragging.current = true;
      dragStartX.current = localX;
      dragCurrentX.current = localX;
      updateOverlay();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const wrapperRect = wrapper.getBoundingClientRect();
      dragCurrentX.current = e.clientX - wrapperRect.left;
      updateOverlay();
    };

    const handleMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;

      const x1 = Math.min(dragStartX.current, dragCurrentX.current);
      const x2 = Math.max(dragStartX.current, dragCurrentX.current);

      if (x2 - x1 > 4) {
        const idxLeft = pixelToIndex(x1);
        const idxRight = pixelToIndex(x2);
        const [newLeft, newRight] = [idxLeft, idxRight].sort((a, b) => a - b);
        
        const clampedLeft = Math.max(0, newLeft);
        const clampedRight = Math.min(dataLength - 1, newRight);

        if (clampedLeft < clampedRight) {
          setRange({ left: clampedLeft, right: clampedRight });
        }
      }

      if (overlayRef.current) overlayRef.current.style.display = "none";
    };

    const handleMouseLeave = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      if (overlayRef.current) overlayRef.current.style.display = "none";
    };

    wrapper.addEventListener("wheel", handleWheel, { passive: false });
    wrapper.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    wrapper.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      wrapper.removeEventListener("wheel", handleWheel);
      wrapper.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      wrapper.removeEventListener("mouseleave", handleMouseLeave);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [height, dataLength, pixelToIndex, updateOverlay]);

  return { range, setRange, chartWrapperRef, overlayRef };
}

export function InteractiveChart<T extends Record<string, any>>({
  data,
  chartConfig,
  lines,
  xAxisKey,
  xAxisLabel,
  yAxisLabel,
  xAxisTickFormatter,
  tooltipContent,
  brushTickFormatter,
  height = 450,
  showLegend = true,
  resetLabel = "Reset",
}: InteractiveChartProps<T>): React.JSX.Element {
  const { range, setRange, chartWrapperRef, overlayRef } = useChartInteraction(data.length, height);
  const brushY = Math.max(CHART_MARGIN.top, height - BRUSH_VISUAL_HEIGHT);

  const downsampledData = useMemo(() => {
    const MAX_POINTS = 800; // Adjust based on your chart width
    if (data.length <= MAX_POINTS) return data;

    const step = Math.ceil(data.length / MAX_POINTS);
    
    // Simple decimation: take every Nth point
    return data.filter((_, index) => index % step === 0);
  }, [data]);

  const reset = useCallback(() => {
    setRange({ left: 0, right: data.length - 1 });
  }, [data.length, setRange]);

  const isZoomed = range.left !== 0 || range.right !== data.length - 1;

  return (
    <div className="w-full">
      {isZoomed && (
        <div className="top-8 right-8 z-20 absolute mb-2">
          <Button size="sm" variant="outline" className="rounded" onClick={reset}>
            {resetLabel}
          </Button>
        </div>
      )}
      
      <div className="relative w-full select-none" style={{ height }} ref={chartWrapperRef}>
        <div
          ref={overlayRef}
          style={{
            display: "none",
            position: "absolute",
            backgroundColor: SELECTION_COLOR,
            opacity: 0.15,
            border: `1px solid ${SELECTION_COLOR}`,
            borderRadius: 2,
            pointerEvents: "none",
            zIndex: 10,
          }}
        />
        
        <ChartContainer
          config={chartConfig}
          className="[&_.recharts-brush-slide]:fill-opacity-15 [&_.recharts-brush-slide]:fill-[oklch(0.488_0.243_264.376)] w-full h-full aspect-auto [&_.recharts-surface]:overflow-visible [&_.recharts-wrapper]:overflow-visible"
        >
          <ComposedChart data={data} margin={CHART_MARGIN}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              tickLine={false}
              axisLine={false}
              tickMargin={7}
              label={xAxisLabel ? { value: xAxisLabel, position: "insideBottom", offset: -16 } : undefined}
              tickFormatter={xAxisTickFormatter}
              style={{ userSelect: "none" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={YAXIS_WIDTH}
              label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: "left", offset: 2 } : undefined}
              style={{ userSelect: "none" }}
            />
            
            {tooltipContent ? <Tooltip content={tooltipContent} animationDuration={0} /> : <Tooltip />}

            {lines.map((line) => (
              <Line
                key={line.dataKey}
                dataKey={line.dataKey}
                type={line.type ?? "monotone"}
                stroke={`var(--color-${line.dataKey})`}
                strokeWidth={line.strokeWidth ?? 2}
                dot={false}
                isAnimationActive={false}
              />
            ))}

            {showLegend && <ChartLegend content={<ChartLegendContent />} />}

            <Brush
              dataKey={xAxisKey}
              y={brushY}
              height={BRUSH_VISUAL_HEIGHT}
              startIndex={range.left}
              endIndex={range.right}
              onChange={(e) => setRange({ left: e.startIndex ?? 0, right: e.endIndex ?? data.length - 1 })}
              stroke={SELECTION_COLOR}
              fill="transparent"
              tickFormatter={brushTickFormatter}
            >
              <ComposedChart>
                <CartesianGrid vertical={false} horizontal={false} />
                {lines.map((line) => (
                  <Line
                    key={`brush-${line.dataKey}`}
                    dataKey={line.dataKey}
                    type={line.type ?? "monotone"}
                    stroke={`var(--color-${line.dataKey})`}
                    strokeWidth={1}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </ComposedChart>
            </Brush>
          </ComposedChart>
        </ChartContainer>
      </div>
    </div>
  );
}