import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor, render } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { createTestQueryClient } from '../../../tests/test-utils.jsx';
import { LoginForm } from './components/LoginForm.jsx';

function renderLoginAt(route) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="/dashboard" element={<div>DASHBOARD PAGE</div>} />
          <Route path="/custom-return" element={<div>CUSTOM RETURN PAGE</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('LoginForm', () => {
  it('submits and navigates to the dashboard on success', async () => {
    const user = userEvent.setup();
    renderLoginAt('/login');

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'Test@1234');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => expect(screen.getByText('DASHBOARD PAGE')).toBeInTheDocument());
  });

  it('honors a returnTo query param instead of the default dashboard route', async () => {
    const user = userEvent.setup();
    renderLoginAt('/login?returnTo=/custom-return');

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'Test@1234');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => expect(screen.getByText('CUSTOM RETURN PAGE')).toBeInTheDocument());
  });

  it('shows the server error message and stays on the page when credentials are wrong', async () => {
    const user = userEvent.setup();
    renderLoginAt('/login');

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    expect(screen.queryByText('DASHBOARD PAGE')).not.toBeInTheDocument();
  });
});
