import {
  Autocomplete,
  Button,
  Checkbox,
  Divider,
  Grid,
  Group,
  Modal,
  Select,
  Stack,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Role,
  TicketCreateInput,
  type TicketPublic,
  TicketUpdateInput,
} from '@ifsuv/shared';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { swalError, swalSuccess } from '../../lib/swal';
import { useCompaniesList } from '../clients/hooks';
import { useSiteSettings } from '../settings/hooks';
import { useUsersList } from '../users/hooks';
import { useCreateTicket, useCustomerSuggestions, useUpdateTicket } from './hooks';

interface Props {
  opened: boolean;
  onClose: () => void;
  ticket: TicketPublic | null;
}

/**
 * Mappe `widthCols` (1/2/3) défini par l'admin sur un span dans la grille
 * Mantine 12 colonnes : 1 → 12 (pleine), 2 → 6 (demi), 3 → 4 (tiers).
 */
function customFieldSpan(widthCols: number | undefined): number {
  if (widthCols === 2) return 6;
  if (widthCols === 3) return 4;
  return 12;
}

const DEFAULT_VALUES: TicketCreateInput = {
  companyId: undefined,
  assignedTechId: undefined,
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  customerAddress: '',
  pcPassword: '',
  location: '',
  problemType: '',
  priority: 'NORMAL',
  customFieldsData: {},
};

