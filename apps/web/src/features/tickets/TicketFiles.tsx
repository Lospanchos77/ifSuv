import {
  ActionIcon,
  Anchor,
  Box,
  Card,
  Group,
  Image,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { Dropzone, type FileWithPath } from '@mantine/dropzone';
import '@mantine/dropzone/styles.css';
import {
  IconDownload,
  IconFile,
  IconFileTypePdf,
  IconFileZip,
  IconTrash,
  IconUpload,
  IconX,
  type TablerIcon,
} from '@tabler/icons-react';
import {
  IMAGE_PREVIEW_MIME,
  TICKET_FILE_MAX_BYTES,
  TICKET_FILE_MAX_COUNT,
  type TicketFilePublic,
} from '@ifsuv/shared';
import Swal from 'sweetalert2';
import { ticketFileUrl } from './api';
import { useDeleteTicketFile, useUploadTicketFile } from './hooks';
import { swalConfirm, swalError, swalSuccess, swalWarning } from '../../lib/swal';

interface Props {
  ticketId: string;
  files: TicketFilePublic[];
}

const MAX_MB = Math.round(TICKET_FILE_MAX_BYTES / (1024 * 1024));

function isPreviewImage(mime: string): boolean {
  return (IMAGE_PREVIEW_MIME as readonly string[]).includes(mime);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function fileIcon(mime: string, name: string): TablerIcon {
  if (mime === 'application/pdf' || /\.pdf$/i.test(name)) return IconFileTypePdf;
  if (mime.includes('zip') || /\.(zip|rar|7z)$/i.test(name)) return IconFileZip;
  return IconFile;
}

export function TicketFiles({ ticketId, files }: Props): JSX.Element {
  const uploadMut = useUploadTicketFile(ticketId);
  const deleteMut = useDeleteTicketFile(ticketId);
  const slots = TICKET_FILE_MAX_COUNT - files.length;
  const atMax = slots <= 0;

  async function handleDrop(dropped: FileWithPath[]): Promise<void> {
    const toUpload = dropped.slice(0, slots);
    if (dropped.length > slots) {
      swalWarning(
        `Maximum ${TICKET_FILE_MAX_COUNT} fichiers par ticket`,
        `Seul(s) ${toUpload.length} fichier(s) sera(ont) ajouté(s).`,
      );
    }
    let added = 0;
    for (const file of toUpload) {
      try {
        await uploadMut.mutateAsync(file);
        added += 1;
      } catch (err) {
        swalError('Upload échoué', err instanceof Error ? err.message : 'Erreur inconnue');
        break;
      }
    }
    if (added > 0) {
      swalSuccess(added > 1 ? `${added} fichiers ajoutés` : 'Fichier ajouté');
    }
  }

  async function handleDelete(file: TicketFilePublic): Promise<void> {
    const ok = await swalConfirm({
      title: `Supprimer « ${file.name} » ?`,
      text: 'Cette action est irréversible.',
      confirmText: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(file.id);
      swalSuccess('Fichier supprimé');
    } catch (err) {
      swalError('Suppression échouée', err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }

  function handleZoom(file: TicketFilePublic): void {
    void Swal.fire({
      imageUrl: ticketFileUrl(ticketId, file.id),
      imageAlt: file.name,
      showConfirmButton: false,
      showCloseButton: true,
      width: 'auto',
    });
  }

  return (
    <Card withBorder padding="lg">
      <Group justify="space-between" mb="md">
        <Title order={4}>Fichiers</Title>
        <Text size="sm" c="dimmed">
          {files.length}/{TICKET_FILE_MAX_COUNT}
        </Text>
      </Group>

      <Stack gap="md">
        {files.length > 0 && (
          <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
            {files.map((file) => (
              <Box key={file.id} pos="relative">
                {isPreviewImage(file.mimeType) ? (
                  <Image
                    src={ticketFileUrl(ticketId, file.id)}
                    alt={file.name}
                    radius="sm"
                    h={120}
                    w="100%"
                    fit="contain"
                    bg="var(--mantine-color-default-hover)"
                    style={{ cursor: 'zoom-in' }}
                    onClick={() => handleZoom(file)}
                  />
                ) : (
                  <FileCard ticketId={ticketId} file={file} />
                )}
                <ActionIcon
                  variant="filled"
                  color="red"
                  size="sm"
                  aria-label="Supprimer le fichier"
                  pos="absolute"
                  top={4}
                  right={4}
                  loading={deleteMut.isPending && deleteMut.variables === file.id}
                  onClick={() => handleDelete(file)}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Box>
            ))}
          </SimpleGrid>
        )}

        {atMax ? (
          <Text size="sm" c="dimmed" ta="center" py="md">
            Nombre maximum de fichiers atteint ({TICKET_FILE_MAX_COUNT}).
          </Text>
        ) : (
          <Dropzone
            onDrop={handleDrop}
            onReject={() => swalError('Fichier refusé', `${MAX_MB} Mo maximum par fichier.`)}
            maxSize={TICKET_FILE_MAX_BYTES}
            loading={uploadMut.isPending}
          >
            <Group justify="center" gap="md" mih={90} style={{ pointerEvents: 'none' }}>
              <Dropzone.Accept>
                <IconUpload size={36} />
              </Dropzone.Accept>
              <Dropzone.Reject>
                <IconX size={36} />
              </Dropzone.Reject>
              <Dropzone.Idle>
                <IconFile size={36} />
              </Dropzone.Idle>
              <Stack gap={2}>
                <Text size="sm" inline>
                  Glissez des fichiers ici, ou cliquez pour parcourir
                </Text>
                <Text size="xs" c="dimmed" inline>
                  Images & documents · {MAX_MB} Mo max · {slots} restant(s)
                </Text>
              </Stack>
            </Group>
          </Dropzone>
        )}
      </Stack>
    </Card>
  );
}

function FileCard({
  ticketId,
  file,
}: {
  ticketId: string;
  file: TicketFilePublic;
}): JSX.Element {
  const Icon = fileIcon(file.mimeType, file.name);
  return (
    <Anchor
      href={ticketFileUrl(ticketId, file.id)}
      target="_blank"
      rel="noopener noreferrer"
      underline="never"
      c="inherit"
      title={`Télécharger ${file.name}`}
    >
      <Stack
        gap={6}
        align="center"
        justify="center"
        h={120}
        p="xs"
        style={{
          borderRadius: 'var(--mantine-radius-sm)',
          background: 'var(--mantine-color-default-hover)',
          textAlign: 'center',
        }}
      >
        <Icon size={34} />
        <Text size="xs" fw={500} lineClamp={2} style={{ wordBreak: 'break-word' }}>
          {file.name}
        </Text>
        <Group gap={4} c="dimmed">
          <IconDownload size={12} />
          <Text size="xs">{formatSize(file.size)}</Text>
        </Group>
      </Stack>
    </Anchor>
  );
}
