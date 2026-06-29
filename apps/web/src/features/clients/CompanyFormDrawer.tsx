import {
  Button,
  Drawer,
  Group,
  Select,
  Stack,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CompanyCreateInput,
  type CompanyPublic,
  CompanyUpdateInput,
} from '@ifsuv/shared';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { swalError, swalSuccess } from '../../lib/swal';
import { useCreateCompany, useUpdateCompany } from './hooks';

interface Props {
  opened: boolean;
  onClose: () => void;
  company: CompanyPublic | null;
}

export function CompanyFormDrawer({ opened, onClose, company }: Props): JSX.Element {
  const isEdit = !!company;
  const createMut = useCreateCompany();
  const updateMut = useUpdateCompany(company?.id ?? '');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CompanyCreateInput>({
    resolver: zodResolver(isEdit ? CompanyUpdateInput : CompanyCreateInput),
    defaultValues: {
      kind: 'COMPANY',
      name: '',
      address: '',
      postalCode: '',
      city: '',
      email: '',
      phone: '',
      website: '',
      charges: '',
    },
  });

  const kind = watch('kind');

  useEffect(() => {
    if (opened) {
      reset(
        company
          ? {
              kind: company.kind,
              name: company.name,
              address: company.address ?? '',
              postalCode: company.postalCode ?? '',
              city: company.city ?? '',
              email: company.email ?? '',
              phone: company.phone ?? '',
              website: company.website ?? '',
              charges: company.charges ?? '',
            }
          : {
              kind: 'COMPANY',
              name: '',
              address: '',
              postalCode: '',
              city: '',
              email: '',
              phone: '',
              website: '',
              charges: '',
            },
      );
    }
  }, [opened, company, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (isEdit) {
        await updateMut.mutateAsync(data);
        swalSuccess('Entreprise mise à jour');
      } else {
        await createMut.mutateAsync(data);
        swalSuccess('Entreprise créée');
      }
      onClose();
    } catch (err) {
      swalError('Erreur', err instanceof Error ? err.message : 'Erreur inconnue');
    }
  });

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="md"
      title={
        <Title order={4}>{isEdit ? 'Modifier entreprise' : 'Nouvelle entreprise'}</Title>
      }
    >
      <form onSubmit={onSubmit}>
        <Stack>
          <Select
            label="Type"
            data={[
              { value: 'COMPANY', label: 'Entreprise' },
              { value: 'INDIVIDUAL', label: 'Particulier' },
            ]}
            value={kind}
            onChange={(v) => setValue('kind', (v ?? 'COMPANY') as 'COMPANY' | 'INDIVIDUAL')}
          />
          <TextInput label="Nom *" {...register('name')} error={errors.name?.message} />
          <TextInput
            label="Adresse"
            {...register('address')}
            error={errors.address?.message}
          />
          <Group grow>
            <TextInput
              label="Code postal"
              {...register('postalCode')}
              error={errors.postalCode?.message}
            />
            <TextInput
              label="Ville"
              {...register('city')}
              error={errors.city?.message}
            />
          </Group>
          <TextInput
            label="Email"
            type="email"
            {...register('email')}
            error={errors.email?.message}
          />
          <TextInput
            label="Téléphone"
            {...register('phone')}
            error={errors.phone?.message}
          />
          <TextInput
            label="Site web"
            {...register('website')}
            error={errors.website?.message}
          />
          <Textarea
            label="Notes / charges"
            rows={3}
            {...register('charges')}
            error={errors.charges?.message}
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
