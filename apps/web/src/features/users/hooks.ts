import {
  Role,
  type UserCreateInput,
  type UserListQuery,
  type UserPublic,
  type UserUpdateInput,
} from '@ifsuv/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
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

/**
 * Utilisateurs assignables à un ticket comme « technicien » : rôles Technician ET
 * Admin (un admin peut être assigné comme technicien). Fusionnés (dédup par id),
 * triés par nom.
 */
export function useAssignableTechs(): { items: UserPublic[]; isLoading: boolean } {
  const techs = useUsersList({ role: Role.Technician, pageSize: 100 });
  const admins = useUsersList({ role: Role.Admin, pageSize: 100 });
  const items = useMemo<UserPublic[]>(() => {
    const byId = new Map<string, UserPublic>();
    for (const u of [...(techs.data?.items ?? []), ...(admins.data?.items ?? [])]) {
      byId.set(u.id, u);
    }
    return [...byId.values()].sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
    );
  }, [techs.data, admins.data]);
  return { items, isLoading: techs.isLoading || admins.isLoading };
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
