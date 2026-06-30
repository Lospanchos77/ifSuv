import { Box, Button, Card, Group, Title } from '@mantine/core';
import { IconCheck, IconEdit, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { RichTextDisplay } from '../../components/editor/RichTextDisplay';
import { TipTapEditor } from '../../components/editor/TipTapEditor';
import { swalError, swalSuccess } from '../../lib/swal';
import { uploadDiagImage } from './api';
import { useUpdateTicket } from './hooks';

interface Props {
  ticketId: string;
  diagnosticHtml: string;
}

export function DiagnosticEditor({ ticketId, diagnosticHtml }: Props): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(diagnosticHtml);
  const [hover, setHover] = useState(false);
  const updateMut = useUpdateTicket(ticketId);

  function startEditing(): void {
    setDraft(diagnosticHtml);
    setEditing(true);
  }

  function cancelEditing(): void {
    setDraft(diagnosticHtml);
    setEditing(false);
  }

  async function save(): Promise<void> {
    try {
      await updateMut.mutateAsync({ diagnosticHtml: draft });
      swalSuccess('Diagnostic enregistré');
      setEditing(false);
    } catch (err) {
      swalError('Erreur', err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }

  return (
    <Card withBorder padding="lg">
      <Group justify="space-between" mb="md">
        <Title order={4}>Diagnostic</Title>
        {!editing ? (
          <Button
            variant="default"
            size="xs"
            leftSection={<IconEdit size={14} />}
            onClick={startEditing}
          >
            {diagnosticHtml ? 'Modifier' : 'Saisir'}
          </Button>
        ) : (
          <Group gap="xs">
            <Button
              variant="default"
              size="xs"
              leftSection={<IconX size={14} />}
              onClick={cancelEditing}
              disabled={updateMut.isPending}
            >
              Annuler
            </Button>
            <Button
              size="xs"
              leftSection={<IconCheck size={14} />}
              onClick={save}
              loading={updateMut.isPending}
            >
              Enregistrer
            </Button>
          </Group>
        )}
      </Group>
      {editing ? (
        <TipTapEditor
          value={draft}
          onChange={setDraft}
          placeholder="Décrire le diagnostic, les actions effectuées, l'état du PC…"
          onImageUpload={(file) => uploadDiagImage(ticketId, file)}
        />
      ) : (
        <Box
          onClick={startEditing}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              startEditing();
            }
          }}
          title={diagnosticHtml ? 'Cliquer pour modifier le diagnostic' : 'Cliquer pour saisir le diagnostic'}
          p="xs"
          style={{
            cursor: 'pointer',
            borderRadius: 'var(--mantine-radius-sm)',
            backgroundColor: hover ? 'var(--mantine-color-default-hover)' : undefined,
            transition: 'background-color 120ms ease',
          }}
        >
          <RichTextDisplay
            html={diagnosticHtml}
            emptyText="Aucun diagnostic saisi pour ce ticket."
          />
        </Box>
      )}
    </Card>
  );
}
