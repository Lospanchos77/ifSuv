import type {
  TicketCreateInput,
  TicketListQuery,
  TicketTransitionInput,
  TicketUpdateInput,
} from '@ifsuv/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

const KEYS = {
  all: ['tickets'] as const,
  list: (query: Partial<TicketListQuery>) =>
    [...KEYS.all, 'list', query] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
  stats: () => [...KEYS.all, 'stats'] as const,
};

export function useTicketsList(query: Partial<TicketListQuery>) {
  return useQuery({
    queryKey: KEYS.list(query),
    queryFn: () => api.listTickets(query),
    placeholderData: (prev) => prev,
  });
}

export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: id ? KEYS.detail(id) : ['tickets', 'detail', 'none'],
    queryFn: () => api.getTicket(id as string),
    enabled: !!id,
  });
}

export function useTicketStats() {
  return useQuery({
    queryKey: KEYS.stats(),
    queryFn: () => api.getTicketStats(),
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TicketCreateInput) => api.createTicket(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useUpdateTicket(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TicketUpdateInput) => api.updateTicket(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useTransitionTicket(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TicketTransitionInput) => api.transitionTicket(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useDeleteTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTicket(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useUploadTicketFile(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.uploadTicketFile(id, file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.detail(id) });
    },
  });
}

export function useDeleteTicketFile(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) => api.deleteTicketFile(id, fileId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.detail(id) });
    },
  });
}

export function useCustomerSuggestions(q: string) {
  return useQuery({
    queryKey: ['customer-suggest', q],
    queryFn: () => api.suggestCustomers(q),
    enabled: q.trim().length >= 2,
    staleTime: 30_000,
  });
}
