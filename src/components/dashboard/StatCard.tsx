import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatCard = ({ title, value, icon: Icon, trend }: StatCardProps) => {
  return (
    <div className="bg-background border rounded-lg p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold mt-1">{value}</p>

          {trend && (
            <p
              className={cn(
                "text-xs mt-2",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}
            >
              {trend.isPositive ? "+" : "-"}
              {Math.abs(trend.value)}% from last month
            </p>
          )}
        </div>

        <div className="p-2 rounded-md bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
