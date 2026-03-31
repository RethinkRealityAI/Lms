import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('test setup', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});

describe('JSX pipeline', () => {
  it('renders a React element', () => {
    render(<p>hello world</p>);
    expect(screen.getByText('hello world')).toBeInTheDocument();
  });
});
