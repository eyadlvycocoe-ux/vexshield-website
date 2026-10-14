import { LucideIcon  } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export function StatsCard({ title, value, icon: Icon, trend, trendUp, className = "" }: StatsCardProps) {
  return (
    <div className={`gaming-card-glow p-6 fade-in-up relative overflow-hidden ${className}`}>
      <div className="flex items-center justify-between relative z-10">
        <div className="flex-1">
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-bold stat-number mt-2 text-neon">{value}</p>
          {trend && (
            <div className="flex items-center mt-2">
              <div className={`w-2 h-2 rounded-full mr-2 ${trendUp ? 'bg-success pulse-glow' : 'bg-destructive'}`}></div>
              <p className={`text-xs font-medium ${trendUp ? 'text-success' : 'text-destructive'}`}>
                {trend}
              </p>
            </div>
          )}
        </div>
        <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center border border-primary/20 float">
          <Icon className="w-8 h-8 text-primary" />
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent rounded-lg pointer-events-none"></div>
    </div>
  );
}