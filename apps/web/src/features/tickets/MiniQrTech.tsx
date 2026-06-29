import { Image, Tooltip, UnstyledButton } from '@mantine/core';
import Swal from 'sweetalert2';

interface Props {
  ticketId: string;
  ticketRef?: string;
  size?: number;
}

/**
 * Mini QR code technicien (cliquable pour zoom). Utilisé dans la home et la
 * liste des tickets. Le QR pointe vers `/t/t/<techToken>` qui ouvre la fiche
 * en édition pour les utilisateurs admin/technicien authentifiés.
 *
 * NOTE: la prop `ref` est réservée par React (ref forwarding), donc on utilise
 * `ticketRef` pour la référence métier du ticket (T-2026-XXXX).
 */
export function MiniQrTech({ ticketId, ticketRef, size = 40 }: Props): JSX.Element {
  const src = `/api/v1/tickets/${ticketId}/qr/tech`;
  const title = ticketRef ? `QR Tech — ${ticketRef}` : 'QR Technicien';

  function handleClick(e: React.MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    void Swal.fire({
      title,
      imageUrl: src,
      imageWidth: 280,
      imageHeight: 280,
      imageAlt: title,
      showConfirmButton: false,
      showCloseButton: true,
    });
  }

  return (
    <Tooltip label="Cliquer pour agrandir" position="left">
      <UnstyledButton onClick={handleClick} aria-label={title}>
        <Image
          src={src}
          alt={title}
          w={size}
          h={size}
          fit="contain"
          bg="white"
          radius="sm"
          style={{ cursor: 'pointer', padding: 2 }}
        />
      </UnstyledButton>
    </Tooltip>
  );
}
