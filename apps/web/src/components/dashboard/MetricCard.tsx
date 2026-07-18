import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function MetricCard({
  label,
  value,
  detail,
  trend,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  trend?: "up" | "down" | "neutral";
  icon: LucideIcon;
}) {
  const TrendIcon = trend === "down" ? ArrowDownRight : ArrowUpRight;
  return (
    <Card size="sm" className="metric-card">
      <CardContent>
        <div className="metric-topline">
          <span className="metric-icon"><Icon /></span>
          {trend && trend !== "neutral" ? <TrendIcon className={`metric-trend metric-trend--${trend}`} /> : null}
        </div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{detail}</small>
      </CardContent>
    </Card>
  );
}
