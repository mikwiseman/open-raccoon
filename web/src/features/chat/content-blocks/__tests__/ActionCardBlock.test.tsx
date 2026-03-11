import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActionCardBlock, type ActionCardBlockData } from '../ActionCardBlock';

afterEach(() => {
  cleanup();
});

describe('ActionCardBlock', () => {
  it('renders the title', () => {
    const block: ActionCardBlockData = {
      type: 'action_card',
      title: 'Choose an option',
      buttons: [],
    };
    render(<ActionCardBlock block={block} />);
    expect(screen.getByText('Choose an option')).toBeInTheDocument();
  });

  it('renders the description when present', () => {
    const block: ActionCardBlockData = {
      type: 'action_card',
      title: 'Test',
      description: 'Pick one of the following:',
      buttons: [],
    };
    render(<ActionCardBlock block={block} />);
    expect(screen.getByText('Pick one of the following:')).toBeInTheDocument();
  });

  it('does not render description when absent', () => {
    const block: ActionCardBlockData = {
      type: 'action_card',
      title: 'Test',
      buttons: [],
    };
    const { container } = render(<ActionCardBlock block={block} />);
    expect(container.querySelector('.cb-action-card-description')).not.toBeInTheDocument();
  });

  it('renders buttons with labels', () => {
    const block: ActionCardBlockData = {
      type: 'action_card',
      title: 'Test',
      buttons: [
        { label: 'Option A', action: 'select_a' },
        { label: 'Option B', action: 'select_b' },
      ],
    };
    render(<ActionCardBlock block={block} />);
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
  });

  it('calls onAction with the correct action string when clicked', () => {
    const onAction = vi.fn();
    const block: ActionCardBlockData = {
      type: 'action_card',
      title: 'Test',
      buttons: [
        { label: 'Go', action: 'go_action' },
      ],
      onAction,
    };
    render(<ActionCardBlock block={block} />);
    fireEvent.click(screen.getByText('Go'));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith('go_action');
  });

  it('applies the correct variant class for primary buttons', () => {
    const block: ActionCardBlockData = {
      type: 'action_card',
      title: 'Test',
      buttons: [{ label: 'Primary', action: 'p', variant: 'primary' }],
    };
    const { container } = render(<ActionCardBlock block={block} />);
    const btn = container.querySelector('button');
    expect(btn?.className).toContain('cb-action-btn-primary');
  });

  it('applies the correct variant class for danger buttons', () => {
    const block: ActionCardBlockData = {
      type: 'action_card',
      title: 'Test',
      buttons: [{ label: 'Delete', action: 'd', variant: 'danger' }],
    };
    const { container } = render(<ActionCardBlock block={block} />);
    const btn = container.querySelector('button');
    expect(btn?.className).toContain('cb-action-btn-danger');
  });

  it('defaults to secondary variant for buttons without variant', () => {
    const block: ActionCardBlockData = {
      type: 'action_card',
      title: 'Test',
      buttons: [{ label: 'Default', action: 'def' }],
    };
    const { container } = render(<ActionCardBlock block={block} />);
    const btn = container.querySelector('button');
    expect(btn?.className).toContain('cb-action-btn-secondary');
  });

  it('does not render buttons container when buttons array is empty', () => {
    const block: ActionCardBlockData = {
      type: 'action_card',
      title: 'No Buttons',
      buttons: [],
    };
    const { container } = render(<ActionCardBlock block={block} />);
    expect(container.querySelector('.cb-action-card-buttons')).not.toBeInTheDocument();
  });

  it('handles click without onAction callback gracefully', () => {
    const block: ActionCardBlockData = {
      type: 'action_card',
      title: 'Test',
      buttons: [{ label: 'Click Me', action: 'test' }],
    };
    render(<ActionCardBlock block={block} />);
    // Should not throw
    fireEvent.click(screen.getByText('Click Me'));
  });
});
