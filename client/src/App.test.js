import { render, screen } from '@testing-library/react';
import App from './App';

test('renders My erp label', () => {
  render(<App />);
  const labelElement = screen.getByText(/My erp/i);
  expect(labelElement).toBeInTheDocument();
});
