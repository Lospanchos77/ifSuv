export interface PasswordResetTemplateInput {
  firstName: string;
  resetUrl: string;
  ttlHours: number;
}

export interface MailContent {
  subject: string;
  text: string;
  html: string;
}

export function passwordResetTemplate(input: PasswordResetTemplateInput): MailContent {
  const { firstName, resetUrl, ttlHours } = input;
  const subject = 'Réinitialisation de votre mot de passe IFSUV';

  const text =
    `Bonjour ${firstName},\n\n` +
    'Une réinitialisation de mot de passe a été demandée pour votre compte IFSUV.\n' +
    `Pour définir un nouveau mot de passe, ouvrez le lien ci-dessous (valide ${ttlHours}h) :\n\n` +
    `${resetUrl}\n\n` +
    "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n\n" +
    "L'équipe IFSUV";

  const html = `
<!doctype html>
<html lang="fr">
  <body style="font-family: system-ui, -apple-system, sans-serif; color: #1f2937; max-width: 560px; margin: 0 auto; padding: 24px;">
    <h2 style="color: #4f46e5; margin-bottom: 16px;">Réinitialisation de mot de passe</h2>
    <p>Bonjour ${escapeHtml(firstName)},</p>
    <p>Une réinitialisation de mot de passe a été demandée pour votre compte IFSUV.</p>
    <p>Pour définir un nouveau mot de passe, cliquez sur le bouton ci-dessous (valide <strong>${ttlHours}h</strong>) :</p>
    <p style="margin: 24px 0;">
      <a href="${resetUrl}" style="background: #4f46e5; color: #fff; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
        Définir un nouveau mot de passe
      </a>
    </p>
    <p style="color: #6b7280; font-size: 13px;">Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br><span style="word-break: break-all;">${resetUrl}</span></p>
    <p style="color: #6b7280; font-size: 13px;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="color: #9ca3af; font-size: 12px;">L'équipe IFSUV</p>
  </body>
</html>`.trim();

  return { subject, text, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
