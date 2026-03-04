"use client";

import { PlanCard } from "./PlanCard";
import { UsageBars } from "./UsageBars";

type Props = {
  currentPlan?: string;
  usage?: {
    agents: { used: number; limit: number };
    executions: { used: number; limit: number };
    tokens: { used: number; limit: number };
  };
};

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "3 agents",
      "100 executions/month",
      "50,000 tokens/month",
      "Community support",
      "Public marketplace",
    ],
    ctaLabel: "Get Started",
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    highlighted: true,
    features: [
      "Unlimited agents",
      "10,000 executions/month",
      "5,000,000 tokens/month",
      "All integrations",
      "Priority support",
      "Custom MCP servers",
      "Scheduling",
    ],
    ctaLabel: "Upgrade to Pro",
  },
  {
    name: "Team",
    price: "$49",
    period: "/user/month",
    features: [
      "Everything in Pro",
      "Unlimited executions",
      "Unlimited tokens",
      "Team workspace",
      "Admin controls",
      "SSO/SAML",
      "Dedicated support",
    ],
    ctaLabel: "Contact Sales",
  },
];

export function PricingView({ currentPlan = "free", usage }: Props) {
  return (
    <div className="pr-pricing-view" aria-label="pricing-view">
      <div className="pr-header">
        <h2 className="pr-title">Plans &amp; Pricing</h2>
        <p className="pr-subtitle">Choose the plan that fits your needs.</p>
      </div>

      <div className="pr-plans-grid">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.name}
            name={plan.name}
            price={plan.price}
            period={plan.period}
            features={plan.features}
            highlighted={plan.highlighted}
            current={currentPlan.toLowerCase() === plan.name.toLowerCase()}
            ctaLabel={plan.ctaLabel}
            onSelect={() => {
              // Stripe checkout integration will go here
            }}
          />
        ))}
      </div>

      {usage && (
        <div className="pr-usage-section">
          <h3 className="pr-usage-title">Current Usage</h3>
          <UsageBars
            items={[
              { label: "Agents", used: usage.agents.used, limit: usage.agents.limit },
              { label: "Executions", used: usage.executions.used, limit: usage.executions.limit, unit: "this month" },
              { label: "Tokens", used: usage.tokens.used, limit: usage.tokens.limit, unit: "tokens" },
            ]}
          />
        </div>
      )}
    </div>
  );
}
