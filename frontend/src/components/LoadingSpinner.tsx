interface LoadingSpinnerProps {
  size?: "sm" | "md";
  label?: string;
}

export default function LoadingSpinner({ size = "md", label }: LoadingSpinnerProps) {
  const dim = size === "sm" ? "w-4 h-4" : "w-6 h-6";
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`${dim} border-2 border-indigo-400 border-t-transparent rounded-full animate-spin`}
      />
      {label && <p className="text-sm text-zinc-500">{label}</p>}
    </div>
  );
}
