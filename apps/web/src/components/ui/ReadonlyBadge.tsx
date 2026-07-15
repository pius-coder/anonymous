import { Eye } from "lucide-react";

export function ReadonlyBadge({ label = "Lecture seule" }: { label?: string }) {
  return (
    <span className="readonly-badge">
      <Eye aria-hidden="true" size={16} />
      {label}
    </span>
  );
}

