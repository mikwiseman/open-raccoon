import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressBlock, type ProgressBlockData } from '../ProgressBlock';

describe('ProgressBlock', () => {
  it('renders all steps with their labels', () => {
    const block: ProgressBlockData = {
      type: 'progress',
      steps: [
        { label: 'Fetching data', status: 'done' },
        { label: 'Processing', status: 'active' },
        { label: 'Summarizing', status: 'pending' },
      ],
    };

    render(<ProgressBlock block={block} />);

    expect(screen.getByText('Fetching data')).toBeInTheDocument();
    expect(screen.getByText('Processing')).toBeInTheDocument();
    expect(screen.getByText('Summarizing')).toBeInTheDocument();
  });

  it('shows the correct icon for each step status', () => {
    const block: ProgressBlockData = {
      type: 'progress',
      steps: [
        { label: 'Step done', status: 'done' },
        { label: 'Step active', status: 'active' },
        { label: 'Step pending', status: 'pending' },
        { label: 'Step error', status: 'error' },
      ],
    };

    const { container } = render(<ProgressBlock block={block} />);

    const icons = container.querySelectorAll('.cb-progress-step-icon');
    expect(icons).toHaveLength(4);
    expect(icons[0].textContent).toBe('\u2713'); // checkmark for done
    expect(icons[1].textContent).toBe('\u25CF'); // filled circle for active
    expect(icons[2].textContent).toBe('\u25CB'); // empty circle for pending
    expect(icons[3].textContent).toBe('\u2717'); // X for error
  });

  it('applies the correct CSS class per step status', () => {
    const block: ProgressBlockData = {
      type: 'progress',
      steps: [
        { label: 'A', status: 'done' },
        { label: 'B', status: 'active' },
        { label: 'C', status: 'pending' },
        { label: 'D', status: 'error' },
      ],
    };

    const { container } = render(<ProgressBlock block={block} />);

    const items = container.querySelectorAll('li');
    expect(items[0]).toHaveClass('cb-progress-step-done');
    expect(items[1]).toHaveClass('cb-progress-step-active');
    expect(items[2]).toHaveClass('cb-progress-step-pending');
    expect(items[3]).toHaveClass('cb-progress-step-error');
  });

  it('highlights the current active step distinctly from done and pending', () => {
    const block: ProgressBlockData = {
      type: 'progress',
      steps: [
        { label: 'First', status: 'done' },
        { label: 'Second', status: 'active' },
        { label: 'Third', status: 'pending' },
      ],
    };

    const { container } = render(<ProgressBlock block={block} />);

    const activeStep = container.querySelector('.cb-progress-step-active');
    expect(activeStep).toBeInTheDocument();
    expect(activeStep?.textContent).toContain('Second');

    // Verify active step is different from done and pending
    const doneStep = container.querySelector('.cb-progress-step-done');
    const pendingStep = container.querySelector('.cb-progress-step-pending');
    expect(doneStep).not.toBe(activeStep);
    expect(pendingStep).not.toBe(activeStep);
  });

  it('handles empty steps array without crashing', () => {
    const block: ProgressBlockData = {
      type: 'progress',
      steps: [],
    };

    const { container } = render(<ProgressBlock block={block} />);

    const items = container.querySelectorAll('li');
    expect(items).toHaveLength(0);

    // The wrapper should still render
    const wrapper = container.querySelector('.cb-progress-block');
    expect(wrapper).toBeInTheDocument();
  });

  it('renders a single step correctly', () => {
    const block: ProgressBlockData = {
      type: 'progress',
      steps: [{ label: 'Only step', status: 'active' }],
    };

    render(<ProgressBlock block={block} />);

    expect(screen.getByText('Only step')).toBeInTheDocument();
  });

  it('renders the steps inside a <ul> list', () => {
    const block: ProgressBlockData = {
      type: 'progress',
      steps: [
        { label: 'A', status: 'done' },
        { label: 'B', status: 'pending' },
      ],
    };

    const { container } = render(<ProgressBlock block={block} />);

    const ul = container.querySelector('ul.cb-progress-steps');
    expect(ul).toBeInTheDocument();
    expect(ul?.querySelectorAll('li')).toHaveLength(2);
  });
});
