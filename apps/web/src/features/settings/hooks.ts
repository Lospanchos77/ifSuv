import type { SiteSettingsUpdateInput } from '@ifsuv/shared';
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

const KEY = ['site-settings'] as const;

export function useSiteSettings() {
  const query = useQuery({
    queryKey: KEY,
    queryFn: () => api.getSiteSettings(),
    staleTime: 5 * 60 * 1000,
  });

  // Met à jour le <title> du document avec le siteName
  useEffect(() => {
    if (query.data?.siteName) {
      document.title = query.data.siteName;
    }
  }, [query.data?.siteName]);

  // Injecte / met à jour le favicon depuis le logo uploadé (data URI).
  // Les navigateurs modernes acceptent PNG/SVG dans <link rel="icon">.
  useEffect(() => {
    const dataUrl = query.data?.logoDataUrl;
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    if (dataUrl) {
      link.href = dataUrl;
    } else {
      // Pas de logo : on retire le favicon (le navigateur affichera le default)
      link.removeAttribute('href');
    }
  }, [query.data?.logoDataUrl]);

  return query;
}

export function useUpdateSiteSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SiteSettingsUpdateInput) => api.updateSiteSettings(input),
    onSuccess: (data) => {
      qc.setQueryData(KEY, data);
      void qc.invalidateQueries({ queryKey: KEY });
    },
  });
}
