/* Invite emails: plain functions that build the subject, HTML and text. No dependencies, so they can be
   previewed locally with `node preview.js` without installing anything. */

const GREEN = "#0a3622", GOLD = "#c8a24a", INK = "#1f2a24", MUTED = "#5b6b62", BG = "#f6f3ea";

const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const PERMS = { mosques: "manage every mosque on MasjidHub", applications: "review requests to add new mosques" };

// kind: "admin" (site admin) or "mosque" (owner/editor of one mosque)
function inviteEmail({ kind, inviter, mosqueName, role, perms, link, email }) {
  const who = inviter ? esc(inviter) : "The MasjidHub team";
  let subject, lead, what;
  if (kind === "admin") {
    const can = Object.keys(PERMS).filter(k => perms && perms[k]).map(k => PERMS[k]);
    subject = "You're invited to help run MasjidHub";
    lead = `${who} invited you to be a <strong>site admin</strong> on MasjidHub.`;
    what = can.length ? `You'll be able to ${can.join(" and ")}.` : "The top admin will choose what you can do.";
  } else {
    subject = `You're invited to help run ${mosqueName} on MasjidHub`;
    lead = `${who} invited you to be ${role === "owner" ? "an <strong>owner</strong>" : "an <strong>editor</strong>"} of <strong>${esc(mosqueName)}</strong> on MasjidHub.`;
    what = role === "owner"
      ? "You'll be able to update iqamah times, events and announcements, and manage the mosque's details and team."
      : "You'll be able to update iqamah times, events and announcements.";
  }
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${INK}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden">
  <tr><td style="background:${GREEN};padding:22px 28px;color:#ffffff;font-size:20px;font-weight:700">MasjidHub</td></tr>
  <tr><td style="padding:28px">
    <p style="margin:0 0 6px;color:${GOLD};font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase">Invitation</p>
    <p style="margin:0 0 14px;font-size:18px;line-height:1.5">Assalamu alaikum,</p>
    <p style="margin:0 0 12px;font-size:16px;line-height:1.6">${lead}</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:${MUTED}">${esc(what)}</p>
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:999px;background:${GREEN}">
      <a href="${esc(link)}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none">Accept the invite</a>
    </td></tr></table>
    <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:${MUTED}">The button signs you in to MasjidHub as <strong>${esc(email)}</strong>, with no password needed, even if you don't have an account yet. Then tap <strong>Accept</strong>. The link works once.</p>
  </td></tr>
  <tr><td style="padding:18px 28px;border-top:1px solid #ece7da;font-size:12px;line-height:1.6;color:${MUTED}">Not expecting this? You can ignore this email; nothing happens unless you accept.</td></tr>
</table></td></tr></table></body></html>`;
  const text = `Assalamu alaikum,\n\n${lead.replace(/<[^>]+>/g, "")}\n${what}\n\nAccept the invite: ${link}\n\nThe link signs you in as ${email} (no password needed, even without an account), then tap Accept. It works once.\n\nNot expecting this? Ignore this email.`;
  return { subject, html, text };
}

module.exports = { inviteEmail };
