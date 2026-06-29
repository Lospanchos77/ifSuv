import {
  Button,
  Drawer,
  Group,
  PasswordInput,
  Select,
  Stack,
  Switch,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Role,
  type UserCreateInput,
  type UserPublic,
  UserCreateInput as UserCreateSchema,
  UserUpdateInput as UserUpdateSchema,
} from '@ifsuv/shared';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { swalError, swalSuccess } from '../../lib/swal';
import { useCompaniesList } from '../clients/hooks';
import { useCreateUser, useUpdateUser } from './hooks';

interface Props {
  opened: boolean;
  onClose: () => void;
  user: UserPublic | null;
}

type FormValues = Omit<UserCreateInput, 'password'> & { password?: string };

export function UserFormDrawer({ opened, onClose, user }: Props): JSX.Element {
  const isEdit = !!user;
  const createMut = useCreateUser();
  const updateMut = useUpdateUser(user?.id ?? '');
  const companiesQuery = useCompaniesList({ pageSize: 100 });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(isEdit ? UserUpdateSchema : UserCreateSchema),
    defaultValues: {
      email: '',
      password: '',
      role: Role.Technician,
      companyId: null,
      firstName: '',
      lastName: '',
      phone: '',
      teamviewerId: '',
      systemInfo: '',
      notes: '',
      mustResetPassword: false,
    },
  });

  const role = watch('role');
  const requiresCompany = role === Role.ClientUser;

  useEffect(() => {
    if (opened) {
      reset(
        user
          ? {
              email: user.email,
              role: user.role,
              companyId: user.companyId,
              firstName: user.firstName,
              lastName: user.lastName,
              phone: user.phone ?? '',
              teamviewerId: user.teamviewerId ?? '',
              systemInfo: user.systemInfo ?? '',
              notes: user.notes ?? '',
              mustResetPassword: user.mustResetPassword,
              password: '',
            }
          : {
              email: '',
              password: '',
              role: Role.Technician,
              companyId: null,
              firstName: '',
              lastName: '',
              phone: '',
              teamviewerId: '',
              systemInfo: '',
              notes: '',
              mustResetPassword: false,
            },
      );
    }
  }, [opened, user, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (isEdit) {
        const payload = { ...data };
        if (!payload.password) delete payload.password;
        await updateMut.mutateAsync(payload);
        swalSuccess('Utilisateur mis à jour');
      } else {
        await createMut.mutateAsync(data as UserCreateInput);
        swalSuccess('Utilisateur créé');
      }
      onClose();
    } catch (err) {
      swalError('Erreur', err instanceof Error ? err.message : 'Erreur inconnue');
    }
  });

  const companyData =
    companiesQuery.data?.items.map((c) => ({ value: c.id, label: c.name })) ?? [];

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="md"
      title={
        <Title order={4}>{isEdit ? 'Modifier utilisateur' : 'Nouvel utilisateur'}</Title>
      }
    >
      <form onSubmit={onSubmit}>
        <Stack>
          <Group grow>
            <TextInput
              label="Prénom *"
              {...register('firstName')}
              error={errors.firstName?.message}
            />
            <TextInput
              label="Nom *"
              {...register('lastName')}
              error={errors.lastName?.message}
            />
          </Group>
          <TextInput
            label="Email *"
            type="email"
            {...register('email')}
            error={errors.email?.message}
          />
          <PasswordInput
            label={isEdit ? 'Nouveau mot de passe (vide = inchangé)' : 'Mot de passe *'}
            {...register('password')}
            error={errors.password?.message}
          />
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <Select
                label="Rôle *"
                data={[
                  { value: Role.Admin, label: 'Administrateur' },
                  { value: Role.Technician, label: 'Technicien' },
                  { value: Role.ClientUser, label: 'Client' },
                ]}
                value={field.value}
                onChange={(v) => field.onChange(v ?? Role.Technician)}
                error={errors.role?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="companyId"
            render={({ field }) => (
              <Select
                label={`Entreprise${requiresCompany ? ' *' : ''}`}
                placeholder="Aucune"
                data={companyData}
                value={field.value}
                onChange={(v) => field.onChange(v)}
                clearable={!requiresCompany}
                searchable
                error={errors.companyId?.message}
              />
            )}
          />
          <TextInput label="Téléphone" {...register('phone')} />
          <TextInput label="TeamViewer ID" {...register('teamviewerId')} />
          <TextInput label="Système" {...register('systemInfo')} />
          <Textarea label="Notes" rows={2} {...register('notes')} />
          <Controller
            control={control}
            name="mustResetPassword"
            render={({ field }) => (
              <Switch
                label="Doit changer son mot de passe à la prochaine connexion"
                checked={field.value}
                onChange={(e) => field.onChange(e.currentTarget.checked)}
              />
            )}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              loading={createMut.isPending || updateMut.isPending}
            >
              {isEdit ? 'Enregistrer' : 'Créer'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Drawer>
  );
}
