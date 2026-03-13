import { useState, useEffect, useRef } from 'react';

/**
 * PrayerGlobe — An interactive world map showing prayer activity.
 *
 * Campus regions glow permanently. Prayer requests pulse in gold.
 * When someone prays, that dot shifts to a warm white glow.
 *
 * Uses canvas for performance + SVG-free simplicity.
 */

// ── Campus coordinates (approximate lat/lng → normalized 0-1 on equirectangular projection) ──
interface GlobePoint {
  x: number; // 0-1 left to right
  y: number; // 0-1 top to bottom
  label: string;
  region: string;
}

// Convert lat/lng to normalized x,y on equirectangular projection
function latLng(lat: number, lng: number): { x: number; y: number } {
  return {
    x: (lng + 180) / 360,
    y: (90 - lat) / 180,
  };
}

const CAMPUS_POINTS: GlobePoint[] = [
  // Australia — Adelaide region
  { ...latLng(-34.92, 138.60), label: 'Adelaide', region: 'Australia' },
  { ...latLng(-35.07, 138.51), label: 'South', region: 'Australia' },
  { ...latLng(-35.44, 138.62), label: 'Victor Harbor', region: 'Australia' },
  { ...latLng(-33.83, 138.60), label: 'Clare Valley', region: 'Australia' },
  // USA — Georgia + Tennessee
  { ...latLng(33.96, -84.07), label: 'Gwinnett', region: 'North America' },
  { ...latLng(34.02, -84.62), label: 'Kennesaw', region: 'North America' },
  { ...latLng(34.07, -84.29), label: 'Alpharetta', region: 'North America' },
  { ...latLng(35.93, -86.87), label: 'Franklin', region: 'North America' },
  // Indonesia
  { ...latLng(-7.57, 110.82), label: 'Solo', region: 'Indonesia' },
  { ...latLng(-8.65, 115.22), label: 'Bali', region: 'Indonesia' },
  { ...latLng(-0.50, 117.15), label: 'Samarinda', region: 'Indonesia' },
  { ...latLng(1.17, 124.84), label: 'Langowan', region: 'Indonesia' },
  // Brazil
  { ...latLng(-22.91, -43.17), label: 'Rio', region: 'Brazil' },
];

// Simplified continent outlines — pairs of [x,y] in normalized coords
// These are rough polygons for visual effect, not cartographic accuracy
const CONTINENTS: number[][][] = [
  // North America
  [[0.03,0.15],[0.15,0.10],[0.22,0.15],[0.28,0.20],[0.30,0.28],[0.28,0.34],[0.22,0.36],[0.18,0.35],[0.14,0.32],[0.08,0.28],[0.03,0.20]],
  // Central America
  [[0.22,0.36],[0.24,0.38],[0.25,0.42],[0.23,0.44],[0.22,0.42],[0.20,0.38]],
  // South America
  [[0.23,0.44],[0.28,0.42],[0.33,0.44],[0.35,0.50],[0.34,0.56],[0.33,0.62],[0.30,0.68],[0.27,0.72],[0.24,0.70],[0.22,0.64],[0.21,0.56],[0.22,0.48]],
  // Europe
  [[0.44,0.14],[0.50,0.12],[0.55,0.14],[0.54,0.18],[0.52,0.22],[0.48,0.24],[0.46,0.22],[0.44,0.18]],
  // Africa
  [[0.44,0.26],[0.50,0.24],[0.55,0.28],[0.57,0.34],[0.56,0.42],[0.54,0.50],[0.52,0.56],[0.50,0.60],[0.47,0.58],[0.45,0.52],[0.44,0.44],[0.43,0.36],[0.43,0.30]],
  // Asia
  [[0.55,0.14],[0.62,0.10],[0.70,0.12],[0.78,0.14],[0.82,0.18],[0.85,0.22],[0.82,0.26],[0.78,0.30],[0.72,0.32],[0.68,0.34],[0.64,0.32],[0.60,0.28],[0.56,0.24],[0.55,0.18]],
  // India / SE Asia
  [[0.68,0.34],[0.72,0.32],[0.74,0.36],[0.73,0.42],[0.70,0.44],[0.68,0.40]],
  // Indonesia archipelago
  [[0.76,0.44],[0.78,0.43],[0.80,0.44],[0.82,0.45],[0.84,0.44],[0.86,0.45],[0.85,0.47],[0.82,0.48],[0.79,0.47],[0.77,0.46]],
  // Australia
  [[0.80,0.56],[0.84,0.54],[0.88,0.55],[0.90,0.58],[0.89,0.62],[0.86,0.65],[0.82,0.64],[0.80,0.60]],
];

// Region glow colors
const REGION_COLORS: Record<string, string> = {
  'Australia': '#F5C842',
  'North America': '#4DA6FF',
  'Indonesia': '#FF7043',
  'Brazil': '#66BB6A',
};

interface PrayerDot {
  x: number;
  y: number;
  prayedFor: boolean;
  age: number; // 0-1 for animation
}

interface PrayerGlobeProps {
  prayers?: Array<{ campus: string; prayerCount: number }>;
  style?: React.CSSProperties;
}