export function TicketFormDrawer({ opened, onClose, ticket }: Props): JSX.Element {
  const isEdit = !!ticket;
  const navigate = useNavigate();
  const createMut = useCreateTicket();
  const updateMut = useUpdateTicket(ticket?.id ?? '');

  const companiesQuery = useCompaniesList({ pageSize: 100 });
  const techsQuery = useUsersList({ role: Role.Technician, pageSize: 100 });
  const settings = useSiteSettings();
  const customFieldDefs = settings.data?.customTicketFields ?? [];

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<TicketCreateInput>({
    resolver: zodResolver(isEdit ? TicketUpdateInput : TicketCreateInput),
    defaultValues: DEFAULT_VALUES,
  });

  // Auto-suggestion du nom client (préfixe sur customerName d'autres tickets).
  // Le débounce limite les requêtes au backend pendant la frappe.
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [debouncedCustomerName] = useDebouncedValue(customerNameInput, 250);
  const customerSuggestions = useCustomerSuggestions(debouncedCustomerName);
  const suggestionList = customerSuggestions.data ?? [];

  useEffect(() => {
    if (opened) {
      reset(
        ticket
          ? {
              companyId: ticket.companyId,
              assignedTechId: ticket.assignedTechId,
              customerName: ticket.customerName ?? '',
              customerPhone: ticket.customerPhone ?? '',
              customerEmail: ticket.customerEmail ?? '',
              customerAddress: ticket.customerAddress ?? '',
              pcPassword: ticket.pcPassword ?? '',
              location: ticket.location ?? '',
              problemType: ticket.problemType ?? '',
              priority: ticket.priority ?? 'NORMAL',
              customFieldsData: ticket.customFieldsData ?? {},
            }
          : DEFAULT_VALUES,
      );
    }
  }, [opened, ticket, reset]);

  const onSubmit = handleSubmit(
    async (data) => {
      try {
        if (isEdit) {
          await updateMut.mutateAsync(data);
          swalSuccess('Ticket mis à jour');
          onClose();
        } else {
          const created = await createMut.mutateAsync(data);
          swalSuccess(`Ticket ${created.ref} créé`);
          onClose();
          navigate(`/tickets/${created.id}`);
        }
      } catch (err) {
        swalError('Erreur', err instanceof Error ? err.message : 'Erreur inconnue');
      }
    },
    (validationErrors) => {
      // Surface explicite quand la validation Zod du formulaire échoue,
      // sinon le clic sur "Créer" reste silencieux.
      console.error('[TicketForm] validation failed', validationErrors);
      const lines: string[] = [];
      function walk(obj: Record<string, unknown>, prefix: string): void {
        for (const [k, v] of Object.entries(obj)) {
          const path = prefix ? `${prefix}.${k}` : k;
          if (v && typeof v === 'object' && 'message' in (v as object)) {
            const msg = (v as { message?: string }).message ?? 'invalide';
            lines.push(`• ${path} : ${msg}`);
          } else if (v && typeof v === 'object') {
            walk(v as Record<string, unknown>, path);
          }
        }
      }
      walk(validationErrors as Record<string, unknown>, '');
      swalError(
        'Validation',
        lines.join('\n') || 'Un ou plusieurs champs sont invalides.',
      );
    },
  );

  const companyOptions =
    companiesQuery.data?.items.map((c) => ({ value: c.id, label: c.name })) ?? [];
  const techOptions =
    techsQuery.data?.items.map((u) => ({
      value: u.id,
      label: `${u.firstName} ${u.lastName}`,
    })) ?? [];

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      centered
      title={<Title order={4}>{isEdit ? 'Modifier ticket' : 'Nouveau ticket'}</Title>}
    >
      <form onSubmit={onSubmit}>
        <Stack>
          <Controller
            control={control}
            name="companyId"
            render={({ field }) => (
              <Select
                label="Entreprise"
                placeholder="Aucune"
                data={companyOptions}
                value={field.value ?? null}
                onChange={(v) => field.onChange(v ?? undefined)}
                searchable
                clearable
                error={errors.companyId?.message}
              />
            )}
          />
          <Group grow>
            <Controller
              control={control}
              name="assignedTechId"
              render={({ field }) => (
                <Select
                  label="Technicien assigné"
                  placeholder="Aucun"
                  data={techOptions}
                  value={field.value ?? null}
                  onChange={(v) => field.onChange(v ?? undefined)}
                  searchable
                  clearable
                  error={errors.assignedTechId?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="priority"
              render={({ field }) => (
                <Select
                  label="Priorité"
                  data={[
                    { value: 'LOW', label: '🟢 Basse' },
                    { value: 'NORMAL', label: '🟡 Moyenne' },
                    { value: 'HIGH', label: '🔴 Haute' },
                  ]}
                  value={field.value ?? 'NORMAL'}
                  onChange={(v) =>
                    field.onChange((v as 'LOW' | 'NORMAL' | 'HIGH') ?? 'NORMAL')
                  }
                  allowDeselect={false}
                  error={errors.priority?.message}
                />
              )}
            />
          </Group>
          <Group grow>
            <Controller
              control={control}
              name="customerName"
              render={({ field }) => (
                <Autocomplete
                  label="Nom du client"
                  placeholder="Commencez à taper pour voir les clients existants"
                  data={suggestionList.map((s) => s.name)}
                  value={field.value ?? ''}
                  onChange={(value) => {
                    field.onChange(value);
                    setCustomerNameInput(value);
                  }}
                  onOptionSubmit={(name) => {
                    field.onChange(name);
                    setCustomerNameInput(name);
                    // Autofill téléphone + adresse depuis la suggestion choisie.
                    // On ne touche pas le champ si la suggestion ne le contient pas
                    // (au cas où l'utilisateur a déjà saisi quelque chose).
                    const match = suggestionList.find((s) => s.name === name);
                    if (match?.phone) {
                      setValue('customerPhone', match.phone, { shouldDirty: true });
                    }
                    if (match?.email) {
                      setValue('customerEmail', match.email, { shouldDirty: true });
                    }
                    if (match?.address) {
                      setValue('customerAddress', match.address, {
                        shouldDirty: true,
                      });
                    }
                  }}
                  error={errors.customerName?.message}
                  comboboxProps={{ withinPortal: true }}
                />
              )}
            />
            <TextInput
              label="Téléphone client"
              {...register('customerPhone')}
              error={errors.customerPhone?.message}
            />
          </Group>
          <Textarea
            label="Adresse client"
            placeholder="N° rue, code postal, ville"
            rows={2}
            {...register('customerAddress')}
            error={errors.customerAddress?.message}
          />
          <TextInput
            label="Email client"
            type="email"
            placeholder="exemple@domaine.fr"
            {...register('customerEmail')}
            error={errors.customerEmail?.message}
          />
          <Textarea
            label="Problème signalé"
            placeholder="Décrivez le problème rencontré par le client…"
            rows={4}
            {...register('problemType')}
            error={errors.problemType?.message}
          />

          {customFieldDefs.length > 0 && (
            <>
              <Divider label="Informations complémentaires" labelPosition="left" />
              <Grid gutter="sm">
                {customFieldDefs.map((def) => {
                  const fieldName = `customFieldsData.${def.key}` as const;
                  const labelWithReq = def.required ? `${def.label} *` : def.label;
                  const span = customFieldSpan(def.widthCols);
                  let input: JSX.Element | null = null;
                  if (def.type === 'text') {
                    input = (
                      <Controller
                        control={control}
                        name={fieldName as never}
                        render={({ field }) => (
                          <TextInput
                            label={labelWithReq}
                            value={(field.value as string | undefined) ?? ''}
                            onChange={(e) => field.onChange(e.currentTarget.value)}
                          />
                        )}
                      />
                    );
                  } else if (def.type === 'textarea') {
                    input = (
                      <Controller
                        control={control}
                        name={fieldName as never}
                        render={({ field }) => (
                          <Textarea
                            label={labelWithReq}
                            rows={3}
                            value={(field.value as string | undefined) ?? ''}
                            onChange={(e) => field.onChange(e.currentTarget.value)}
                          />
                        )}
                      />
                    );
                  } else if (def.type === 'checkbox') {
                    input = (
                      <Controller
                        control={control}
                        name={fieldName as never}
                        render={({ field }) => (
                          <Checkbox
                            label={labelWithReq}
                            checked={!!field.value}
                            onChange={(e) => field.onChange(e.currentTarget.checked)}
                            mt={28}
                          />
                        )}
                      />
                    );
                  } else if (def.type === 'select') {
                    input = (
                      <Controller
                        control={control}
                        name={fieldName as never}
                        render={({ field }) => (
                          <Select
                            label={labelWithReq}
                            data={(def.options ?? []).map((o) => ({ value: o, label: o }))}
                            value={(field.value as string | undefined) ?? null}
                            onChange={(v) => field.onChange(v ?? undefined)}
                            searchable
                            clearable
                            comboboxProps={{ withinPortal: true }}
                          />
                        )}
                      />
                    );
                  }
                  return (
                    <Grid.Col key={def.key} span={{ base: 12, sm: span }}>
                      {input}
                    </Grid.Col>
                  );
                })}
              </Grid>
            </>
          )}

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
    </Modal>
  );
}
