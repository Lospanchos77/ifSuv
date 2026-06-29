import { Button, Center, Loader, Stack, Text } from '@mantine/core';
import { IconArrowLeft, IconPrinter } from '@tabler/icons-react';
import { Link, useParams } from 'react-router-dom';
import { useTicket } from '../../features/tickets/hooks';
import './print.css';

export function TicketLabelPage(): JSX.Element {
  const params = useParams();
  const id = params['id'];
  const { data: ticket, isLoading, isError, error } = useTicket(id);

  if (isLoading) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }
  if (isError || !ticket) {
    return (
      <Center h="100vh">
        <Stack>
          <Text c="red">Erreur : {(error as Error)?.message ?? 'Ticket introuvable'}</Text>
          <Link to="/tickets">Retour</Link>
        </Stack>
      </Center>
    );
  }

  return (
    <div className="print-page">
      <div className="print-actions">
        <Button
          component={Link}
          to={`/tickets/${ticket.id}`}
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
        >
          Retour au ticket
        </Button>
        <Button leftSection={<IconPrinter size={16} />} onClick={() => window.print()}>
          Imprimer l&apos;étiquette
        </Button>
      </div>

      <div className="label-sheet">
        <img
          src={`/api/v1/tickets/${ticket.id}/qr/tech`}
          alt="QR Technicien"
          className="label-qr"
        />
        <div className="label-info">
          <div>Nom:</div>
          <div>{ticket.customerName || ''}</div>
          <div>Tel: {ticket.customerPhone || ''}</div>
          <div>ref: {ticket.ref}</div>
          <div>Pass: {ticket.pcPassword || ''}</div>
        </div>
      </div>
    </div>
  );
}
