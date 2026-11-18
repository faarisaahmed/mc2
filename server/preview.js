// Writes preview-*.html files to look at the invite emails in a browser: node preview.js
const fs = require("fs");
const { inviteEmail, applicationEmail } = require("./email");
const link = "https://faarisaahmed.github.io/mc2/account.html?invited=someone%40example.com";
const samples = {
  admin: { kind: "admin", inviter: "Faaris Ahmed", perms: { mosques: true, applications: true }, link, email: "someone@example.com" },
  owner: { kind: "mosque", inviter: "Faaris Ahmed", mosqueName: "Muslim Center of Greater Princeton", role: "owner", link, email: "someone@example.com" },
  editor: { kind: "mosque", inviter: "", mosqueName: "Muslim Center of Greater Princeton", role: "editor", link, email: "someone@example.com" }
};
for (const [k, v] of Object.entries(samples)) {
  const m = inviteEmail(v);
  fs.writeFileSync(`preview-${k}.html`, m.html);
  console.log(`preview-${k}.html  subject: ${m.subject}`);
}
for (const status of ["info", "rejected"]) {
  const m = applicationEmail({ status, mosqueName: "Masjid Example", contact: "Aisha Khan", note: status === "info" ? "Could you send a link to the mosque's website or a photo of its sign?" : "We couldn't confirm this location is open to the public." });
  fs.writeFileSync(`preview-app-${status}.html`, m.html);
  console.log(`preview-app-${status}.html  subject: ${m.subject}`);
}
