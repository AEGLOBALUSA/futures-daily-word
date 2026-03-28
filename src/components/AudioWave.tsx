/**
 * AudioWave — animated equalizer bars that visually indicate audio is playing.
 * Pure CSS animation, no JS overhead.
 */

interface AudioWaveProps {
  /** Number of bars */
  bars?: number;
  /** Height of the tallest bar in px */
  height?: number;
  /** Bar color — defaults to currentColor */
  color?: string;
}

export function AudioWave({ bars = 4, height = 14, color = 'currentColor' }: AudioWaveProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'flex-end',
        gap: 2,
        height,
      }}
    >
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 3,
            borderRadius: 1.5,
            background: color,
            animation: `dw-wave 1s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes dw-wave {
          0%, 100% { height: 25%; }
          50% { height: 100%; }
        }
      `}</style>
    </span>
  );
}
