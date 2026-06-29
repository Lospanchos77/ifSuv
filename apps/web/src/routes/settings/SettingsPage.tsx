import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Center,
  ColorInput,
  ColorSwatch,
  Divider,
  FileButton,
  Group,
  Image,
  Grid,
  Loader,
  Modal,
  Select,
  Slider,
  Stack,
  Switch,
  TagsInput,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
  useMantineTheme,
} from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  SiteSettingsUpdateInput,
  type CustomFieldDef,
  type MantineColor,
} from '@ifsuv/shared';
import {
  IconArrowDown,
  IconArrowUp,
  IconDeviceFloppy,
  IconPencil,
  IconPlus,
  IconTrash,
  IconUpload,
} from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useSiteSettings, useUpdateSiteSettings } from '../../features/settings/hooks';
import { swalError, swalSuccess } from '../../lib/swal';

const CUSTOM_FIELD_TYPE_LABEL: Record<CustomFieldDef['type'], string> = {
  text: 'Texte court',
  textarea: 'Texte long',
  checkbox: 'Case à cocher',
  select: 'Liste déroulante',
};

const MAX_LOGO_BYTES = 200 * 1024;

const COLOR_OPTIONS: { value: MantineColor; label: string }[] = [
  { value: 'indigo', label: 'Indigo (défaut)' },
  { value: 'blue', label: 'Bleu' },
  { value: 'cyan', label: 'Cyan' },
  { value: 'teal', label: 'Teal' },
  { value: 'green', label: 'Vert' },
  { value: 'lime', label: 'Lime' },
  { value: 'yellow', label: 'Jaune' },
  { value: 'orange', label: 'Orange' },
  { value: 'red', label: 'Rouge' },
  { value: 'pink', label: 'Rose' },
  { value: 'grape', label: 'Raisin' },
  { value: 'violet', label: 'Violet' },
  { value: 'gray', label: 'Gris' },
  { value: 'dark', label: 'Noir' },
];

/**
 * Convertit un libellé humain en clé technique valide pour CustomFieldDef.
 * Ex. "Type d'appareil" → "type_d_appareil"
 */