export function PrayerGlobe({ prayers = [], style }: PrayerGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const animFrame = useRef<number>(0);
  const time = useRef(0);

  // Generate prayer dots from actual data
  const prayerDots = useRef<PrayerDot[]>([]);

  useEffect(() => {
    // Map prayers to approximate locations based on campus
    const dots: PrayerDot[] = prayers.slice(0, 30).map((p, i) => {
      // Find a nearby campus point and jitter slightly
      const campusIdx = i % CAMPUS_POINTS.length;
      const base = CAMPUS_POINTS[campusIdx];
      return {
        x: base.x + (Math.random() - 0.5) * 0.04,
        y: base.y + (Math.random() - 0.5) * 0.03,
        prayedFor: p.prayerCount > 0,
        age: Math.random(),
      };
    });
    prayerDots.current = dots;
  }, [prayers]);

  // Resize handler
  useEffect(() => {
    const el = canvasRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        setDims({ w, h: w * 0.5 }); // 2:1 aspect for equirectangular
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dims.w === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dims.w * dpr;
    canvas.height = dims.h * dpr;
    ctx.scale(dpr, dpr);

    function draw() {
      if (!ctx) return;
      time.current += 0.016;
      const t = time.current;
      const w = dims.w;
      const h = dims.h;

      // Slow horizontal scroll — full rotation every ~120 seconds
      const scrollOffset = (t * 0.008333) % 1; // normalized 0-1

      // Helper: wrap an x coordinate (0-1) with scroll offset, return pixel x
      // Returns an array of pixel positions (usually 1, but 2 if near the edge for seamless wrap)
      function wrapX(nx: number): number[] {
        const shifted = ((nx + scrollOffset) % 1 + 1) % 1;
        const px = shifted * w;
        const positions = [px];
        // Draw a duplicate near edges for seamless wrapping
        if (shifted > 0.85) positions.push((shifted - 1) * w);
        if (shifted < 0.15) positions.push((shifted + 1) * w);
        return positions;
      }

      // Clear
      ctx.clearRect(0, 0, w, h);

      // Background — dark ocean
      ctx.fillStyle = 'rgba(10, 12, 18, 0.95)';
      ctx.fillRect(0, 0, w, h);

      // Grid lines (subtle) — these stay fixed for a nice parallax feel
      ctx.strokeStyle = 'rgba(100, 120, 160, 0.06)';
      ctx.lineWidth = 0.5;
      for (let i = 1; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (h / 6) * i);
        ctx.lineTo(w, (h / 6) * i);
        ctx.stroke();
      }
      for (let i = 1; i < 12; i++) {
        const gx = (((i / 12) + scrollOffset) % 1) * w;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }

      // Draw continents (with scroll wrapping)
      CONTINENTS.forEach(poly => {
        // Draw the polygon at its scrolled position, plus a duplicate for wrap
        for (let dup = 0; dup < 2; dup++) {
          ctx.beginPath();
          poly.forEach(([px, py], i) => {
            const sx = (((px + scrollOffset) % 1 + 1) % 1 + dup - (dup === 1 ? 1 : 0)) * w;
            const sy = py * h;
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          });
          ctx.closePath();
          ctx.fillStyle = 'rgba(60, 70, 90, 0.35)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(100, 120, 160, 0.15)';
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      });

      // Draw campus region glows
      CAMPUS_POINTS.forEach(point => {
        const positions = wrapX(point.x);
        const cy = point.y * h;
        const color = REGION_COLORS[point.region] || '#F5C842';
        const pulse = 0.7 + 0.3 * Math.sin(t * 1.5 + point.x * 10);
        const radius = Math.min(w, h) * 0.025;

        positions.forEach(cx => {
          // Simple glow circle
          ctx.beginPath();
          ctx.arc(cx, cy, radius * 4, 0, Math.PI * 2);
          ctx.fillStyle = `${color}${Math.round(25 * pulse).toString(16).padStart(2, '0')}`;
          ctx.fill();

          // Core dot
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.7 + 0.3 * pulse;
          ctx.fill();
          ctx.globalAlpha = 1;
        });
      });

      // Draw prayer dots
      prayerDots.current.forEach((dot, i) => {
        const positions = wrapX(dot.x);
        const cy = dot.y * h;
        const pulse = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.3);
        const radius = Math.min(w, h) * 0.012;

        positions.forEach(cx => {
          if (dot.prayedFor) {
            ctx.beginPath();
            ctx.arc(cx, cy, radius * 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${0.08 * pulse})`;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 248, 220, ${0.6 + 0.4 * pulse})`;
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.arc(cx, cy, radius * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(245, 200, 66, ${0.12 * pulse})`;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(212, 160, 23, ${0.5 + 0.5 * pulse})`;
            ctx.fill();
          }
        });
      });

      // Region labels (small, elegant)
      ctx.font = `${Math.max(8, w * 0.022)}px var(--font-sans, system-ui)`;
      ctx.textAlign = 'center';
      const regionCenters = [
        { label: 'AUSTRALIA', ...latLng(-28, 134) },
        { label: 'USA', ...latLng(38, -98) },
        { label: 'INDONESIA', ...latLng(-4, 118) },
        { label: 'BRAZIL', ...latLng(-15, -50) },
      ];
      regionCenters.forEach(r => {
        const positions = wrapX(r.x);
        const ry = r.y * h;
        positions.forEach(rx => {
          ctx.fillStyle = 'rgba(200, 210, 230, 0.35)';
          ctx.fillText(r.label, rx, ry);
        });
      });

      animFrame.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animFrame.current);
  }, [dims]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      borderRadius: 16,
      overflow: 'hidden',
      background: 'rgba(10, 12, 18, 0.95)',
      ...style,
    }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: dims.h || 'auto',
          aspectRatio: '2 / 1',
          display: 'block',
        }}
      />
      {/* Legend overlay */}
      <div style={{
        position: 'absolute',
        bottom: 8,
        left: 10,
        display: 'flex',
        gap: 12,
        alignItems: 'center',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: 'rgba(200,210,230,0.6)', fontFamily: 'var(--font-sans)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D4A017', display: 'inline-block' }} />
          Needs Prayer
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: 'rgba(200,210,230,0.6)', fontFamily: 'var(--font-sans)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFF8DC', display: 'inline-block' }} />
          Being Prayed For
        </span>
      </div>
    </div>
  );
}
