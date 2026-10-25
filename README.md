# MasjidHub

**Live site: https://faarisaahmed.github.io/mc2/**

MasjidHub puts accurate prayer times, the Qibla, events sorted by age and interest, an AI day planner, a community space, a map of nearby mosques, an Islamic calendar, and donations in one simple website. It's designed for every age, from grandparents to kids. The demo is built around the **Muslim Center of Greater Princeton (MCGP)**.

> **Why?** Most mosques don't have an organized app. People miss prayers and events (events that help them grow closer to Allah and to their community) simply because the information is scattered. MasjidHub gives every masjid a clean home for its times and programs, and it personalizes them for each person.

---

## Contents

- [Features](#features)
- [Pages](#pages)
- [How accurate is it?](#how-accurate-is-it)
- [What is real and what is demo](#what-is-real-and-what-is-demo)
- [Project structure](#project-structure)
- [Running it locally](#running-it-locally)
- [Editing content](#editing-content)
- [Design](#design)
- [Accessibility](#accessibility)
- [Privacy](#privacy)
- [Roadmap: from demo to product](#roadmap-from-demo-to-product)
- [Credits](#credits)

---

## Features

| Feature | What it does |
|---|---|
| **Prayer times** | Fajr, Sunrise, Dhuhr, Asr, Maghrib, and Isha for any location, with a live countdown to the next prayer, a monthly timetable, printing, and optional adhan notifications. |
| **School of thought** | **Hanafi by default** (Asr when shadow = 2×), or Shafi'i/Maliki/Hanbali (shadow = 1×). Seven calculation methods for Fajr and Isha, including ISNA, MWL, Egypt, Umm al-Qura, Karachi, Tehran, and Shia Ithna-Ashari (Jafari). |
| **Qibla finder** | Great-circle bearing to the Kaaba, plus a live phone compass (iOS and Android) that says "turn left/right" and vibrates when you're facing the Qibla. Also shows the distance to Makkah. |
| **Events by age & interest** | Adults / Teens / Kids tabs (from the team's sketch), plus Young adults and Seniors. Interest filters, a "Best for me" ranking, search, and `.ics` export to any calendar app. |
| **AI Day Planner** | Type your day in plain words ("School 8 to 3, soccer at 4:30, homework after dinner, sleep at 10:30"). The planner fits every prayer into its valid time window, flags conflicts, handles Jumu'ah on Fridays, and suggests events that match your age, interests, and free time. |
| **Community** | A chat space with channels (General, Ask the Imam, Events & Carpools, Youth, Sisters, Volunteers). From the team's "chat place – talk to your community" idea. |
| **Mosques near you** | Live map of real mosques from OpenStreetMap, with MasjidHub mosques pinned in gold. Includes distance, directions, the next prayer at each mosque, and "use this mosque for my times". |
| **Add your mosque** | An application form that geocodes the address and puts the mosque on the map as "pending". |
| **Islamic calendar** | Gregorian and Hijri dates side by side, with Islamic holidays, sunnah-fast guidance (including the days fasting is *not* allowed), prayer times for any day, and mosque events. |
| **Donations** | Pick a cause and amount, give once, monthly, or every Friday, plus a zakat calculator using the gold or silver nisab. |
| **Personalization** | A first-visit setup asks one simple question per screen (location, school of thought, age, interests) with big tap targets and Back/Next. Location is one big **Find me automatically** button, or type a city or zip and tap the result. Change it anytime under **Settings**. |
| **Text size** | The **Text size** button cycles normal → large → extra large on every page. |
| **Light & dark** | Follows the phone or computer automatically, switching when the device does. You can force Light or Dark in Settings. The map switches to a dark gray style too. |

## Pages

| File | Page |
|---|---|
| `index.html` | Home: apple.com-style tiles, next-prayer hero, and a preview of each feature |
| `prayer.html` | Prayer times, school of thought, reminders, and monthly timetable |
| `qibla.html` | Qibla compass |
| `events.html` | Events and programs (supports `?age=kids` and `?interest=sports`) |
| `planner.html` | AI day planner (supports `?add=<eventKey>&date=YYYY-MM-DD` from the Events page) |
| `community.html` | Community chat |
| `map.html` | Mosques near you |
| `join.html` | Add your mosque |
| `calendar.html` | Islamic calendar |
| `donate.html` | Donations and zakat calculator |
| `mosque.html` | MCGP profile: about, events, education, services, and contact (all the content from the original site) |

---

## How accurate is it?

Accuracy matters most for prayer times, so every number was checked against outside references.

### Prayer times

- Calculated **in the browser** using the standard astronomical method that most prayer apps use: sun declination and the equation of time, twilight angles for Fajr and Isha, and shadow length for Asr. See `prayerTimes()` in `assets/js/core.js`.
- **Checked against the [Aladhan API](https://aladhan.com/prayer-times-api)** for 136 combinations: 5 cities (West Windsor NJ, London, Karachi, Sydney, Oslo) × 4 seasons × 7 methods × both Asr schools.
  - Fajr, Sunrise, Dhuhr, Maghrib, and Isha **matched to the minute in every case**.
  - Asr matched in West Windsor. In a few far-from-equator cases it differed from Aladhan by 2–3 minutes. An independent high-precision check (NOAA solar equations) found MasjidHub was the more accurate one. Example: London, Oct 24 2026. Precise Asr 15:17:50, MasjidHub 15:18, Aladhan 15:20.
- High latitudes (for example, Scandinavian summers when twilight never ends) use the **angle-based** rule, which is the same default Aladhan uses.
- The site shows **adhan (start) times**. Iqamah is set by each mosque, so the site tells people to confirm with their masjid.

### Hijri date

- Uses the browser's built-in **Umm al-Qura** calendar (`Intl` `islamic-umalqura`), with an arithmetic fallback for old browsers.
- Checked against Aladhan: **24 Oct 2026 = 13 Jumada al-Ula 1448**, which matches.
- Local moon sighting can differ by a day, so Settings has a **±2 day adjustment**.

### Qibla

- Great-circle bearing to the Kaaba (21.4225° N, 39.8262° E).
- Checked against Aladhan's Qibla API: **58.12° from West Windsor, NJ**, which matches to two decimal places.

### Islamic dates & fasting guidance

- Holidays: Islamic New Year, Ashura, Mawlid (labelled "observed by many"), Isra' & Mi'raj, Mid-Sha'ban, Ramadan, Laylat al-Qadr (27th, with a note to seek the odd nights), Eid al-Fitr, Hajj, Day of Arafah, and Eid al-Adha.
- Fasting notes follow well-known rulings: Ramadan is obligatory. Mondays/Thursdays, the White Days (13–15), Arafah, Ashura (9th & 10th), and six days of Shawwal are recommended. **No fasting** on the two Eids or the Days of Tashreeq (11–13 Dhu al-Hijjah). The White Day on 13 Dhu al-Hijjah is correctly overridden by Tashreeq.

### Quotes

| Quote | Source |
|---|---|
| "The example of those who spend their wealth in the way of Allah is like a seed which grows seven spikes…" | Qur'an, Al-Baqarah 2:261 |
| "Whoever builds a mosque for Allah, Allah will build for him something like it in Paradise." | Sahih al-Bukhari 450, Sahih Muslim 533 |
| The Prophet ﷺ disliked sleeping before Isha and talking after it. | Sahih al-Bukhari 568 |

### Zakat

- 2.5% of net zakatable wealth held for one lunar year, if at or above the nisab. The nisab is **85 g gold** or **595 g silver**.
- Gold and silver prices change daily, so the calculator asks for today's price instead of guessing. It also suggests asking a scholar about personal situations.

---

## What is real and what is demo

The team asked for a demo with nothing that needs paid keys, so here's exactly what's real.

| Part | Status |
|---|---|
| Prayer times, Hijri dates, Qibla, fasting guidance | **Real**, verified (see above) |
| Mosque map | **Real** mosques from OpenStreetMap (via the free Overpass API) |
| City search / "use my location" | **Real** (browser geolocation + OpenStreetMap Nominatim) |
| MCGP info, services, education, contacts, and the dated events (Oct 24–Nov 6) | **Real**, taken from [themuslimcenter.org](https://themuslimcenter.org) |
| Recurring program times | Some are **placeholders**. If the source didn't give a time, the event card says "Sample time. Confirm with the mosque." Programs tied to a prayer (e.g. "after Isha") follow the real prayer time. Edit `assets/js/data.js` when you have real times. |
| AI Day Planner | **Demo engine.** A rule-based planner that runs in the browser with **no API key**. It understands natural phrases and really checks prayer windows, but it isn't a large language model. See the roadmap for connecting a real AI model. |
| Community chat | **Demo.** Messages are saved only in your browser. Sample posts are labelled "sample". The "Ask the Imam" channel does **not** invent answers from any real person. |
| Donations | **Demo.** No card details are collected and nothing is charged. Every donate screen links to MCGP's **real** donation page and PayPal. Fund progress bars are labelled "sample figures". |
| Add your mosque | **Demo.** Applications are saved in your browser and appear on your map as "pending". |

---

## Project structure

```
.
├── index.html            Home
├── prayer.html           Prayer times
├── qibla.html            Qibla compass
├── events.html           Events by age & interest
├── planner.html          AI day planner UI
├── community.html        Community chat
├── map.html              Mosque map (Leaflet + OpenStreetMap)
├── join.html             Add your mosque
├── calendar.html         Islamic calendar
├── donate.html           Donations + zakat calculator
├── mosque.html           MCGP profile page
├── assets/
│   ├── css/site.css      All styles (design tokens at the top)
│   ├── js/boot.js        Applies saved theme/text size before the page paints
│   ├── js/core.js        Shared engine: settings, prayer math, Hijri, Qibla, icons,
│   │                     event expansion & ranking, nav/footer, settings wizard
│   ├── js/data.js        Mosques, events, interests, age groups  ← edit content here
│   ├── js/planner.js     AI planner engine (schedule parser + prayer placement)
│   └── img/icon.svg      Logo / favicon
├── .nojekyll             Serve files as-is on GitHub Pages
└── README.md
```

No build step, no framework, and no npm install. Every page is plain HTML that loads `data.js` and `core.js` and then runs its own small script. The only external library is **Leaflet 1.9.4** (from cdnjs) on the map page. Map tiles are Esri's calm **Light Gray / Dark Gray Canvas** (no key needed), chosen so the mosque pins stand out. They swap automatically with the theme.

## Running it locally

```bash
git clone https://github.com/faarisaahmed/mc2.git
cd mc2
python3 -m http.server 8000
# open http://localhost:8000
```

Use a local server rather than double-clicking the files, because location and some browser features need `http://`. The phone compass needs **HTTPS** (GitHub Pages provides it) and a phone with a compass sensor.

**Deploying:** push to `main`. GitHub Pages serves the repo root and updates within a minute or two.

## Editing content

Almost everything you'd want to change lives in **`assets/js/data.js`**.

**Add a one-time event**

```js
{ id: "bake-sale", title: "Youth Bake Sale", date: "2026-11-21", start: "12:00", end: "15:00",
  ages: [0, 120], audience: "all", interests: ["youth", "service"],
  cost: "Free entry", place: "MCGP lobby", desc: "Support the youth trip!" }
```

**Add a weekly event**

```js
recur: { days: [6], from: "2026-11-01", to: "2027-01-31" }   // days: 0=Sun … 6=Sat; add every: 2 for every other week
```

**Tie an event to a prayer** (it moves with the prayer time automatically)

```js
after: "isha", mins: 60          // starts ~20 min after Isha, lasts 60 min; add offset: 15 to change the gap
```

**Field reference**

| Field | Meaning |
|---|---|
| `ages: [min, max]` | Ages the event is for. `[0, 120]` means all ages. |
| `audience` | `all`, `sisters`, `brothers`, or `girls` |
| `interests` | Any of: `faith`, `learning`, `youth`, `sports`, `family`, `sisters`, `service`, `social`, `business` |
| `sample: true` | Shows the "Confirm with the mosque" note |

Mosques, donation causes, services, and contacts are in the same file under `mosques`.

## Design

- **Six-item menu:** related pages are grouped so the top bar stays short. *Prayer* holds Times, Qibla and Calendar; *Mosques* holds the Map and Add yours. Each group shows a row of tabs under the top bar. Text size and Settings sit as two icons on the right.
- **Layout like apple.com:** a thin translucent global nav, a sticky product sub-nav on each page, large headline tiles that alternate light and dark, a two-up tile grid on the home page, and an "eyebrow, headline, subhead, then two calls to action" pattern.
- **Colors:** the masjid's green and gold. Design tokens are at the top of `site.css` (`--green #0f5132`, `--green-deep #0a3622`, `--gold #c8a24a`, and others).
- **Type:** [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans), a warm and very legible sans-serif, for everything. Arabic text and ﷺ use Amiri.
- **Icons:** one consistent set of simple line icons (in `core.js`). The site uses no emoji, so it looks the same on every device.
- **Light & dark:** every color is a token on `:root`, redefined for dark mode. `assets/js/boot.js` applies a forced theme before the page draws, so there's no flash.
- **Team sketch:** the whiteboard sketch had a top bar with *events (adult · teen · kid) · AI · chat place · prayer times*. These are all in the main nav, and Events opens with Adults/Teens/Kids tabs.

## Accessibility

- One-tap **larger text** on every page, saved for next time
- **Plain, step-by-step setup**: one question per screen, big answers, and Back/Next
- A **"What would you like to do?"** row of six big buttons on the home page for first-time users
- **Automatic dark mode**, easier on the eyes at Fajr and Isha
- Large touch targets (44px+), plain-language labels, and emoji cues for quick scanning
- Keyboard focus rings, `aria-pressed` on toggles, `aria-live` regions for countdowns and results, and labelled form fields
- Honors **reduced motion**
- Works at phone width (tested at 390px) with no sideways scrolling
- Printable timetable

## Privacy

There are no accounts, cookies, or analytics. Settings, planner drafts, chat messages, and applications are stored only in the browser's `localStorage`. Network requests go only to map services (Esri map tiles, OpenStreetMap's Overpass mosque search and Nominatim city search), and only when you use those features.

## Roadmap: from demo to product

1. **Real AI planner.** Send the schedule, the computed prayer windows, and the candidate events to an LLM from a small server (for example, a serverless function holding the API key), and keep the current engine as the offline fallback. Never put an API key in front-end code.
2. **Mosque dashboard.** Approved mosques sign in to post events, set iqamah and Jumu'ah times, and manage causes.
3. **Real chat.** A moderated backend with sign-in, reporting, and imam-verified answers.
4. **Real payments.** Connect each mosque's own provider (Stripe, PayPal, LaunchGood, etc.).
5. **App.** Make it an installable PWA with offline prayer times and push adhan reminders.

## Credits

- Built for and around the **Muslim Center of Greater Princeton**, 2030 Old Trenton Rd, West Windsor Township, NJ 08550 · [themuslimcenter.org](https://themuslimcenter.org) · (609) 336-7602
- Mosque data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors · Map tiles © Esri (Light/Dark Gray Canvas) · Map library: [Leaflet](https://leafletjs.com)
- Reference data for verification: [Aladhan API](https://aladhan.com)
- Fonts: Inter and Amiri (Google Fonts)

*MasjidHub is a student/community demo, not an official MCGP product. Always confirm prayer and event times with your mosque.*
