import { minidenticon } from "minidenticons";
import { cn } from "@/lib/utils";

type PixelAvatarProps = {
  seed: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function PixelAvatar({ seed, size = "md", className }: PixelAvatarProps) {
  return (
    <span
      className={cn("pixel-avatar", `pixel-avatar--${size}`, className)}
      role="img"
      aria-label={`Avatar de ${seed}`}
      dangerouslySetInnerHTML={{ __html: minidenticon(seed, 86, 58) }}
    />
  );
}
