import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { ThinkingBlock, type ThinkingBlockData } from '../ThinkingBlock';

afterEach(() => {
  cleanup();
});

describe('ThinkingBlock', () => {
  it('renders the "Thinking..." label', () => {
    const block: ThinkingBlockData = { type: 'thinking', text: 'Some thought process' };
    render(<ThinkingBlock block={block} />);
    expect(screen.getByText('Thinking...')).toBeInTheDocument();
  });

  it('does not show thinking content by default (collapsed)', () => {
    const block: ThinkingBlockData = { type: 'thinking', text: 'Hidden thought' };
    render(<ThinkingBlock block={block} />);
    expect(screen.queryByText('Hidden thought')).not.toBeInTheDocument();
  });

  it('shows the right-pointing triangle when collapsed', () => {
    const block: ThinkingBlockData = { type: 'thinking', text: 'Some text' };
    render(<ThinkingBlock block={block} />);
    const icon = document.querySelector('.cb-thinking-icon');
    expect(icon?.textContent).toBe('\u25B6');
  });

  it('expands to show thinking content when the toggle is clicked', async () => {
    const block: ThinkingBlockData = { type: 'thinking', text: 'Detailed reasoning here' };
    render(<ThinkingBlock block={block} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Detailed reasoning here')).toBeInTheDocument();
  });

  it('shows the down-pointing triangle when expanded', async () => {
    const block: ThinkingBlockData = { type: 'thinking', text: 'Some text' };
    render(<ThinkingBlock block={block} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button'));

    const icon = document.querySelector('.cb-thinking-icon');
    expect(icon?.textContent).toBe('\u25BC');
  });

  it('collapses again when the toggle is clicked a second time', async () => {
    const block: ThinkingBlockData = { type: 'thinking', text: 'Toggle me' };
    render(<ThinkingBlock block={block} />);

    const user = userEvent.setup();
    const button = screen.getByRole('button');

    // Expand
    await user.click(button);
    expect(screen.getByText('Toggle me')).toBeInTheDocument();

    // Collapse
    await user.click(button);
    expect(screen.queryByText('Toggle me')).not.toBeInTheDocument();
  });

  it('handles empty text gracefully when expanded', async () => {
    const block: ThinkingBlockData = { type: 'thinking', text: '' };
    render(<ThinkingBlock block={block} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button'));

    const content = document.querySelector('.cb-thinking-content');
    expect(content).toBeInTheDocument();
    expect(content?.textContent).toBe('');
  });
});
