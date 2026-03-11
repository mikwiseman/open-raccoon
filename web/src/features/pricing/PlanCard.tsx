'use client';

type Props = {
  name: string;
  price: string;
  period: string;
  features: string[];
  highlighted?: boolean;
  current?: boolean;
  ctaLabel: string;
  onSelect: () => void;
};

export function PlanCard({
  name,
  price,
  period,
  features,
  highlighted,
  current,
  ctaLabel,
  onSelect,
}: Props) {
  return (
    <div
      className={`pr-plan-card ${highlighted ? 'pr-plan-highlighted' : ''} ${current ? 'pr-plan-current' : ''}`}
    >
      {current && <span className="pr-plan-badge">Current Plan</span>}
      <h3 className="pr-plan-name">{name}</h3>
      <div className="pr-plan-price">
        <span className="pr-plan-amount">{price}</span>
        <span className="pr-plan-period">{period}</span>
      </div>
      <ul className="pr-plan-features">
        {features.map((feature) => (
          <li key={feature} className="pr-plan-feature">
            {feature}
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={`ab-btn ${highlighted ? 'ab-btn-primary' : 'ab-btn-secondary'} pr-plan-cta`}
        onClick={onSelect}
        disabled={current}
      >
        {current ? 'Current' : ctaLabel}
      </button>
    </div>
  );
}
