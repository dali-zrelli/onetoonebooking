const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'dalizrelli20@gmail.com',
    pass: 'lgyzrbdqtaglbpll'
  }
})

const BASE_URL = 'http://localhost:3000'
const LOGO = 'https://cdn-icons-png.flaticon.com/512/3176/3176366.png'

function baseTemplate(title, content) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
<tr><td style="background:linear-gradient(135deg,#ff385c,#e31c5f);padding:32px 40px;text-align:center">
  <img src="${LOGO}" width="48" height="48" style="vertical-align:middle;margin-bottom:8px">
  <h1 style="color:#fff;font-size:24px;margin:0;font-weight:700">ONETOONE<span style="font-weight:400;opacity:.9">.booking</span></h1>
</td></tr>
<tr><td style="padding:36px 40px">
  <h2 style="color:#222;font-size:20px;margin:0 0 16px">${title}</h2>
  ${content}
</td></tr>
<tr><td style="background:#f9f9f9;padding:24px 40px;text-align:center;border-top:1px solid #eee">
  <p style="color:#999;font-size:12px;margin:0">ONETOONE.booking &mdash; Réservation de logements entre particuliers</p>
  <p style="color:#bbb;font-size:11px;margin:8px 0 0">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

function sendMail(to, subject, title, content) {
  return transporter.sendMail({
    from: '"ONETOONE.booking" <dalizrelli20@gmail.com>',
    to,
    subject,
    html: baseTemplate(title, content)
  })
}

function sendVerificationEmail(email, name, token) {
  const link = `${BASE_URL}/api/auth/verify-email?token=${token}`
  return sendMail(email, 'Confirmez votre email - ONETOONE.booking', `Bienvenue ${name} !`,
    `<p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 20px">
      Merci de vous être inscrit sur <strong>ONETOONE.booking</strong> !<br>
      Veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous :
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px">
      <tr>
        <td style="background:#ff385c;border-radius:8px;padding:14px 32px">
          <a href="${link}" style="color:#fff;text-decoration:none;font-size:16px;font-weight:600;display:inline-block">Confirmer mon email</a>
        </td>
      </tr>
    </table>
    <p style="color:#999;font-size:13px;margin:0">Ou copiez ce lien dans votre navigateur :</p>
    <p style="color:#ff385c;font-size:13px;word-break:break-all;margin:4px 0 0">${link}</p>`
  )
}

function sendWelcomeEmail(email, name) {
  return sendMail(email, 'Bienvenue sur ONETOONE.booking !', `Bienvenue ${name} !`,
    `<p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 16px">
      Votre compte a été créé avec succès sur <strong>ONETOONE.booking</strong>.
    </p>
    <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 20px">
      Vous pouvez dès maintenant :<br>
      &bull; Parcourir les logements disponibles<br>
      &bull; Réserver votre prochain séjour<br>
      &bull; Devenir hôte et publier vos annonces
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto">
      <tr>
        <td style="background:#ff385c;border-radius:8px;padding:14px 32px">
          <a href="${BASE_URL}" style="color:#fff;text-decoration:none;font-size:16px;font-weight:600;display:inline-block">Découvrir les logements</a>
        </td>
      </tr>
    </table>`
  )
}

function sendBookingRequestEmail(hostEmail, hostName, guestName, listingTitle, checkIn, checkOut, nights, totalPrice, message) {
  return sendMail(hostEmail, `Nouvelle demande de réservation - ${listingTitle}`, `Nouvelle réservation`,
    `<p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 16px">
      Bonjour <strong>${hostName}</strong>,
    </p>
    <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 20px">
      <strong>${guestName}</strong> souhaite réserver votre logement <strong>${listingTitle}</strong>.
    </p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background:#f9f9f9;border-radius:8px;margin-bottom:20px">
      <tr><td style="border-bottom:1px solid #eee;color:#555"><strong style="color:#222">Arrivée</strong> ${checkIn}</td></tr>
      <tr><td style="border-bottom:1px solid #eee;color:#555"><strong style="color:#222">Départ</strong> ${checkOut}</td></tr>
      <tr><td style="border-bottom:1px solid #eee;color:#555"><strong style="color:#222">Nuits</strong> ${nights}</td></tr>
      <tr><td style="border-bottom:1px solid #eee;color:#555"><strong style="color:#222">Total</strong> ${totalPrice}€</td></tr>
      ${message ? `<tr><td style="color:#555"><strong style="color:#222">Message</strong><br>${message}</td></tr>` : ''}
    </table>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto">
      <tr>
        <td style="background:#ff385c;border-radius:8px;padding:14px 32px">
          <a href="${BASE_URL}" style="color:#fff;text-decoration:none;font-size:16px;font-weight:600;display:inline-block">Gérer mes réservations</a>
        </td>
      </tr>
    </table>`
  )
}

function sendBookingStatusEmail(email, name, listingTitle, status, checkIn, checkOut, totalPrice) {
  const statusLabels = { confirmé: 'confirmée', annulé: 'annulée', terminé: 'terminée' }
  const statusColors = { confirmé: '#10b981', annulé: '#ef4444', terminé: '#3b82f6' }
  const label = statusLabels[status] || status
  const color = statusColors[status] || '#555'
  const icons = { confirmé: '✅', annulé: '❌', terminé: '🎉' }

  return sendMail(email, `Réservation ${label} - ${listingTitle}`, `${icons[status]||''} Réservation ${label}`,
    `<p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 16px">
      Bonjour <strong>${name}</strong>,
    </p>
    <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 20px">
      Votre réservation pour <strong>${listingTitle}</strong> a été <strong style="color:${color}">${label}</strong>.
    </p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background:#f9f9f9;border-radius:8px;margin-bottom:20px">
      <tr><td style="border-bottom:1px solid #eee;color:#555"><strong style="color:#222">Arrivée</strong> ${checkIn}</td></tr>
      <tr><td style="border-bottom:1px solid #eee;color:#555"><strong style="color:#222">Départ</strong> ${checkOut}</td></tr>
      <tr><td style="color:#555"><strong style="color:#222">Total</strong> ${totalPrice}€</td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto">
      <tr>
        <td style="background:#ff385c;border-radius:8px;padding:14px 32px">
          <a href="${BASE_URL}" style="color:#fff;text-decoration:none;font-size:16px;font-weight:600;display:inline-block">Voir mes réservations</a>
        </td>
      </tr>
    </table>`
  )
}

module.exports = { sendVerificationEmail, sendWelcomeEmail, sendBookingRequestEmail, sendBookingStatusEmail }
