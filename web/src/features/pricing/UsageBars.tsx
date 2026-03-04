"use client";

type UsageItem = {
  label: string;
  used: number;
  limit: number;
  unit?: string;
};

type Props = {
  items: UsageItem[];
};

export function UsageBars({ items }: Props) {
  return (
    <div className="pr-usage-bars" aria-label="usage-bars">
      {items.map((item) => {
        const percent = item.limit > 0 ? Math.min(100, (item.used / item.limit) * 100) : 0;
        const isHigh = percent > 80;
        return (
          <div key={item.label} className="pr-usage-item">
            <div className="pr-usage-header">
              <span className="pr-usage-label">{item.label}</span>
              <span className="pr-usage-count">
                {item.used.toLocaleString()} / {item.limit.toLocaleString()}
                {item.unit ? ` ${item.unit}` : ""}
              </span>
            </div>
            <div className="pr-usage-track">
              <div
                className={`pr-usage-fill ${isHigh ? "pr-usage-high" : ""}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
