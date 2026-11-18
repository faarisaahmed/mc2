/* MasjidHub Cloud Functions. Needs the Blaze (pay-as-you-go) plan; see README.md for turning it on.

   Invite emails: when an admin creates an invite in the dashboard (admin.html), this sends the invitee a
   MasjidHub-branded email with a one-tap sign-in link. Covers site-admin invites (adminInvites/{email}) and
   mosque team invites (mosques/{m}/invites/{email}), including the owner invite made when an application is approved.
   The site stops sending Firebase's plain "Sign in to MasjidHub" email once SERVER_EMAILS is true in assets/js/db.js. */
const { onDocumentWritten, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");
const { inviteEmail, applicationEmail } = require("./email");

initializeApp();
const SITE = "https://faarisaahmed.github.io/mc2/";
// Sending account (a Gmail address and its app password). Kept as secrets so they aren't in this public repo.
const SMTP_USER = defineSecret("SMTP_USER");
const SMTP_PASS = defineSecret("SMTP_PASS");

// Send on a new invite, or when an admin re-sends one (the dashboard writes a new "created" time).
function isNewInvite(event) {
  const before = event.data.before.exists ? event.data.before.data() : null;
  const after = event.data.after.exists ? event.data.after.data() : null;
  if (!after) return null;
  if (before && before.created && after.created && before.created.isEqual(after.created)) return null;
  return after;
}

async function inviterName(uid) {
  if (!uid) return "";
  try {
    const u = await getAuth().getUser(uid);
    return u.displayName || "";
  } catch (e) { return ""; }
}

async function send(to, mail, replyTo) {
  const t = nodemailer.createTransport({ service: "gmail", auth: { user: SMTP_USER.value(), pass: SMTP_PASS.value() } });
  await t.sendMail({ from: { name: "MasjidHub", address: SMTP_USER.value() }, to, subject: mail.subject, html: mail.html, text: mail.text, replyTo: replyTo || SMTP_USER.value() });
}

async function signInLink(email) {
  return getAuth().generateSignInWithEmailLink(email, {
    url: SITE + "account.html?invited=" + encodeURIComponent(email),
    handleCodeInApp: true
  });
}

const opts = { secrets: [SMTP_USER, SMTP_PASS], region: "us-central1", maxInstances: 2 };

exports.emailAdminInvite = onDocumentWritten({ document: "adminInvites/{email}", ...opts }, async event => {
  const inv = isNewInvite(event);
  if (!inv) return;
  const email = event.params.email;
  const mail = inviteEmail({ kind: "admin", inviter: await inviterName(inv.invitedBy), perms: inv.perms, link: await signInLink(email), email });
  await send(email, mail);
  logger.info("Sent site admin invite");
});

exports.emailMosqueInvite = onDocumentWritten({ document: "mosques/{mosque}/invites/{email}", ...opts }, async event => {
  const inv = isNewInvite(event);
  if (!inv) return;
  const email = event.params.email;
  let mosqueName = inv.mosqueName;
  if (!mosqueName) {
    const m = await getFirestore().doc("mosques/" + event.params.mosque).get();
    mosqueName = (m.exists && m.data().name) || "your mosque";
  }
  const mail = inviteEmail({ kind: "mosque", inviter: await inviterName(inv.invitedBy), mosqueName, role: inv.role, link: await signInLink(email), email });
  await send(email, mail);
  logger.info("Sent mosque invite", { mosque: event.params.mosque });
});

// "Add your mosque": tell the applicant when a reviewer asks for more info or declines, with the reviewer's note.
// (Approval needs no email here: approving creates an owner invite, and emailMosqueInvite sends that.)
exports.emailApplicationUpdate = onDocumentUpdated({ document: "applications/{id}", ...opts }, async event => {
  const before = event.data.before.data(), after = event.data.after.data();
  if (!after || !after.email || !["info", "rejected"].includes(after.status)) return;
  if (before.status === after.status && before.note === after.note) return;
  await send(after.email, applicationEmail({ status: after.status, mosqueName: after.name, contact: after.contact, note: after.note }));
  logger.info("Sent application update", { status: after.status });
});
