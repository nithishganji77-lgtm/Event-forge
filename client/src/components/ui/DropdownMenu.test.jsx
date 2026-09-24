import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Link } from 'react-router-dom';
import { DropdownMenu, DropdownMenuItem, DropdownMenuRadioItem, DropdownMenuSeparator } from './DropdownMenu.jsx';

function setup({ onEdit = vi.fn(), onDelete = vi.fn() } = {}) {
  render(
    <MemoryRouter>
      <button>before</button>
      <DropdownMenu
        label="Event actions"
        trigger={({ triggerProps }) => <button {...triggerProps}>Open menu</button>}
      >
        <DropdownMenuItem onSelect={onEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem disabled>Duplicate</DropdownMenuItem>
        <DropdownMenuItem as={Link} to="/somewhere">Manage</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuRadioItem checked onSelect={() => {}}>Light</DropdownMenuRadioItem>
        <DropdownMenuItem onSelect={onDelete}>Delete</DropdownMenuItem>
      </DropdownMenu>
      <button>after</button>
    </MemoryRouter>
  );
  return { trigger: screen.getByRole('button', { name: 'Open menu' }), onEdit, onDelete };
}

describe('DropdownMenu', () => {
  it('is closed by default and exposes menu-button semantics on the trigger', () => {
    const { trigger } = setup();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens on click, labels the menu, and moves focus to the first item', async () => {
    const user = userEvent.setup();
    const { trigger } = setup();
    await user.click(trigger);

    const menu = await screen.findByRole('menu', { name: 'Event actions' });
    expect(menu).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus());
  });

  it('opens from the keyboard: ArrowDown focuses the first item, ArrowUp the last', async () => {
    const user = userEvent.setup();
    const { trigger } = setup();
    trigger.focus();
    await user.keyboard('{ArrowUp}');
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus());
  });

  it('moves between items with the arrow keys, wrapping and skipping disabled items', async () => {
    const user = userEvent.setup();
    const { trigger } = setup();
    await user.click(trigger);
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus());

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Manage' })).toHaveFocus(); // "Duplicate" is disabled
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitemradio', { name: 'Light' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus(); // wrapped
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus(); // wrapped back
  });

  it('Home and End jump to the first and last item', async () => {
    const user = userEvent.setup();
    const { trigger } = setup();
    await user.click(trigger);
    await user.keyboard('{End}');
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus();
  });

  it('Escape closes the menu and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    const { trigger } = setup();
    await user.click(trigger);
    await screen.findByRole('menu');

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('Tab closes the menu instead of tabbing through the items', async () => {
    const user = userEvent.setup();
    const { trigger } = setup();
    await user.click(trigger);
    await screen.findByRole('menu');
    await user.keyboard('{Tab}');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('clicking outside closes it', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    await screen.findByRole('menu');
    await user.click(screen.getByRole('button', { name: 'after' }));
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('selecting an action runs it, closes the menu and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    const { trigger, onEdit } = setup();
    await user.click(trigger);
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('ignores a disabled item', async () => {
    const user = userEvent.setup();
    const { trigger } = setup();
    await user.click(trigger);
    const disabled = await screen.findByRole('menuitem', { name: 'Duplicate' });
    expect(disabled).toHaveAttribute('aria-disabled', 'true');
    await user.click(disabled);
    expect(screen.getByRole('menu')).toBeInTheDocument(); // still open
  });

  it('reports the checked state of a radio item', async () => {
    const user = userEvent.setup();
    const { trigger } = setup();
    await user.click(trigger);
    expect(await screen.findByRole('menuitemradio', { name: 'Light' })).toHaveAttribute('aria-checked', 'true');
  });
  // cn() is plain clsx, so a destructive item that also kept the neutral text classes would emit
  // two competing text-* utilities and let stylesheet order pick the colour (it rendered neutral).
  it('gives a destructive item exactly one text colour, not the neutral one plus an override', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <DropdownMenu label="Actions" trigger={({ triggerProps }) => <button {...triggerProps}>Open</button>}>
          <DropdownMenuItem>Neutral</DropdownMenuItem>
          <DropdownMenuItem destructive>Danger</DropdownMenuItem>
        </DropdownMenu>
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const neutral = await screen.findByRole('menuitem', { name: 'Neutral' });
    const danger = screen.getByRole('menuitem', { name: 'Danger' });
    expect(neutral.className).toContain('text-(--color-text)/80');
    expect(danger.className).not.toContain('text-(--color-text)/80');
    expect(danger.className).toContain('color-mix');
  });
});
