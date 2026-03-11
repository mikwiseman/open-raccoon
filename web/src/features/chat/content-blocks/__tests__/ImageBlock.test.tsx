import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ImageBlock, type ImageBlockData } from '../ImageBlock';

describe('ImageBlock', () => {
  it('renders an img element with the correct src', () => {
    const block: ImageBlockData = {
      type: 'image',
      url: 'https://cdn.example.com/photo.jpg',
    };

    render(<ImageBlock block={block} />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/photo.jpg');
  });

  it('uses the provided alt text', () => {
    const block: ImageBlockData = {
      type: 'image',
      url: 'https://cdn.example.com/photo.jpg',
      alt: 'A scenic mountain view',
    };

    render(<ImageBlock block={block} />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', 'A scenic mountain view');
  });

  it('defaults alt text to "Image" when alt is not provided', () => {
    const block: ImageBlockData = {
      type: 'image',
      url: 'https://cdn.example.com/photo.jpg',
    };

    render(<ImageBlock block={block} />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', 'Image');
  });

  it('sets width and height attributes when provided', () => {
    const block: ImageBlockData = {
      type: 'image',
      url: 'https://cdn.example.com/photo.jpg',
      width: 800,
      height: 600,
    };

    render(<ImageBlock block={block} />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('width', '800');
    expect(img).toHaveAttribute('height', '600');
  });

  it('shows loading spinner before image loads', () => {
    const block: ImageBlockData = {
      type: 'image',
      url: 'https://cdn.example.com/photo.jpg',
    };

    const { container } = render(<ImageBlock block={block} />);

    const spinner = container.querySelector('.cb-image-loading-spinner');
    expect(spinner).toBeInTheDocument();

    // Image should have the hidden class before loading
    const img = screen.getByRole('img');
    expect(img).toHaveClass('cb-image-hidden');
  });

  it('hides loading spinner and shows image after onLoad fires', () => {
    const block: ImageBlockData = {
      type: 'image',
      url: 'https://cdn.example.com/photo.jpg',
    };

    const { container } = render(<ImageBlock block={block} />);

    const img = screen.getByRole('img');
    fireEvent.load(img);

    // Spinner should be gone
    const spinner = container.querySelector('.cb-image-loading-spinner');
    expect(spinner).not.toBeInTheDocument();

    // Image should now have the loaded class
    expect(img).toHaveClass('cb-image-loaded');
    expect(img).not.toHaveClass('cb-image-hidden');
  });

  it('shows error state when image fails to load', () => {
    const block: ImageBlockData = {
      type: 'image',
      url: 'https://cdn.example.com/broken.jpg',
    };

    const { container } = render(<ImageBlock block={block} />);

    const img = screen.getByRole('img');
    fireEvent.error(img);

    // Error message should be shown
    expect(screen.getByText('Failed to load image')).toBeInTheDocument();

    // Error wrapper should have the error class
    const errorDiv = container.querySelector('.cb-image-error');
    expect(errorDiv).toBeInTheDocument();

    // The img element should no longer be rendered
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows the warning icon in error state', () => {
    const block: ImageBlockData = {
      type: 'image',
      url: 'https://cdn.example.com/broken.jpg',
    };

    const { container } = render(<ImageBlock block={block} />);

    const img = screen.getByRole('img');
    fireEvent.error(img);

    const icon = container.querySelector('.cb-image-error-icon');
    expect(icon).toBeInTheDocument();
    expect(icon?.textContent).toBe('\\u26A0'); // literal escape sequence in JSX text
  });

  it('renders inside a .cb-image-block wrapper', () => {
    const block: ImageBlockData = {
      type: 'image',
      url: 'https://cdn.example.com/photo.jpg',
    };

    const { container } = render(<ImageBlock block={block} />);

    const wrapper = container.querySelector('.cb-image-block');
    expect(wrapper).toBeInTheDocument();
  });
});
