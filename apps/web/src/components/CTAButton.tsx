import { Button } from "@/components/ui/button";

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
    return (
      <a href={href}>
        <Button variant={variant} disabled={disabled} className={className}>
          {label}
        </Button>
      </a>
    );
  }

  return (
    <Button
      variant={variant}
      disabled={disabled}
      onClick={onClick}
      className={className}
    >
      {label}
    </Button>
  );
}
