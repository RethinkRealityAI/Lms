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
    expect(screen.queryByText(/delete this/i)).not.toBeInTheDocument();
  });

  it('shows "Delete this module?" when entityType is module', () => {
    render(
      <DeleteConfirmDialog
        open={true}
        entityType="module"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText(/delete this module/i)).toBeInTheDocument();
  });

  it('shows "Delete this slide?" when entityType is slide', () => {
    render(
      <DeleteConfirmDialog
        open={true}
        entityType="slide"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText(/delete this slide/i)).toBeInTheDocument();
  });

  it('shows "Delete this lesson?" when entityType is lesson', () => {
    render(
      <DeleteConfirmDialog
        open={true}
        entityType="lesson"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText(/delete this lesson/i)).toBeInTheDocument();
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

  it('does not render when entityType is null', () => {
    render(
      <DeleteConfirmDialog
        open={true}
        entityType={null}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.queryByText(/delete this/i)).not.toBeInTheDocument();
  });
});
