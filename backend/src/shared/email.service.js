const nodemailer = require("nodemailer");
const env = require("../config/env");

function isEmailConfigured() {
  return Boolean(
    env.email.enabled &&
      env.email.host &&
      env.email.port &&
      env.email.user &&
      env.email.pass
  );
}

function createTransporter() {
  return nodemailer.createTransport({
    host: env.email.host,
    port: env.email.port,
    secure: env.email.secure,
    auth: {
      user: env.email.user,
      pass: env.email.pass,
    },
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendEmail({ to, subject, text, html }) {
  if (!isEmailConfigured()) {
    console.log("[EMAIL DISABILITATA] Configurazione SMTP mancante.");
    console.log("[EMAIL DESTINATARIO]", to);
    console.log("[EMAIL OGGETTO]", subject);

    return {
      sent: false,
      skipped: true,
    };
  }

  const transporter = createTransporter();

  await transporter.sendMail({
    from: env.email.from,
    to,
    subject,
    text,
    html,
  });

  return {
    sent: true,
    skipped: false,
  };
}

async function sendWelcomeEmail({ to, name }) {
  const safeName = escapeHtml(name || "utente");
  const appUrl = env.frontendUrl;

  return sendEmail({
    to,
    subject: "Benvenuto su Manca il Decimo ⚽",
    text: `Ciao ${name || "utente"},

Benvenuto su Manca il Decimo!

Il tuo account è stato creato correttamente.
Ora puoi trovare partite, partecipare e gestire il tuo profilo.

Vai all'app: ${appUrl}

Buon calcetto!
Il team di Manca il Decimo`,
    html: `
      <div style="margin:0;padding:0;background:#f4f7f2;font-family:Arial,sans-serif;color:#111817;">
        <div style="max-width:560px;margin:0 auto;padding:28px 16px;">
          <div style="background:#050909;border-radius:22px 22px 0 0;padding:26px 22px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:900;">
              Manca il Decimo ⚽
            </h1>
          </div>

          <div style="background:#ffffff;border-radius:0 0 22px 22px;padding:28px 22px;box-shadow:0 14px 30px rgba(0,0,0,0.08);">
            <h2 style="margin:0 0 14px;color:#111817;font-size:22px;">
              Benvenuto su Manca il Decimo!
            </h2>

            <p style="margin:0 0 14px;color:#39413f;font-size:15px;line-height:1.5;">
              Ciao <strong>${safeName}</strong>,
            </p>

            <p style="margin:0 0 14px;color:#39413f;font-size:15px;line-height:1.5;">
              Il tuo account è stato creato correttamente.
              Ora puoi trovare partite, partecipare e gestire il tuo profilo.
            </p>

            <div style="text-align:center;margin:28px 0;">
              <a
                href="${appUrl}"
                style="display:inline-block;background:#9bea1c;color:#111817;text-decoration:none;font-weight:900;padding:13px 24px;border-radius:999px;"
              >
                Vai all'app
              </a>
            </div>

            <p style="margin:0;color:#6f7977;font-size:13px;line-height:1.5;">
              Buon calcetto,<br />
              Il team di Manca il Decimo
            </p>
          </div>
        </div>
      </div>
    `,
  });
}

async function sendPasswordResetEmail({ to, name, resetLink, expiresAt }) {
  const safeName = escapeHtml(name || "utente");
  const expiresAtLabel = expiresAt
    ? new Date(expiresAt).toLocaleString("it-IT")
    : "";

  return sendEmail({
    to,
    subject: "Reimposta la tua password - Manca il Decimo",
    text: `Ciao ${name || "utente"},

Abbiamo ricevuto una richiesta per reimpostare la password del tuo account.

Clicca questo link per scegliere una nuova password:
${resetLink}

Il link scade tra poco. Se non hai richiesto tu il reset, ignora questa email.

Il team di Manca il Decimo`,
    html: `
      <div style="margin:0;padding:0;background:#f4f7f2;font-family:Arial,sans-serif;color:#111817;">
        <div style="max-width:560px;margin:0 auto;padding:28px 16px;">
          <div style="background:#050909;border-radius:22px 22px 0 0;padding:26px 22px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:900;">
              Manca il Decimo ⚽
            </h1>
          </div>

          <div style="background:#ffffff;border-radius:0 0 22px 22px;padding:28px 22px;box-shadow:0 14px 30px rgba(0,0,0,0.08);">
            <h2 style="margin:0 0 14px;color:#111817;font-size:22px;">
              Reimposta la tua password
            </h2>

            <p style="margin:0 0 14px;color:#39413f;font-size:15px;line-height:1.5;">
              Ciao <strong>${safeName}</strong>,
            </p>

            <p style="margin:0 0 14px;color:#39413f;font-size:15px;line-height:1.5;">
              Abbiamo ricevuto una richiesta per reimpostare la password del tuo account.
              Clicca il pulsante qui sotto per crearne una nuova.
            </p>

            <div style="text-align:center;margin:28px 0;">
              <a
                href="${resetLink}"
                style="display:inline-block;background:#9bea1c;color:#111817;text-decoration:none;font-weight:900;padding:13px 24px;border-radius:999px;"
              >
                Reimposta password
              </a>
            </div>

            ${
              expiresAtLabel
                ? `<p style="margin:0 0 14px;color:#6f7977;font-size:13px;line-height:1.5;">
                    Questo link scade il ${expiresAtLabel}.
                  </p>`
                : ""
            }

            <p style="margin:0;color:#6f7977;font-size:13px;line-height:1.5;">
              Se non hai richiesto tu il reset, ignora questa email.<br />
              Il team di Manca il Decimo
            </p>
          </div>
        </div>
      </div>
    `,
  });
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
};