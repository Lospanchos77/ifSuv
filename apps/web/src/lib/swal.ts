import Swal, { type SweetAlertIcon, type SweetAlertResult } from 'sweetalert2';

/**
 * Wrapper SweetAlert2 — usage IFSUV.
 *
 * Conventions :
 * - `swalSuccess` / `swalError` / `swalInfo` / `swalWarning` → toasts en haut à droite
 *   (4s, non bloquant)
 * - `swalConfirm` → modal de confirmation (dangerous => couleur rouge)
 * - `swalPrompt` → modal avec champ texte (retourne la valeur ou null)
 *
 * Le look respecte le theme dark via la classe `swal-dark` mise sur <html>
 * (gérée automatiquement par syncSwalTheme dans main.tsx).
 */

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 4000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  },
});

function fireToast(icon: SweetAlertIcon, title: string, text?: string): void {
  void Toast.fire({ icon, title, text });
}

export function swalSuccess(title: string, text?: string): void {
  fireToast('success', title, text);
}

export function swalError(title: string, text?: string): void {
  fireToast('error', title, text);
}

export function swalInfo(title: string, text?: string): void {
  fireToast('info', title, text);
}

export function swalWarning(title: string, text?: string): void {
  fireToast('warning', title, text);
}

export interface ConfirmOptions {
  title: string;
  text?: string;
  html?: string;
  confirmText?: string;
  cancelText?: string;
  /** Si true, bouton confirm en rouge (action destructive) */
  danger?: boolean;
  icon?: SweetAlertIcon;
}

export async function swalConfirm(options: ConfirmOptions): Promise<boolean> {
  const result = await Swal.fire({
    title: options.title,
    text: options.text,
    html: options.html,
    icon: options.icon ?? (options.danger ? 'warning' : 'question'),
    showCancelButton: true,
    confirmButtonText: options.confirmText ?? 'Confirmer',
    cancelButtonText: options.cancelText ?? 'Annuler',
    confirmButtonColor: options.danger ? '#e03131' : '#4f46e5',
    cancelButtonColor: '#6c757d',
    reverseButtons: true,
    focusCancel: !!options.danger,
  });
  return result.isConfirmed;
}

export interface PromptOptions {
  title: string;
  text?: string;
  placeholder?: string;
  initialValue?: string;
  inputType?: 'text' | 'url' | 'email' | 'password' | 'textarea';
  confirmText?: string;
  cancelText?: string;
  validator?: (value: string) => string | null;
}

export async function swalPrompt(options: PromptOptions): Promise<string | null> {
  const result: SweetAlertResult<string> = await Swal.fire({
    title: options.title,
    text: options.text,
    input: options.inputType ?? 'text',
    inputPlaceholder: options.placeholder,
    inputValue: options.initialValue ?? '',
    showCancelButton: true,
    confirmButtonText: options.confirmText ?? 'OK',
    cancelButtonText: options.cancelText ?? 'Annuler',
    confirmButtonColor: '#4f46e5',
    cancelButtonColor: '#6c757d',
    reverseButtons: true,
    inputValidator: options.validator
      ? (value: string) => options.validator!(value) ?? null
      : undefined,
  });
  if (!result.isConfirmed) return null;
  return result.value ?? '';
}

/**
 * Synchronise le theme SweetAlert2 avec le color scheme de Mantine.
 * À appeler une fois au boot + à chaque changement de theme.
 * Mantine ajoute `data-mantine-color-scheme="dark"` sur <html>, on s'aligne.
 */
export function syncSwalTheme(): void {
  const observer = new MutationObserver(() => applySwalTheme());
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-mantine-color-scheme'],
  });
  applySwalTheme();
}

function applySwalTheme(): void {
  const scheme = document.documentElement.getAttribute('data-mantine-color-scheme');
  if (scheme === 'dark') {
    document.documentElement.classList.add('swal-dark');
  } else {
    document.documentElement.classList.remove('swal-dark');
  }
}
