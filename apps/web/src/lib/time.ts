/**
 * Format relatif court à la française : "il y a 3 j", "il y a 2 h", etc.
 * Utilisé pour le timer de création des tickets.
 */
export function timeAgo(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "à l'instant";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `il y a ${diffD} j`;
  const diffMo = Math.floor(diffD / 30);
  if (diffMo < 12) return `il y a ${diffMo} mois`;
  const diffY = Math.floor(diffMo / 12);
  return `il y a ${diffY} an${diffY > 1 ? 's' : ''}`;
}

export function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR');
}
