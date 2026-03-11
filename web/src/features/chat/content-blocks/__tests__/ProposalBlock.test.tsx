import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProposalBlock, type ProposalBlockData } from '../ProposalBlock';

afterEach(() => {
  cleanup();
});

describe('ProposalBlock', () => {
  it('renders the title', () => {
    const block: ProposalBlockData = {
      type: 'proposal',
      title: 'Deploy to production?',
      status: 'pending',
    };
    render(<ProposalBlock block={block} />);
    expect(screen.getByText('Deploy to production?')).toBeInTheDocument();
  });

  it('renders the status badge for pending', () => {
    const block: ProposalBlockData = {
      type: 'proposal',
      title: 'Test',
      status: 'pending',
    };
    render(<ProposalBlock block={block} />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders the status badge for approved', () => {
    const block: ProposalBlockData = {
      type: 'proposal',
      title: 'Test',
      status: 'approved',
    };
    render(<ProposalBlock block={block} />);
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('renders the status badge for rejected', () => {
    const block: ProposalBlockData = {
      type: 'proposal',
      title: 'Test',
      status: 'rejected',
    };
    render(<ProposalBlock block={block} />);
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('renders the description when present', () => {
    const block: ProposalBlockData = {
      type: 'proposal',
      title: 'Test',
      status: 'pending',
      description: 'This is a detailed description.',
    };
    render(<ProposalBlock block={block} />);
    expect(screen.getByText('This is a detailed description.')).toBeInTheDocument();
  });

  it('does not render description when absent', () => {
    const block: ProposalBlockData = {
      type: 'proposal',
      title: 'Test',
      status: 'pending',
    };
    const { container } = render(<ProposalBlock block={block} />);
    expect(container.querySelector('.cb-proposal-description')).not.toBeInTheDocument();
  });

  it('renders approve/reject buttons when pending with callbacks', () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    const block: ProposalBlockData = {
      type: 'proposal',
      title: 'Test',
      status: 'pending',
      onApprove,
      onReject,
    };
    render(<ProposalBlock block={block} />);
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });

  it('calls onApprove when approve button is clicked', () => {
    const onApprove = vi.fn();
    const block: ProposalBlockData = {
      type: 'proposal',
      title: 'Test',
      status: 'pending',
      onApprove,
    };
    render(<ProposalBlock block={block} />);
    fireEvent.click(screen.getByText('Approve'));
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it('calls onReject when reject button is clicked', () => {
    const onReject = vi.fn();
    const block: ProposalBlockData = {
      type: 'proposal',
      title: 'Test',
      status: 'pending',
      onReject,
    };
    render(<ProposalBlock block={block} />);
    fireEvent.click(screen.getByText('Reject'));
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('does not render action buttons when status is approved', () => {
    const onApprove = vi.fn();
    const block: ProposalBlockData = {
      type: 'proposal',
      title: 'Test',
      status: 'approved',
      onApprove,
    };
    render(<ProposalBlock block={block} />);
    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
  });

  it('does not render action buttons when status is rejected', () => {
    const onReject = vi.fn();
    const block: ProposalBlockData = {
      type: 'proposal',
      title: 'Test',
      status: 'rejected',
      onReject,
    };
    render(<ProposalBlock block={block} />);
    expect(screen.queryByText('Reject')).not.toBeInTheDocument();
  });

  it('does not render action buttons when no callbacks provided', () => {
    const block: ProposalBlockData = {
      type: 'proposal',
      title: 'Test',
      status: 'pending',
    };
    const { container } = render(<ProposalBlock block={block} />);
    expect(container.querySelector('.cb-proposal-actions')).not.toBeInTheDocument();
  });
});
