import { Button, Center, Loader, Stack, Text } from '@mantine/core';
import { IconArrowLeft, IconPrinter } from '@tabler/icons-react';
import { Link, useParams } from 'react-router-dom';
import { useSiteSettings } from '../../features/settings/hooks';
import { useTicket } from '../../features/tickets/hooks';
import './print.css';

export function TicketFichePage(): JSX.Element {
  const params = useParams();
  const id = params['id'];
  const { data: ticket, isLoading, isError, error } = useTicket(id);
  const settings = useSiteSettings();

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

  const s = settings.data;
  const companyName = s?.companyName || s?.siteName || 'IFSUV';
  const phone = s?.supportPhone;
  const address = s?.companyAddress;
  const siret = s?.companySiret;
  const logo = s?.logoDataUrl;

  // « Travaux à effectuer » = champ custom dont la clé/le libellé mentionne "travaux".
  const worksField = s?.customTicketFields?.find((f) =>
    `${f.key} ${f.label}`.toLowerCase().includes('travaux'),
  );
  const worksRaw = worksField ? ticket.customFieldsData?.[worksField.key] : undefined;
  const works =
    worksRaw === undefined || worksRaw === null || worksRaw === '' ? undefined : String(worksRaw);

  const dateStr = ticket.createdAt
    ? new Date(ticket.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
    : '—';
  const tech = ticket.assignedTech
    ? `${ticket.assignedTech.firstName} ${ticket.assignedTech.lastName}`
    : '—';
  const type = ticket.meta?.isLaptop ? 'Portable' : 'Tour';
  const yesNo = (v?: boolean): string => (v ? 'Oui' : 'Non');

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
          Imprimer la fiche
        </Button>
      </div>

      <div className="fiche-sheet">
        <div className="fiche-header">
          {logo ? (
            <img src={logo} alt={companyName} className="fiche-logo" />
          ) : (
            <div className="fiche-logo-text">{companyName}</div>
          )}
        </div>

        <div className="fiche-top">
          <div className="fiche-qr-box">
            <div className="fiche-qr-label">SCAN QR CODE</div>
            <img
              src={`/api/v1/tickets/${ticket.id}/qr/client`}
              alt="QR Client"
              className="fiche-qr-img"
            />
          </div>
          <div className="fiche-intro">
            <h2 className="fiche-title">A quoi ça sert ?</h2>
            <p>
              Le <strong>QRCode</strong> vous permet de connaître l&apos;état d&apos;avancement des
              travaux et/ou diagnostics de votre matériel informatique.
            </p>
          </div>
          <div className="fiche-scan">
            <h3 className="fiche-subtitle">Scaner le QRCode sur iOS</h3>
            <p>
              1- Ouvrir l&apos;appareil photo
              <br />
              2- Faire la mise au point sur le QR Code
              <br />
              3- Appuyez sur la notification qui s&apos;affiche
            </p>
            <h3 className="fiche-subtitle">Scaner le QRCode sur Android</h3>
            <p>
              1- Ouvrir Google Lens
              <br />
              2- Faire la mise au point sur le QR Code
              <br />
              3- Appuyez sur le point bleu pour ouvrir le contenu
            </p>
          </div>
        </div>

        <hr className="fiche-sep" />

        <div className="fiche-cols">
          <div>
            <h2 className="fiche-title">Nous contacter</h2>
            <p>
              <span className="fiche-label">Date de prise en charge:</span>{' '}
              <span className="fiche-value">{dateStr}</span>
            </p>
            <p>
              <span className="fiche-label">Technicien:</span>{' '}
              <span className="fiche-value">{tech}</span>
            </p>
            <p>
              <span className="fiche-label">Téléphone :</span>{' '}
              <span className="fiche-value">{phone || '—'}</span>
            </p>
            <p>
              <span className="fiche-label">Référence :</span>{' '}
              <span className="fiche-value">{ticket.ref}</span>
            </p>
          </div>
          <div>
            <h2 className="fiche-title">Materiel pris en charge</h2>
            <p>
              <span className="fiche-label">Client:</span>{' '}
              <span className="fiche-value">{ticket.customerName || '—'}</span>
            </p>
            <p>
              <span className="fiche-label">Type:</span> <span className="fiche-value">{type}</span>
              {'  '}
              <span className="fiche-label">Saccoche:</span>{' '}
              <span className="fiche-value">{yesNo(ticket.meta?.hasBag)}</span>
              {'  '}
              <span className="fiche-label">Chargeur:</span>{' '}
              <span className="fiche-value">{yesNo(ticket.meta?.hasCharger)}</span>
            </p>
            <p>
              <span className="fiche-label">Autres:</span>{' '}
              <span className="fiche-value">{ticket.meta?.otherMaterial || ''}</span>
            </p>
          </div>
        </div>

        <hr className="fiche-sep" />

        <div className="fiche-desc">
          <h2 className="fiche-title">Description du problème</h2>
          {works && (
            <p>
              <span className="fiche-label">Travaux à effectuer:</span>{' '}
              <span className="fiche-value">{works}</span>
            </p>
          )}
          <p className="fiche-label">Problème:</p>
          <p className="fiche-pre fiche-value">{ticket.problemType || '—'}</p>
        </div>

        <hr className="fiche-sep" />

        <div className="fiche-footer">
          <div>
            <h2 className="fiche-title">{companyName}</h2>
            {address && <div className="fiche-address">{address}</div>}
            {phone && <div className="fiche-phone">{phone}</div>}
            {siret && <div className="fiche-siret">SIRET : {siret}</div>}
          </div>
          <div className="fiche-cachet">Cachet et signature:</div>
        </div>
      </div>
    </div>
  );
}
