import { cn } from "@/lib/utils";

interface TextShimmerProps {
  children: string;
  className?: string;
}

export function TextShimmer({ children, className }: TextShimmerProps) {
  return (
    <span
      className={cn(
        "inline-block bg-[length:250%_100%] bg-clip-text text-transparent",
        "bg-gradient-to-r from-cyan-300 via-white to-violet-300",
        "[animation:shimmer_3.5s_ease-in-out_infinite]",
        className,
      )}
    >
      {children}
    </span>
  );
}
