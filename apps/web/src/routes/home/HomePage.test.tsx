import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { HomePage } from './HomePage';

function renderWithProviders(ui: ReactNode): void {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <MemoryRouter>
      <MantineProvider>
        <QueryClientProvider client={qc}>{ui}</QueryClientProvider>
      </MantineProvider>
    </MemoryRouter>,
  );
}

describe('HomePage', () => {
  it('affiche le tableau de bord (cartes de statut + action nouveau ticket)', () => {
    renderWithProviders(<HomePage />);
    // Éléments statiques rendus quel que soit l'état des requêtes (les fetch
    // échouent en test, ce qui est OK : on vérifie juste le shell du dashboard).
    expect(screen.getByText('Nouveaux')).toBeInTheDocument();
    expect(screen.getByText('En cours')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /nouveau ticket/i })).toBeInTheDocument();
  });
});
