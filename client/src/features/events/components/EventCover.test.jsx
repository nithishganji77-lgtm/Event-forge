import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EventCover } from './EventCover.jsx';

describe('EventCover', () => {
  it('renders the uploaded cover as an <img> (never a CSS url())', () => {
    const { container } = render(<EventCover coverImage="https://cdn.example.com/a.jpg" category="Conference" />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/a.jpg');
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer');
    expect(screen.queryByTestId('generated-cover')).not.toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/url\(/);
  });

  it('draws a generated banner when the event has no cover', () => {
    const { container } = render(<EventCover coverImage="" category="Workshop" />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByTestId('generated-cover')).toBeInTheDocument();
  });

  it('falls back to the generated banner when the image fails to load', () => {
    const { container } = render(<EventCover coverImage="https://cdn.example.com/broken.jpg" category="Social" />);
    fireEvent.error(container.querySelector('img'));
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByTestId('generated-cover')).toBeInTheDocument();
  });

  it('uses the default banner for a category it has no art for', () => {
    render(<EventCover category="Something New" />);
    expect(screen.getByTestId('generated-cover')).toBeInTheDocument();
  });

  it('renders children (the status badge) over either kind of cover', () => {
    render(
      <EventCover coverImage="" category="Webinar">
        <span>Badge</span>
      </EventCover>
    );
    expect(screen.getByText('Badge')).toBeInTheDocument();
  });
});
