"use client";

import Image from "next/image";
import { ArrowLeftIcon } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
}

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
  angle: number;
}

export default function NotFound() {
  const t = useTranslations("not-found");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Helper to read the current primary color from CSS variables and apply alpha
    const getPrimaryColor = () => {
      const bodyStyle = getComputedStyle(document.body);
      const color = bodyStyle.getPropertyValue("--primary").trim();
      return color || "oklch(0 0 0)"; // nearly black in OKLCH
    };

    const withAlpha = (color: string, alpha: number) => {
      const a = Math.max(0, Math.min(1, alpha));
      const c = color.trim();
      if (!c) return `rgba(0, 0, 0, ${a})`;
      if (c.includes("/")) return c.replace(/\/\s*[^)]+\)/, `/ ${a})`);
      if (c.endsWith(")")) return c.slice(0, -1) + ` / ${a})`;
      return `rgba(0, 0, 0, ${a})`;
    };

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Create stars
    const numStars = canvas.width * canvas.height * 0.0002;
    const stars: Star[] = [];
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2,
        opacity: Math.random(),
        speed: Math.random() * 0.25,
      });
    }

    // Create shooting stars
    const shootingStars: ShootingStar[] = [];

    const createShootingStar = () => {
      shootingStars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.5,
        length: Math.random() * 80 + 40,
        speed: Math.random() * 3 + 6,
        opacity: 1,
        angle: Math.PI / 4,
      });
    };

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const primary = getPrimaryColor();

      // Draw and update stars
      stars.forEach((star) => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = withAlpha(primary, star.opacity);
        ctx.fill();

        // Twinkle effect
        star.opacity -= Math.sin(Date.now() * 0.001 + star.x + star.y) * 0.005;
        star.opacity = Math.max(0.1, Math.min(1, star.opacity));
      });

      // Draw and update shooting stars
      shootingStars.forEach((shootingStar, index) => {
        const gradient = ctx.createLinearGradient(
          shootingStar.x,
          shootingStar.y,
          shootingStar.x - Math.cos(shootingStar.angle) * shootingStar.length,
          shootingStar.y - Math.sin(shootingStar.angle) * shootingStar.length
        );
        gradient.addColorStop(0, withAlpha(primary, shootingStar.opacity));
        gradient.addColorStop(0.5, withAlpha(primary, shootingStar.opacity * 0.5));
        gradient.addColorStop(1, withAlpha(primary, 0));

        ctx.beginPath();
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.moveTo(shootingStar.x, shootingStar.y);
        ctx.lineTo(
          shootingStar.x - Math.cos(shootingStar.angle) * shootingStar.length,
          shootingStar.y - Math.sin(shootingStar.angle) * shootingStar.length
        );
        ctx.stroke();

        // Update position
        shootingStar.x += Math.cos(shootingStar.angle) * shootingStar.speed;
        shootingStar.y += Math.sin(shootingStar.angle) * shootingStar.speed;
        shootingStar.opacity -= 0.01;

        // Remove if out of bounds or faded
        if (
          shootingStar.opacity <= 0 ||
          shootingStar.x > canvas.width ||
          shootingStar.y > canvas.height
        ) {
          shootingStars.splice(index, 1);
        }
      });

      // Randomly create new shooting stars
      if (Math.random() < 0.02) {
        createShootingStar();
      }

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return (
    <div className="relative w-full min-h-screen overflow-hidden x-5">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <div className="relative flex flex-col justify-center items-center gap-4 min-h-[calc(100vh-4rem)] text-center">
        <h1 className="flex justify-center items-center gap-2 h-24 md:h-48 font-mono font-bold text-[6rem] md:text-[12rem] select-none">
          4
          <Image
            src="/assets/images/planets/moon.svg"
            alt="Moon"
            width={128}
            height={128}
            className="w-24 md:w-48 h-24 md:h-48"
            draggable={false}
          />
          4
        </h1>

        <h2 className="font-mono font-semibold text-2xl md:text-4xl">{t("lost-in-space")}</h2>

        <p className="px-4 max-w-lg text-muted-foreground text-lg md:text-xl text-center">
          {t("alien-abducted-page")}
        </p>

        <Button variant="default" className="mt-4" size="lg" asChild>
          <Link href="/">
            <ArrowLeftIcon />
            {t("go-back-to-earth")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
