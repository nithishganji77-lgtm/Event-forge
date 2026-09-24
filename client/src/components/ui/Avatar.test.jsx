import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Avatar, getInitials } from './Avatar.jsx';

describe('getInitials', () => {
  it('uses the first letter of the first and last word', () => {
    expect(getInitials('Nithish Ganji')).toBe('NG');
    expect(getInitials('Ava Marie Sharma')).toBe('AS');
    expect(getInitials('cher')).toBe('C');
  });

  it('never returns an empty string', () => {
    expect(getInitials('')).toBe('?');
    expect(getInitials('   ')).toBe('?');
    expect(getInitials(undefined)).toBe('?');
  });
});

describe('Avatar', () => {
  it('shows initials when there is no photo, and is decorative by default', () => {
    const { container } = render(<Avatar name="Nithish Ganji" />);
    expect(screen.getByText('NG')).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders the photo without leaking the referrer', () => {
    const { container } = render(<Avatar name="Ava Sharma" src="https://example.com/a.png" />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://example.com/a.png');
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer');
  });

  it('falls back to initials when the photo fails to load', () => {
    const { container } = render(<Avatar name="Ava Sharma" src="https://example.com/broken.png" />);
    fireEvent.error(container.querySelector('img'));
    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(screen.getByText('AS')).toBeInTheDocument();
  });

  it('is announced as an image with a name when it stands alone', () => {
    render(<Avatar name="Ava Sharma" label="Ava Sharma" />);
    expect(screen.getByRole('img', { name: 'Ava Sharma' })).toBeInTheDocument();
  });
});
