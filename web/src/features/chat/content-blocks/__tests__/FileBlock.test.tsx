import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { FileBlock, type FileBlockData } from '../FileBlock';

afterEach(() => {
  cleanup();
});

describe('FileBlock', () => {
  it('renders a file with name and size', () => {
    const block: FileBlockData = {
      type: 'file',
      url: 'https://cdn.example.com/doc.pdf',
      name: 'doc.pdf',
      size: 1024,
    };
    render(<FileBlock block={block} />);
    expect(screen.getByText('doc.pdf')).toBeInTheDocument();
    expect(screen.getByText('1.0 KB')).toBeInTheDocument();
  });

  it('renders a file without size', () => {
    const block: FileBlockData = {
      type: 'file',
      url: 'https://cdn.example.com/readme.txt',
      name: 'readme.txt',
    };
    render(<FileBlock block={block} />);
    expect(screen.getByText('readme.txt')).toBeInTheDocument();
  });

  it('renders the correct download link', () => {
    const block: FileBlockData = {
      type: 'file',
      url: 'https://cdn.example.com/file.zip',
      name: 'file.zip',
      size: 1048576,
    };
    const { container } = render(<FileBlock block={block} />);
    const link = container.querySelector('a');
    expect(link).toBeInTheDocument();
    expect(link?.getAttribute('href')).toBe('https://cdn.example.com/file.zip');
    expect(link?.getAttribute('download')).toBe('file.zip');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('formats bytes correctly', () => {
    const render500B: FileBlockData = { type: 'file', url: '#', name: 'small.txt', size: 500 };
    const { unmount: u1 } = render(<FileBlock block={render500B} />);
    expect(screen.getByText('500 B')).toBeInTheDocument();
    u1();
  });

  it('formats KB correctly', () => {
    const block: FileBlockData = { type: 'file', url: '#', name: 'medium.txt', size: 2048 };
    render(<FileBlock block={block} />);
    expect(screen.getByText('2.0 KB')).toBeInTheDocument();
  });

  it('formats MB correctly', () => {
    const block: FileBlockData = {
      type: 'file',
      url: '#',
      name: 'large.bin',
      size: 5 * 1024 * 1024,
    };
    render(<FileBlock block={block} />);
    expect(screen.getByText('5.0 MB')).toBeInTheDocument();
  });

  it('formats GB correctly', () => {
    const block: FileBlockData = {
      type: 'file',
      url: '#',
      name: 'huge.iso',
      size: 2 * 1024 * 1024 * 1024,
    };
    render(<FileBlock block={block} />);
    expect(screen.getByText('2.0 GB')).toBeInTheDocument();
  });

  it('shows pdf icon for pdf files', () => {
    const block: FileBlockData = { type: 'file', url: '#', name: 'report.pdf' };
    const { container } = render(<FileBlock block={block} />);
    const icon = container.querySelector('.cb-file-icon');
    expect(icon?.textContent).toBe('\uD83D\uDCC4');
  });

  it('shows archive icon for zip files', () => {
    const block: FileBlockData = { type: 'file', url: '#', name: 'archive.zip' };
    const { container } = render(<FileBlock block={block} />);
    const icon = container.querySelector('.cb-file-icon');
    expect(icon?.textContent).toBe('\uD83D\uDCE6');
  });

  it('shows image icon for image mime type', () => {
    const block: FileBlockData = {
      type: 'file',
      url: '#',
      name: 'photo.webp',
      mimeType: 'image/webp',
    };
    const { container } = render(<FileBlock block={block} />);
    const icon = container.querySelector('.cb-file-icon');
    expect(icon?.textContent).toBe('\uD83D\uDDBC');
  });

  it('shows code icon for source files', () => {
    const block: FileBlockData = { type: 'file', url: '#', name: 'index.ts' };
    const { container } = render(<FileBlock block={block} />);
    const icon = container.querySelector('.cb-file-icon');
    expect(icon?.textContent).toBe('\uD83D\uDCBB');
  });

  it('shows default icon for unknown extensions', () => {
    const block: FileBlockData = { type: 'file', url: '#', name: 'data.xyz' };
    const { container } = render(<FileBlock block={block} />);
    const icon = container.querySelector('.cb-file-icon');
    expect(icon?.textContent).toBe('\uD83D\uDCC1');
  });
});
