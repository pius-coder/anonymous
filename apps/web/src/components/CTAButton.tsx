import Link from "next/link";
import { buttonVariants } from "@/components/retroui/button";
import { cn } from "@/lib/utils";

interface CTAButtonProps {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "outline" | "secondary";
  disabled?: boolean;
  className?: string;
}

export function CTAButton({
  label,
  href,
  onClick,
  variant = "default",
  disabled = false,
  className,
}: CTAButtonProps) {
  if (href) {
    const linkClassName = cn(buttonVariants({ variant }), className);

    if (disabled) {
      return (
        <span aria-disabled="true" className={cn(linkClassName, "pointer-events-none opacity-60")}>
          {label}
        </span>
      );
    }

    return (
      <Link href={href} className={linkClassName}>
        {label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(buttonVariants({ variant }), className)}
    >
      {label}
    </button>
  );
}
