import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { server } from '../../../../tests/mocks/server.js';
import { createTestQueryClient } from '../../../../tests/test-utils.jsx';
import { RegisterForm } from './RegisterForm.jsx';

const BASE = 'http://localhost:4000/api/v1';

function renderForm() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter><RegisterForm /></MemoryRouter>
    </QueryClientProvider>
  );
}

async function fillAndSubmit(user) {
  await user.type(screen.getByLabelText('Full name'), 'Riya Kapoor');
  await user.type(screen.getByLabelText('Email'), 'riya@example.com');
  await user.type(screen.getByLabelText('Password'), 'Test@1234');
  await user.click(screen.getByRole('button', { name: /create account/i }));
}

describe('RegisterForm errors', () => {
  it('says what to fix beside the field, in words, before anything is sent', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText('Enter your full name (at least 2 characters)')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
  });

  it('puts "an account with this email already exists" on the email field, with no banner repeating it', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${BASE}/auth/register`, () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: 'CONFLICT',
              message: 'An account with this email already exists. Try signing in instead.',
              details: [{ path: 'email', message: 'An account with this email already exists. Try signing in instead.' }],
            },
          },
          { status: 409 }
        )
      )
    );
    renderForm();
    await fillAndSubmit(user);

    const message = await screen.findByText('An account with this email already exists. Try signing in instead.');
    expect(message).toBeInTheDocument();
    // Exactly one place says it: the field's own error, not a banner as well.
    expect(screen.getAllByText('An account with this email already exists. Try signing in instead.')).toHaveLength(1);
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('says the connection is the problem, in a banner, when the server cannot be reached', async () => {
    const user = userEvent.setup();
    server.use(http.post(`${BASE}/auth/register`, () => HttpResponse.error()));
    renderForm();
    await fillAndSubmit(user);
    expect(await screen.findByText(/can't reach EventForge/i)).toBeInTheDocument();
  });

  it('shows the server sentence for a failure that is not about a field', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${BASE}/auth/register`, () =>
        HttpResponse.json({ success: false, error: { message: 'Something went wrong on our side. Please try again in a moment.' } }, { status: 500 })
      )
    );
    renderForm();
    await fillAndSubmit(user);
    expect(await screen.findByText('Something went wrong on our side. Please try again in a moment.')).toBeInTheDocument();
  });
});
