import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../src/hooks/useDatasets', () => ({
  useDatasets: () => ({
    data: [
      {
        id: '1',
        name: 'Cell Towers',
        type: 'point',
        feature_count: 42,
        status: 'ready',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
      {
        id: '2',
        name: 'Fiber Routes',
        type: 'line',
        feature_count: 8,
        status: 'processing',
        created_at: '2025-01-02T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
      },
    ],
    isLoading: false,
  }),
  useCreateDataset: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteDataset: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUploadFile: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { DatasetList } from '../../src/components/datasets/DatasetList';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DatasetList', () => {
  it('renders dataset names', () => {
    renderWithProviders(<DatasetList onCreateNew={() => {}} />);

    expect(screen.getByText('Cell Towers')).toBeInTheDocument();
    expect(screen.getByText('Fiber Routes')).toBeInTheDocument();
  });

  it('shows empty state when no datasets', () => {
    vi.mocked(vi.importActual('../../src/hooks/useDatasets')).useDatasets = () => ({
      data: [],
      isLoading: false,
    });
  });
});