function slugifyKey(label: string): string {
  const normalized = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritical marks
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
  if (!normalized) return '';
  return /^[a-z]/.test(normalized) ? normalized : `f_${normalized}`;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function SettingsPage(): JSX.Element {
  const { data, isLoading, isError, error } = useSiteSettings();
  const updateMut = useUpdateSiteSettings();
  const theme = useMantineTheme();
  const [logoPreview, setLogoPreview] = useState<string | undefined>();
  const fileResetRef = useRef<() => void>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<SiteSettingsUpdateInput>({
    resolver: zodResolver(SiteSettingsUpdateInput),
    defaultValues: {
      siteName: '',
      siteTagline: '',
      logoDataUrl: '',
      primaryColor: 'indigo',
      siteNameColor: '',
      showSiteName: true,
      defaultRadius: 'md',
      fontFamily: 'system',
      logoHeight: 36,
      headerPaddingY: 8,
      customTicketFields: [],
      supportEmail: '',
      supportPhone: '',
      companyAddress: '',
      companyName: '',
      companySiret: '',
    },
  });

  const customFieldsArray = useFieldArray({ control, name: 'customTicketFields' });
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldDef['type']>('text');
  const [newFieldOptions, setNewFieldOptions] = useState<string[]>([]);
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldWidth, setNewFieldWidth] = useState<1 | 2 | 3>(1);
  const [newFieldShowOnDashboard, setNewFieldShowOnDashboard] = useState(false);

  // État du modal d'édition d'un champ existant — partage la même forme que
  // le formulaire d'ajout mais avec un index ciblé.
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [editKey, setEditKey] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [editType, setEditType] = useState<CustomFieldDef['type']>('text');
  const [editOptions, setEditOptions] = useState<string[]>([]);
  const [editRequired, setEditRequired] = useState(false);
  const [editWidth, setEditWidth] = useState<1 | 2 | 3>(1);
  const [editShowOnDashboard, setEditShowOnDashboard] = useState(false);

  function resetNewField(): void {
    setNewFieldKey('');
    setNewFieldLabel('');
    setNewFieldType('text');
    setNewFieldOptions([]);
    setNewFieldRequired(false);
    setNewFieldWidth(1);
    setNewFieldShowOnDashboard(false);
  }

  function openEditFieldModal(index: number): void {
    const f = customFieldsArray.fields[index];
    if (!f) return;
    setEditingFieldIndex(index);
    setEditKey(f.key);
    setEditLabel(f.label);
    setEditType(f.type);
    setEditOptions(f.options ?? []);
    setEditRequired(f.required ?? false);
    setEditWidth(((f.widthCols ?? 1) as 1 | 2 | 3));
    setEditShowOnDashboard(f.showOnDashboard ?? false);
  }

  function closeEditFieldModal(): void {
    setEditingFieldIndex(null);
  }

  function handleSaveEditField(): void {
    if (editingFieldIndex === null) return;
    const key = editKey.trim().toLowerCase();
    const label = editLabel.trim();
    if (!/^[a-z][a-z0-9_]*$/.test(key)) {
      swalError(
        'Clé invalide',
        'Lettres minuscules, chiffres et underscore. Doit commencer par une lettre.',
      );
      return;
    }
    if (!label) {
      swalError('Champ invalide', 'Le libellé est obligatoire.');
      return;
    }
    const otherKeys = customFieldsArray.fields
      .filter((_, i) => i !== editingFieldIndex)
      .map((f) => f.key);
    if (otherKeys.includes(key)) {
      swalError('Clé en double', `La clé "${key}" est déjà utilisée par un autre champ.`);
      return;
    }
    if (editType === 'select' && editOptions.length === 0) {
      swalError(
        'Options manquantes',
        'Une liste déroulante doit avoir au moins une option.',
      );
      return;
    }
    customFieldsArray.update(editingFieldIndex, {
      key,
      label,
      type: editType,
      options: editType === 'select' ? editOptions : undefined,
      required: editRequired || undefined,
      widthCols: editWidth,
      showOnDashboard: editShowOnDashboard || undefined,
    });
    closeEditFieldModal();
  }

  function handleAddCustomField(): void {
    const key = newFieldKey.trim().toLowerCase();
    const label = newFieldLabel.trim();
    if (!key) {
      swalError('Champ invalide', 'La clé est obligatoire.');
      return;
    }
    if (!/^[a-z][a-z0-9_]*$/.test(key)) {
      swalError(
        'Clé invalide',
        'Lettres minuscules, chiffres et underscore. Doit commencer par une lettre.',
      );
      return;
    }
    if (!label) {
      swalError('Champ invalide', 'Le libellé est obligatoire.');
      return;
    }
    const existingKeys = customFieldsArray.fields.map((f) => f.key);
    if (existingKeys.includes(key)) {
      swalError('Clé en double', `La clé "${key}" est déjà utilisée.`);
      return;
    }
    if (newFieldType === 'select' && newFieldOptions.length === 0) {
      swalError(
        'Options manquantes',
        'Une liste déroulante doit avoir au moins une option.',
      );
      return;
    }
    customFieldsArray.append({
      key,
      label,
      type: newFieldType,
      options: newFieldType === 'select' ? newFieldOptions : undefined,
      required: newFieldRequired || undefined,
      widthCols: newFieldWidth,
      showOnDashboard: newFieldShowOnDashboard || undefined,
    });
    resetNewField();
  }

  const watchedColor = watch('primaryColor') ?? 'indigo';
  const watchedHeight = watch('logoHeight') ?? 36;
  const watchedPadding = watch('headerPaddingY') ?? 8;

  useEffect(() => {
    if (data) {
      reset({
        siteName: data.siteName,
        siteTagline: data.siteTagline ?? '',
        logoDataUrl: data.logoDataUrl ?? '',
        primaryColor: data.primaryColor ?? 'indigo',
        siteNameColor: data.siteNameColor ?? '',
        showSiteName: data.showSiteName ?? true,
        defaultRadius: data.defaultRadius ?? 'md',
        fontFamily: data.fontFamily ?? 'system',
        logoHeight: data.logoHeight ?? 36,
        headerPaddingY: data.headerPaddingY ?? 8,
        customTicketFields: data.customTicketFields ?? [],
        supportEmail: data.supportEmail ?? '',
        supportPhone: data.supportPhone ?? '',
        companyAddress: data.companyAddress ?? '',
        companyName: data.companyName ?? '',
        companySiret: data.companySiret ?? '',
      });
      setLogoPreview(data.logoDataUrl);
    }
  }, [data, reset]);

  async function handleFileChange(file: File | null): Promise<void> {
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      swalError(
        'Logo trop volumineux',
        `Max ${(MAX_LOGO_BYTES / 1024).toFixed(0)} ko (votre fichier : ${(file.size / 1024).toFixed(0)} ko)`,
      );
      fileResetRef.current?.();
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    setLogoPreview(dataUrl);
  }

  function clearLogo(): void {
    setLogoPreview(undefined);
    fileResetRef.current?.();
  }

  const onSubmit = handleSubmit(
    async (formData) => {
      try {
        await updateMut.mutateAsync({
          ...formData,
          logoDataUrl: logoPreview ?? '',
        });
        swalSuccess('Paramètres enregistrés');
      } catch (err) {
        swalError('Erreur', err instanceof Error ? err.message : 'Erreur inconnue');
      }
    },
    (validationErrors) => {
      // Surface explicite quand la validation Zod du formulaire échoue,
      // sinon le clic sur "Enregistrer" reste silencieux.
      console.error('[Settings] validation failed', validationErrors);
      const lines = Object.entries(validationErrors)
        .map(([field, err]) => {
          const msg = (err as { message?: string } | undefined)?.message ?? 'invalide';
          return `• ${field} : ${msg}`;
        })
        .join('\n');
      swalError('Validation', lines || 'Un ou plusieurs champs sont invalides.');
    },
  );

  if (isLoading) {
    return (
      <Center p="xl">
        <Loader />
      </Center>
    );
  }

  if (isError) {
    return (
      <Text c="red">Erreur : {(error as Error)?.message ?? 'Erreur inconnue'}</Text>
    );
  }

  return (
    <Stack>
      <Title order={2}>Paramètres du site</Title>

      <form onSubmit={onSubmit}>
        <Stack>
          {/* ===== IDENTITÉ ===== */}
          <Card withBorder padding="lg">
            <Title order={4} mb="md">
              Identité
            </Title>
            <Stack>
              <TextInput
                label="Nom du site *"
                description="Apparait dans le header, la page de connexion, l'onglet navigateur"
                {...register('siteName')}
                error={errors.siteName?.message}
              />
              <TextInput
                label="Slogan"
                description="Sous-titre optionnel visible sur la page de connexion"
                {...register('siteTagline')}
                error={errors.siteTagline?.message}
              />

              <Controller
                control={control}
                name="siteNameColor"
                render={({ field }) => (
                  <ColorInput
                    label="Couleur du nom"
                    description="Couleur d'affichage du nom dans le header et sur la page de connexion. Laisser vide pour le dégradé indigo → grape par défaut."
                    placeholder="#5c7cfa"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    format="hex"
                    swatches={[
                      '#1e1e2e',
                      '#5c7cfa',
                      '#15aabf',
                      '#12b886',
                      '#82c91e',
                      '#fab005',
                      '#fd7e14',
                      '#fa5252',
                      '#e64980',
                      '#be4bdb',
                      '#7950f2',
                    ]}
                    error={errors.siteNameColor?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="showSiteName"
                render={({ field }) => (
                  <Switch
                    label="Afficher le nom à côté du logo"
                    description="Si désactivé, seul le logo apparaît dans le header (le nom reste utilisé pour l'onglet et la page de connexion)."
                    checked={field.value ?? true}
                    onChange={(e) => field.onChange(e.currentTarget.checked)}
                  />
                )}
              />

              <Divider label="Logo & Favicon" labelPosition="left" />

              <Group align="flex-start">
                {logoPreview ? (
                  <Image
                    src={logoPreview}
                    alt="Logo"
                    h={120}
                    w="auto"
                    maw={360}
                    fit="contain"
                    bg="white"
                    radius="md"
                    style={{
                      padding: 8,
                      border: '1px solid var(--mantine-color-default-border)',
                    }}
                  />
                ) : (
                  <Center
                    w={120}
                    h={120}
                    bg="var(--mantine-color-default)"
                    style={{
                      borderRadius: 8,
                      border: '1px dashed var(--mantine-color-default-border)',
                    }}
                  >
                    <Text size="xs" c="dimmed">
                      Aucun logo
                    </Text>
                  </Center>
                )}
                <Stack gap="xs">
                  <FileButton
                    onChange={(f) => void handleFileChange(f)}
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    resetRef={fileResetRef}
                  >
                    {(props) => (
                      <Button
                        {...props}
                        variant="default"
                        leftSection={<IconUpload size={16} />}
                      >
                        Choisir un logo
                      </Button>
                    )}
                  </FileButton>
                  {logoPreview && (
                    <Tooltip label="Retirer le logo">
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={clearLogo}
                        aria-label="Retirer le logo"
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                  <Text size="xs" c="dimmed">
                    PNG / JPEG / WEBP / SVG · max ~200 ko
                    <br />
                    Sert aussi de favicon (icône d&apos;onglet).
                  </Text>
                </Stack>
              </Group>

              <Stack gap={4} mt="xs">
                <Text size="sm" fw={500}>
                  Hauteur du logo dans le header : {watchedHeight}px
                </Text>
                <Controller
                  control={control}
                  name="logoHeight"
                  render={({ field }) => (
                    <Slider
                      min={16}
                      max={256}
                      step={4}
                      value={field.value ?? 36}
                      onChange={field.onChange}
                      marks={[
                        { value: 32, label: 'Petit' },
                        { value: 96, label: 'Moyen' },
                        { value: 192, label: 'Grand' },
                      ]}
                    />
                  )}
                />
              </Stack>

              <Stack gap={4} mt="xs">
                <Text size="sm" fw={500}>
                  Espacement vertical du header : {watchedPadding}px
                </Text>
                <Controller
                  control={control}
                  name="headerPaddingY"
                  render={({ field }) => (
                    <Slider
                      min={-48}
                      max={48}
                      step={2}
                      value={field.value ?? 8}
                      onChange={field.onChange}
                      marks={[
                        { value: -32, label: 'Compressé' },
                        { value: 0, label: 'Aucun' },
                        { value: 8, label: 'Défaut' },
                        { value: 48, label: 'Max' },
                      ]}
                    />
                  )}
                />
              </Stack>
            </Stack>
          </Card>

          {/* ===== THÈME ===== */}
          <Card withBorder padding="lg">
            <Title order={4} mb="md">
              Thème
            </Title>
            <Stack>
              <Controller
                control={control}
                name="primaryColor"
                render={({ field }) => (
                  <Select
                    label="Couleur principale"
                    description="Boutons, liens, badges, texte accentué"
                    data={COLOR_OPTIONS}
                    value={field.value ?? 'indigo'}
                    onChange={(v) => field.onChange((v as MantineColor) ?? 'indigo')}
                    allowDeselect={false}
                    leftSection={
                      <ColorSwatch
                        size={16}
                        color={theme.colors[watchedColor]?.[6] ?? '#5c7cfa'}
                      />
                    }
                  />
                )}
              />
              <Group gap="xs">
                {COLOR_OPTIONS.map((opt) => (
                  <Tooltip key={opt.value} label={opt.label}>
                    <ColorSwatch
                      color={theme.colors[opt.value]?.[6] ?? '#000'}
                      size={28}
                      style={{
                        cursor: 'pointer',
                        outline:
                          watchedColor === opt.value
                            ? `3px solid var(--mantine-color-${opt.value}-3)`
                            : undefined,
                        outlineOffset: 2,
                      }}
                      onClick={() =>
                        setValue('primaryColor', opt.value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    />
                  </Tooltip>
                ))}
              </Group>

              <Divider my="xs" />

              <Controller
                control={control}
                name="defaultRadius"
                render={({ field }) => (
                  <Select
                    label="Arrondi des bords"
                    description="Coins arrondis des cartes, boutons et inputs"
                    data={[
                      { value: 'xs', label: 'Aucun (carré)' },
                      { value: 'sm', label: 'Léger' },
                      { value: 'md', label: 'Standard (défaut)' },
                      { value: 'lg', label: 'Marqué' },
                      { value: 'xl', label: 'Très arrondi' },
                    ]}
                    value={field.value ?? 'md'}
                    onChange={(v) => field.onChange((v ?? 'md') as 'xs' | 'sm' | 'md' | 'lg' | 'xl')}
                    allowDeselect={false}
                  />
                )}
              />

              <Controller
                control={control}
                name="fontFamily"
                render={({ field }) => (
                  <Select
                    label="Police"
                    description="Famille de polices appliquée à toute l'interface"
                    data={[
                      { value: 'system', label: 'Système (défaut)' },
                      { value: 'serif', label: 'Serif (Georgia)' },
                      { value: 'mono', label: 'Monospace (JetBrains Mono)' },
                      { value: 'rounded', label: 'Arrondie (Nunito)' },
                    ]}
                    value={field.value ?? 'system'}
                    onChange={(v) => field.onChange((v ?? 'system') as 'system' | 'serif' | 'mono' | 'rounded')}
                    allowDeselect={false}
                  />
                )}
              />

              <Text size="xs" c="dimmed">
                Les changements s&apos;appliquent immédiatement après enregistrement.
              </Text>
            </Stack>
          </Card>

          {/* ===== CHAMPS TICKET PERSONNALISÉS ===== */}
          <Card withBorder padding="lg">
            <Stack gap="md">
              <div>
                <Title order={4} mb={4}>
                  Champs ticket personnalisés
                </Title>
                <Text size="xs" c="dimmed">
                  Ajoute des champs au formulaire de création/édition de ticket
                  (apparaissent après les champs standards). Chaque champ est
                  défini par une clé technique, un libellé et un type.
                </Text>
              </div>

              {/* Liste des champs existants */}
              {customFieldsArray.fields.length === 0 ? (
                <Text size="sm" c="dimmed" fs="italic">
                  Aucun champ personnalisé pour le moment.
                </Text>
              ) : (
                <Stack gap="xs">
                  {customFieldsArray.fields.map((field, index) => (
                    <Group
                      key={field.id}
                      justify="space-between"
                      wrap="nowrap"
                      p="sm"
                      style={{
                        border: '1px solid var(--mantine-color-default-border)',
                        borderRadius: 8,
                      }}
                    >
                      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                        <Group gap="xs" wrap="nowrap">
                          <Text fw={600} size="sm" lineClamp={1}>
                            {field.label}
                          </Text>
                          {field.required && (
                            <Badge size="xs" color="red" variant="light">
                              Requis
                            </Badge>
                          )}
                        </Group>
                        <Group gap="xs" wrap="nowrap">
                          <Text size="xs" c="dimmed" ff="monospace">
                            {field.key}
                          </Text>
                          <Text size="xs" c="dimmed">
                            · {CUSTOM_FIELD_TYPE_LABEL[field.type]}
                          </Text>
                          {field.type === 'select' && field.options && (
                            <Text size="xs" c="dimmed" lineClamp={1}>
                              · {field.options.join(', ')}
                            </Text>
                          )}
                        </Group>
                      </Stack>
                      <Select
                        aria-label="Largeur"
                        data={[
                          { value: '1', label: '1 col' },
                          { value: '2', label: '2 col' },
                          { value: '3', label: '3 col' },
                        ]}
                        value={String(field.widthCols ?? 1)}
                        onChange={(v) =>
                          customFieldsArray.update(index, {
                            ...field,
                            widthCols: (Number(v) || 1) as 1 | 2 | 3,
                          })
                        }
                        allowDeselect={false}
                        size="xs"
                        w={90}
                      />
                      <Group gap={4} wrap="nowrap">
                        <Tooltip label="Monter">
                          <ActionIcon
                            variant="subtle"
                            disabled={index === 0}
                            onClick={() =>
                              customFieldsArray.move(index, index - 1)
                            }
                            aria-label="Monter"
                          >
                            <IconArrowUp size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Descendre">
                          <ActionIcon
                            variant="subtle"
                            disabled={
                              index === customFieldsArray.fields.length - 1
                            }
                            onClick={() =>
                              customFieldsArray.move(index, index + 1)
                            }
                            aria-label="Descendre"
                          >
                            <IconArrowDown size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Modifier">
                          <ActionIcon
                            variant="subtle"
                            onClick={() => openEditFieldModal(index)}
                            aria-label="Modifier"
                          >
                            <IconPencil size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Supprimer ce champ">
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => customFieldsArray.remove(index)}
                            aria-label="Supprimer"
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Group>
                  ))}
                </Stack>
              )}

              <Divider label="Ajouter un champ" labelPosition="left" />

              <Grid gutter="sm">
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label="Libellé"
                    description="Affiché dans le formulaire ticket"
                    placeholder="Type d'appareil"
                    value={newFieldLabel}
                    onChange={(e) => {
                      const label = e.currentTarget.value;
                      setNewFieldLabel(label);
                      if (
                        !newFieldKey ||
                        newFieldKey === slugifyKey(newFieldLabel)
                      ) {
                        setNewFieldKey(slugifyKey(label));
                      }
                    }}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label="Clé technique"
                    description="Auto-rempli depuis le libellé. Minuscules, chiffres, underscore."
                    placeholder="type_appareil"
                    value={newFieldKey}
                    onChange={(e) => setNewFieldKey(e.currentTarget.value)}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Select
                    label="Type"
                    data={Object.entries(CUSTOM_FIELD_TYPE_LABEL).map(([v, l]) => ({
                      value: v,
                      label: l,
                    }))}
                    value={newFieldType}
                    onChange={(v) =>
                      setNewFieldType((v as CustomFieldDef['type']) ?? 'text')
                    }
                    allowDeselect={false}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Select
                    label="Largeur"
                    data={[
                      { value: '1', label: '1 colonne (pleine largeur)' },
                      { value: '2', label: '2 colonnes (demi-largeur)' },
                      { value: '3', label: '3 colonnes (tiers)' },
                    ]}
                    value={String(newFieldWidth)}
                    onChange={(v) =>
                      setNewFieldWidth((Number(v) || 1) as 1 | 2 | 3)
                    }
                    allowDeselect={false}
                  />
                </Grid.Col>
              </Grid>
              <Group>
                <Switch
                  label="Champ requis"
                  description="Marqué comme important (* dans le label)"
                  checked={newFieldRequired}
                  onChange={(e) => setNewFieldRequired(e.currentTarget.checked)}
                />
                <Switch
                  label="Afficher sur le dashboard"
                  description="La valeur de ce champ apparaît dans les cards"
                  checked={newFieldShowOnDashboard}
                  onChange={(e) =>
                    setNewFieldShowOnDashboard(e.currentTarget.checked)
                  }
                />
              </Group>
              {newFieldType === 'select' && (
                <TagsInput
                  label="Options de la liste"
                  description="Tape une valeur puis Entrée pour l'ajouter"
                  placeholder="Ajouter une option…"
                  value={newFieldOptions}
                  onChange={setNewFieldOptions}
                />
              )}
              <Group justify="flex-end">
                <Button
                  variant="default"
                  leftSection={<IconPlus size={16} />}
                  onClick={handleAddCustomField}
                >
                  Ajouter ce champ
                </Button>
              </Group>
            </Stack>
          </Card>

          {/* ===== CONTACT / SOCIÉTÉ ===== */}
          <Card withBorder padding="lg">
            <Title order={4} mb="md">
              Contact / Société
            </Title>
            <Text size="sm" c="dimmed" mb="md">
              Utilisé sur les documents imprimés (fiche de prise en charge, rapports).
            </Text>
            <Stack>
              <Group grow>
                <TextInput
                  label="Nom de la société"
                  placeholder="Interactif Fusion"
                  {...register('companyName')}
                  error={errors.companyName?.message}
                />
                <TextInput
                  label="SIRET"
                  placeholder="49449032900021"
                  {...register('companySiret')}
                  error={errors.companySiret?.message}
                />
              </Group>
              <Group grow>
                <TextInput
                  label="Email support"
                  type="email"
                  {...register('supportEmail')}
                  error={errors.supportEmail?.message}
                />
                <TextInput
                  label="Téléphone support"
                  {...register('supportPhone')}
                  error={errors.supportPhone?.message}
                />
              </Group>
              <Textarea
                label="Adresse de l'entreprise"
                rows={2}
                {...register('companyAddress')}
                error={errors.companyAddress?.message}
              />
            </Stack>
          </Card>

          <Group justify="flex-end">
            <Button
              type="submit"
              leftSection={<IconDeviceFloppy size={16} />}
              loading={updateMut.isPending}
              disabled={!isDirty && logoPreview === data?.logoDataUrl}
            >
              Enregistrer
            </Button>
          </Group>
        </Stack>
      </form>

      {/* Modal d'édition d'un champ custom existant — séparé du form principal
          pour éviter les soumissions imbriquées. Les changements sont propagés
          via customFieldsArray.update() qui marque le form parent comme dirty. */}
      <Modal
        opened={editingFieldIndex !== null}
        onClose={closeEditFieldModal}
        title="Modifier le champ personnalisé"
        centered
        size="lg"
      >
        <Stack>
          <Grid gutter="sm">
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput
                label="Libellé"
                value={editLabel}
                onChange={(e) => setEditLabel(e.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput
                label="Clé technique"
                description="Minuscules, chiffres, underscore"
                value={editKey}
                onChange={(e) => setEditKey(e.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select
                label="Type"
                data={Object.entries(CUSTOM_FIELD_TYPE_LABEL).map(([v, l]) => ({
                  value: v,
                  label: l,
                }))}
                value={editType}
                onChange={(v) =>
                  setEditType((v as CustomFieldDef['type']) ?? 'text')
                }
                allowDeselect={false}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select
                label="Largeur"
                data={[
                  { value: '1', label: '1 colonne (pleine largeur)' },
                  { value: '2', label: '2 colonnes (demi-largeur)' },
                  { value: '3', label: '3 colonnes (tiers)' },
                ]}
                value={String(editWidth)}
                onChange={(v) => setEditWidth((Number(v) || 1) as 1 | 2 | 3)}
                allowDeselect={false}
              />
            </Grid.Col>
          </Grid>
          <Group>
            <Switch
              label="Champ requis"
              checked={editRequired}
              onChange={(e) => setEditRequired(e.currentTarget.checked)}
            />
            <Switch
              label="Afficher sur le dashboard"
              checked={editShowOnDashboard}
              onChange={(e) => setEditShowOnDashboard(e.currentTarget.checked)}
            />
          </Group>
          {editType === 'select' && (
            <TagsInput
              label="Options de la liste"
              description="Tape une valeur puis Entrée pour l'ajouter"
              placeholder="Ajouter une option…"
              value={editOptions}
              onChange={setEditOptions}
            />
          )}
          <Group justify="flex-end" mt="sm">
            <Button variant="subtle" onClick={closeEditFieldModal}>
              Annuler
            </Button>
            <Button onClick={handleSaveEditField}>Appliquer</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
