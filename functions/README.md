# MasjidHub server code (Cloud Functions)

Written, tested locally, and **not deployed**. Cloud Functions need the Firebase project on the Blaze
(pay-as-you-go) plan, which needs a card. Until then the site works without it: invites send Firebase's plain
"Sign in to MasjidHub" email instead.

## What it does

| Function | When it runs | What it does |
|---|---|---|
| `emailAdminInvite` | The top admin invites a site admin (`adminInvites/{email}`) | Emails a MasjidHub-branded invite with a one-tap "Accept the invite" button |
| `emailMosqueInvite` | Someone is invited to a mosque team (`mosques/{m}/invites/{email}`), including the owner invite when an application is approved | Same, naming the mosque and the role |

The button is a Firebase email sign-in link: it signs the person in (creating their account if needed, with the email
already verified) and lands on `account.html`, where they accept or decline. Emails go out through a Gmail account
using an app password; the address and password are stored as Firebase secrets, never in this repo.

`email.js` builds the emails. To look at them: `node preview.js`, then open the `preview-*.html` files.

## Turning it on

1. **Blaze plan:** Firebase console, Settings, Usage and billing, Modify plan, Blaze. Add a budget alert (for example $1).
   At MasjidHub's size this should stay inside the free allowance.
2. **Sending account:** use a Gmail account for MasjidHub with 2-Step Verification on. Create an app password at
   https://myaccount.google.com/apppasswords (name it "MasjidHub").
3. **Secrets** (from the repo root, logged in to the Firebase CLI as the project owner):
   ```bash
   firebase functions:secrets:set SMTP_USER   # the Gmail address
   firebase functions:secrets:set SMTP_PASS   # the 16-letter app password
   ```
4. **Deploy:**
   ```bash
   cd functions && npm install && cd ..
   firebase deploy --only functions
   ```
5. **Switch the site over:** set `SERVER_EMAILS = true` in `assets/js/db.js`, bump `VERSION` in `sw.js`, commit and push.
6. **Check:** invite another email you own from the dashboard and confirm the branded email arrives.

Gmail allows about 500 emails a day, far more than invites need. To send from a custom domain later, swap the
transport in `index.js` for a service like Resend.

## Notes

- `firebase deploy` with no `--only` would now try to deploy functions too; on the free plan it stops with a billing
  error. Keep using `firebase deploy --only firestore` for rules until the plan changes.
- Functions run with full database access (they skip `firestore.rules`), so keep them small and review changes carefully.
