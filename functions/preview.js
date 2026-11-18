// Writes preview-*.html files to look at the invite emails in a browser: node preview.js
const fs = require("fs");
const { inviteEmail } = require("./email");
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
