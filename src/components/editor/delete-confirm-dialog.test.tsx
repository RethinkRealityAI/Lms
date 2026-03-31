import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeleteConfirmDialog } from './delete-confirm-dialog';

describe('DeleteConfirmDialog', () => {
  it('is not rendered when open is false', () => {
    render(
      <DeleteConfirmDialog
        open={false}
        entityType="module"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog title "Delete module?" when entityType is module', () => {
    render(
      <DeleteConfirmDialog
        open={true}
        entityType="module"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText('Delete module?')).toBeInTheDocument();
  });

  it('renders dialog title "Delete slide?" when entityType is slide', () => {
    render(
      <DeleteConfirmDialog
        open={true}
        entityType="slide"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText('Delete slide?')).toBeInTheDocument();
  });

  it('renders dialog title "Delete lesson?" when entityType is lesson', () => {
    render(
      <DeleteConfirmDialog
        open={true}
        entityType="lesson"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText('Delete lesson?')).toBeInTheDocument();
  });

  it('renders "This action cannot be undone." description', () => {
    render(
      <DeleteConfirmDialog
        open={true}
        entityType="module"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });

  it('calls onCancel when Cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(
      <DeleteConfirmDialog
        open={true}
        entityType="module"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onConfirm when Delete button is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <DeleteConfirmDialog
        open={true}
        entityType="module"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('renders "Delete?" title gracefully when entityType is null', () => {
    render(
      <DeleteConfirmDialog
        open={true}
        entityType={null}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    // Dialog should still open with a fallback title
    expect(screen.getByText('Delete?')).toBeInTheDocument();
  });
});
