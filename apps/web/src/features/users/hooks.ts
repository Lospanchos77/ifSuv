import type {
  UserCreateInput,
  UserListQuery,
  UserUpdateInput,
} from '@ifsuv/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

const KEYS = {
  all: ['users'] as const,
  list: (query: Partial<UserListQuery>) =>
    [...KEYS.all, 'list', query] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
};

export function useUsersList(query: Partial<UserListQuery>) {
  return useQuery({
    queryKey: KEYS.list(query),
    queryFn: () => api.listUsers(query),
    placeholderData: (prev) => prev,
  });
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: id ? KEYS.detail(id) : ['users', 'detail', 'none'],
    queryFn: () => api.getUser(id as string),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UserCreateInput) => api.createUser(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UserUpdateInput) => api.updateUser(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteUser(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}
