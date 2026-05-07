import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Dataset {
  id: string;
  name: string;
  type: 'point' | 'line' | 'polygon' | 'raster';
  feature_count: number;
  status: 'pending' | 'processing' | 'ready' | 'error';
  created_at: string;
  updated_at: string;
}

interface Feature {
  id: string;
  type: 'Feature';
  geometry: unknown;
  properties: Record<string, unknown>;
}

export function useDatasets() {
  return useQuery({
    queryKey: ['datasets'],
    queryFn: () => api.get<Dataset[]>('/api/v1/datasets'),
  });
}

export function useDataset(id: string) {
  return useQuery({
    queryKey: ['datasets', id],
    queryFn: () => api.get<Dataset>(`/api/v1/datasets/${id}`),
    enabled: !!id,
  });
}

export function useFeatures(datasetId: string) {
  return useQuery({
    queryKey: ['datasets', datasetId, 'features'],
    queryFn: () => api.get<Feature[]>(`/api/v1/datasets/${datasetId}/features?limit=100`),
    enabled: !!datasetId,
  });
}

export function useCreateDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; type: string }) =>
      api.post<Dataset>('/api/v1/datasets', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['datasets'] }),
  });
}

export function useDeleteDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/datasets/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['datasets'] }),
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ datasetId, file }: { datasetId: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.upload(`/api/v1/upload/${datasetId}`, formData);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['datasets', variables.datasetId] });
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
    },
  });
}
