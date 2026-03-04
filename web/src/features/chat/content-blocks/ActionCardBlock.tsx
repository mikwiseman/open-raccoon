"use client";

export type ActionButton = {
  label: string;
  action: string;
  variant?: "primary" | "secondary" | "danger";
};

export type ActionCardBlockData = {
  type: "action_card";
  title: string;
  description?: string;
  buttons: ActionButton[];
  onAction?: (action: string) => void;
};

export function ActionCardBlock({ block }: { block: ActionCardBlockData }) {
  return (
    <div className="cb-action-card">
      <div className="cb-action-card-title">{block.title}</div>
      {block.description && (
        <p className="cb-action-card-description">{block.description}</p>
      )}
      {block.buttons.length > 0 && (
        <div className="cb-action-card-buttons">
          {block.buttons.map((btn, i) => {
            const variantClass =
              btn.variant === "primary"
                ? "cb-action-btn-primary"
                : btn.variant === "danger"
                  ? "cb-action-btn-danger"
                  : "cb-action-btn-secondary";

            return (
              <button
                key={i}
                type="button"
                className={`cb-action-btn ${variantClass}`}
                onClick={() => block.onAction?.(btn.action)}
              >
                {btn.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
