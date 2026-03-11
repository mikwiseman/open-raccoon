import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

// Inline import of the component
import { TableBlock, type TableBlockData } from '../TableBlock';

afterEach(() => {
  cleanup();
});

describe('TableBlock', () => {
  it('renders a table with headers and rows', () => {
    const block: TableBlockData = {
      type: 'table',
      headers: ['Name', 'Age', 'City'],
      rows: [
        ['Alice', '30', 'NYC'],
        ['Bob', '25', 'LA'],
      ],
    };
    render(<TableBlock block={block} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();
    expect(screen.getByText('City')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('NYC')).toBeInTheDocument();
  });

  it('renders an empty table with headers but no rows', () => {
    const block: TableBlockData = {
      type: 'table',
      headers: ['Col1', 'Col2'],
      rows: [],
    };
    const { container } = render(<TableBlock block={block} />);
    expect(screen.getByText('Col1')).toBeInTheDocument();
    expect(screen.getByText('Col2')).toBeInTheDocument();
    const tbody = container.querySelector('tbody');
    expect(tbody?.children.length).toBe(0);
  });

  it('renders a table with empty headers and rows', () => {
    const block: TableBlockData = {
      type: 'table',
      headers: [],
      rows: [],
    };
    const { container } = render(<TableBlock block={block} />);
    const table = container.querySelector('table');
    expect(table).toBeInTheDocument();
  });

  it('renders the correct number of rows', () => {
    const block: TableBlockData = {
      type: 'table',
      headers: ['X'],
      rows: [['a'], ['b'], ['c']],
    };
    const { container } = render(<TableBlock block={block} />);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(3);
  });

  it('renders the correct number of columns', () => {
    const block: TableBlockData = {
      type: 'table',
      headers: ['A', 'B', 'C'],
      rows: [['1', '2', '3']],
    };
    const { container } = render(<TableBlock block={block} />);
    const headerCells = container.querySelectorAll('th');
    expect(headerCells.length).toBe(3);
    const bodyCells = container.querySelectorAll('td');
    expect(bodyCells.length).toBe(3);
  });
});
