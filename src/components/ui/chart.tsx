import * as React from "react";
import * as Recharts from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode;
    color?: string;
  };
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used inside ChartContainer");
  }
  return context;
}

/* ---------------------------------------------
   Chart Container
--------------------------------------------- */
const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ReactNode;
  }
>(({ className, children, config, ...props }, ref) => {
  return (
    <ChartContext.Provider value={{ config }}>
      <div
        ref={ref}
        className={cn(
          "w-full h-[260px] bg-background border rounded-lg p-4",
          className
        )}
        {...props}
      >
        <Recharts.ResponsiveContainer width="100%" height="100%">
          {children}
        </Recharts.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "ChartContainer";

/* ---------------------------------------------
   Tooltip
--------------------------------------------- */
const ChartTooltip = Recharts.Tooltip;

const ChartTooltipContent = ({
  active,
  payload,
  label,
}: Recharts.TooltipProps<any, any>) => {
  const { config } = useChart();

  if (!active || !payload?.length) return null;

  return (
    <div className="bg-background border rounded-md px-3 py-2 text-xs shadow">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((item, index) => {
        const cfg = config[item.dataKey as string];
        return (
          <div key={index} className="flex justify-between gap-4">
            <span className="text-muted-foreground">
              {cfg?.label || item.name}
            </span>
            <span className="font-medium">{item.value}</span>
          </div>
        );
      })}
    </div>
  );
};

/* ---------------------------------------------
   Legend (simple)
--------------------------------------------- */
const ChartLegend = Recharts.Legend;

const ChartLegendContent = ({ payload }: Recharts.LegendProps) => {
  if (!payload?.length) return null;

  return (
    <div className="flex gap-4 justify-center text-xs mt-2">
      {payload.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          <span>{item.value}</span>
        </div>
      ))}
    </div>
  );
};

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
};
