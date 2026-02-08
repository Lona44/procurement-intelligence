"use client";

interface ProgressBarProps {
  progress: number;
  color: string;
}

export default function ProgressBar({ progress, color }: ProgressBarProps) {
  return (
    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{
          width: `${progress}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}
