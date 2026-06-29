import type {
  CompanyCreateInput,
  CompanyListQuery,
  CompanyUpdateInput,
} from '@ifsuv/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

const KEYS = {
  all: ['companies'] as const,
  list: (query: Partial<CompanyListQuery>) =>
    [...KEYS.all, 'list', query] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
};

export function useCompaniesList(query: Partial<CompanyListQuery>) {
  return useQuery({
    queryKey: KEYS.list(query),
    queryFn: () => api.listCompanies(query),
    placeholderData: (prev) => prev,
  });
}

export function useCompany(id: string | undefined) {
  return useQuery({
    queryKey: id ? KEYS.detail(id) : ['companies', 'detail', 'none'],
    queryFn: () => api.getCompany(id as string),
    enabled: !!id,
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CompanyCreateInput) => api.createCompany(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useUpdateCompany(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CompanyUpdateInput) => api.updateCompany(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCompany(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}
