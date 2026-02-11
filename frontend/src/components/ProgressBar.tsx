"use client";

interface ProgressBarProps {
  progress: number;
  color: string;
}

export default function ProgressBar({ progress, color }: ProgressBarProps) {
  return (
    <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden shadow-[inset_0_1px_2px_0_rgb(0_0_0/0.06)]">
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{
          width: `${progress}%`,
          backgroundColor: color,
          opacity: progress > 0 ? 0.8 : 0,
        }}
      />
    </div>
  );
}
