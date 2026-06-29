import type { SiteSettings, SiteSettingsUpdateInput } from '@ifsuv/shared';
import { apiFetch } from '../../lib/api-client';

export function getSiteSettings(): Promise<SiteSettings> {
  return apiFetch<SiteSettings>('/settings', { skipAuthRedirect: true });
}

export function updateSiteSettings(
  input: SiteSettingsUpdateInput,
): Promise<SiteSettings> {
  return apiFetch<SiteSettings>('/settings', { method: 'PATCH', body: input });
}
