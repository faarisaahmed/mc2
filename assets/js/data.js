/* MasjidHub demo data.
   Mosque and event details for MCGP come from themuslimcenter.org.
   Anything marked `sample: true` has a placeholder time because the source didn't list one. */
window.MH_DATA = {
  mosques: [
    {
      id: "mcgp",
      name: "Muslim Center of Greater Princeton",
      short: "MCGP",
      address: "2030 Old Trenton Rd, West Windsor Township, NJ 08550",
      lat: 40.2813, lng: -74.5704,
      phone: "(609) 336-7602",
      email: "Admin@Themuslimcenter.org",
      website: "https://themuslimcenter.org",
      donateUrl: "https://themuslimcenter.org/donate",
      paypalUrl: "https://themuslimcenter.org/paypal-new",
      values: "Unity • Compassion • Peace",
      about: "A mosque, youth center, and community center open to all.",
      features: ["Five daily prayers", "Jumu'ah", "Sisters' prayer area", "Youth center", "Basketball court", "Free medical clinic", "Weekend school", "Parking"],
      pillars: [
        { t: "Faith", d: "Five daily prayers, Jummah, Family Friday Night, Taraweeh, guest speakers, and Quran reading circles." },
        { t: "Community", d: "Interfaith activities, community service, Hunger Van, Ramadan Iftar, Free Medical Clinic, and food drives." },
        { t: "Education", d: "Weekend School (KG–9), adult education, Sisters Quran class, post-Isha halaqa, Fajr micro halaqa, and Quran Academy." },
        { t: "Youth", d: "Young Muslims Group, basketball court, game room, youth lectures, cook-off, and youth iftar." }
      ],
      education: [
        { t: "MCGP Weekend School", d: "Weekend school for KG–9: Quran, Arabic, and Islamic studies.", url: "https://mcgpschool.org" },
        { t: "Garden of Knowledge", d: "Adult education in classical Islamic sciences: Arabic, fiqh, aqeedah, Quran, and hadith.", url: "https://themuslimcenter.org/gardenofknowledge" },
        { t: "Tarteel Academy", d: "Quran programs, including Hifz.", url: "https://tarteelmcgp.org" },
        { t: "Resources", d: "Learning resources from the center.", url: "https://themuslimcenter.org/resources" }
      ],
      services: [
        { t: "Book a session with our scholars", url: "https://themuslimcenter.org/book-online" },
        { t: "Cemetery", url: "https://themuslimcenter.org/cemetery" },
        { t: "MCGP Free Clinic", url: "https://themuslimcenter.org/mcgp-free-clinic" },
        { t: "Social Work", url: "https://mcgpfreeclinic.org/socialwork" },
        { t: "Social Services", url: "https://mcgpsocialservices.org" },
        { t: "Hunger Van", url: "https://themuslimcenter.org/hunger-van" },
        { t: "Hall Bookings", url: "https://themuslimcenter.org/hall-bookings" },
        { t: "Youth", url: "https://themuslimcenter.org/youth" },
        { t: "Volunteer", url: "https://themuslimcenter.org/volunteer" },
        { t: "Careers", url: "https://themuslimcenter.org/jobs" },
        { t: "Ramadan", url: "https://themuslimcenter.org/ramadan-1" },
        { t: "Parking", url: "https://themuslimcenter.org/parking" },
        { t: "Muhsen Needs Assessment Survey", url: "https://www.muhsen.org/need-survey" }
      ],
      contacts: [
        { t: "General", v: "Admin@Themuslimcenter.org" },
        { t: "Programs", v: "programming@themuslimcenter.org" },
        { t: "Clinic", v: "clinic@themuslimcenter.org" },
        { t: "Garden of Knowledge", v: "garden@themuslimcenter.org" }
      ],
      social: [
        { t: "Instagram", url: "https://www.instagram.com/themuslimcenter_nj" },
        { t: "Facebook", url: "https://www.facebook.com/mcgpnj" },
        { t: "YouTube", url: "https://www.youtube.com/@mcgpnj" }
      ],
      causes: [
        { id: "general", t: "General Fund", d: "Keeps the lights on, the carpets clean, and the doors open.", goal: 50000, raised: 31250 },
        { id: "zakat", t: "Zakat", d: "Distributed to eligible families through Social Services.", goal: 40000, raised: 22600 },
        { id: "hunger", t: "Hunger Van", d: "Hot meals and groceries for neighbors in need.", goal: 15000, raised: 11900 },
        { id: "youth", t: "Youth Programs", d: "Basketball, ping pong, lectures, and the game room.", goal: 20000, raised: 8400 },
        { id: "clinic", t: "Free Medical Clinic", d: "Free care for uninsured patients.", goal: 25000, raised: 17300 }
      ]
    }
  ],

  interests: [
    { id: "faith", t: "Quran & Faith", icon: "book" },
    { id: "learning", t: "Classes & Learning", icon: "grad" },
    { id: "youth", t: "Youth", icon: "star" },
    { id: "sports", t: "Sports & Fitness", icon: "ball" },
    { id: "family", t: "Family", icon: "users" },
    { id: "sisters", t: "Sisters", icon: "flower" },
    { id: "service", t: "Service & Charity", icon: "hand" },
    { id: "social", t: "Social & Fun", icon: "smile" },
    { id: "business", t: "Business & Careers", icon: "briefcase" }
  ],

  ageGroups: [
    { id: "kids", t: "Kids", d: "Under 13", min: 4, max: 12 },
    { id: "teens", t: "Teens", d: "13–17", min: 13, max: 17 },
    { id: "young", t: "Young adults", d: "18–25", min: 18, max: 25 },
    { id: "adults", t: "Adults", d: "26–59", min: 26, max: 59 },
    { id: "seniors", t: "Seniors", d: "60+", min: 60, max: 120 }
  ],

  /* Event fields:
     date | recur {days:[0-6 Sun-Sat], from, to, every:1|2}
     start/end "HH:MM" OR after:"fajr|dhuhr|maghrib|isha" + mins (duration)
     ages [min,max], audience: all | sisters | brothers | girls */
  events: [
    { id: "media-dinner", title: "From Margin to Mainstream: Muslim Representation in Media", date: "2026-10-24", start: "18:00", end: "22:00", ages: [13, 120], audience: "all", interests: ["service", "social"], cost: "Fundraising dinner", place: "MCGP", desc: "Fundraising dinner with HHRD supporting the Zaatari Refugee Camp in Jordan." },
    { id: "summit", title: "MC² Entrepreneurship Builders Summit", recur: { days: [6, 0], from: "2026-10-24", to: "2026-10-25" }, start: "10:00", end: "17:00", sample: true, ages: [10, 120], audience: "all", interests: ["business", "learning", "youth"], cost: "Early bird $20 (2-day) · $15 (1-day) · members 50% off", place: "379 Princeton Hightstown Rd, East Windsor", desc: "Two days of building, pitching, and learning from Muslim founders. Ages 10+." },
    { id: "gaza", title: "GAZA: Eyewitness Stories", date: "2026-10-29", after: "isha", mins: 75, ages: [13, 120], audience: "all", interests: ["service", "learning"], cost: "Free", place: "MCGP", desc: "Speakers: Dr. Qaiser Usmani, Dr. Mateen Khan, and Dr. Zain Yusuf." },
    { id: "shamail", title: "Al-Shama'il Al-Muhammadiyyah Series", date: "2026-10-30", start: "20:30", end: "21:30", ages: [13, 120], audience: "all", interests: ["faith", "learning"], cost: "Free · no registration", place: "MCGP", desc: "Learning the beautiful character of the Prophet ﷺ with Shaykh Yusuf Hussain." },
    { id: "fun-night", title: "Annual Family Fun Night", date: "2026-10-31", start: "16:00", end: "20:00", ages: [0, 120], audience: "all", interests: ["family", "social", "youth"], cost: "$10 suggested donation", place: "MCGP", desc: "Food trucks, games, free bounce houses, crafts, and free cotton candy and popcorn. Contact Amna Malik: (609) 686-0327." },
    { id: "ladies-night", title: "Ladies Night: Women Leaders in Islam", date: "2026-11-06", start: "18:00", end: "20:00", ages: [12, 120], audience: "sisters", interests: ["sisters", "learning", "social"], cost: "$10 registration", place: "MP1", desc: "An evening with Dr. Dalia Fahmy. Sisters 12+." },

    { id: "pilates", title: "Sisters Mat Pilates", recur: { days: [2], from: "2026-10-06", to: "2026-12-15" }, start: "11:00", end: "12:00", ages: [18, 120], audience: "sisters", interests: ["sports", "sisters"], cost: "$25 per class (4 sessions)", place: "Room MP-2", desc: "Gentle strength and flexibility for sisters." },
    { id: "fnl", title: "Friday Night Live (Middle School)", recur: { days: [5], from: "2026-10-02", to: "2026-10-30" }, start: "18:30", end: "19:30", ages: [11, 14], audience: "all", interests: ["youth", "social"], cost: "Free · RSVP required", place: "MP-1", desc: "Games, snacks, and a short talk for middle schoolers." },
    { id: "bball-wknd", title: "Fall Basketball Training", recur: { days: [6, 0], from: "2026-09-12", to: "2026-12-13" }, start: "11:00", end: "12:00", ages: [9, 13], audience: "all", interests: ["sports", "youth"], cost: "Registration required", place: "MCGP court", desc: "Skills, drills, and teamwork. Ages 9–13." },
    { id: "bball-fri", title: "Fall Basketball Training", recur: { days: [5], from: "2026-09-11", to: "2026-12-11" }, start: "16:30", end: "17:30", ages: [9, 13], audience: "all", interests: ["sports", "youth"], cost: "Registration required", place: "MCGP court", desc: "Friday session. Ages 9–13." },
    { id: "pingpong", title: "Youth Ping Pong Fall Academy", recur: { days: [0], from: "2026-09-13", to: "2026-12-06" }, start: "14:00", end: "16:00", sample: true, ages: [9, 14], audience: "all", interests: ["sports", "youth"], cost: "26 hours over 13 weeks", place: "MP2", desc: "Ages 9–14." },
    { id: "hijabista", title: "Hijabista", recur: { days: [3], from: "2026-09-16", to: "2027-05-26", every: 2 }, start: "18:00", end: "19:30", sample: true, ages: [8, 13], audience: "girls", interests: ["youth", "sisters", "faith"], cost: "$125 per year", place: "MCGP", desc: "A girls' club for ages 8–10 and 11–13. Coordinator: Quratulain \"Annie\" Hassan." },
    { id: "shariah", title: "Wisdom of Shariah", recur: { days: [1], from: "2026-09-14", to: "2026-12-14" }, after: "isha", mins: 60, sample: true, ages: [16, 120], audience: "all", interests: ["learning", "faith"], cost: "Register at mcgp.link", place: "Musalla-1", desc: "With Shaykh Yusuf Hussain." },
    { id: "zakaat", title: "Fiqh of Zakaat", recur: { days: [4], from: "2026-09-17", to: "2026-12-17" }, after: "isha", mins: 60, sample: true, ages: [16, 120], audience: "all", interests: ["learning", "faith", "service"], cost: "Register at mcgp.link", place: "Musalla-1", desc: "With Shaykh Yusuf Hussain." },
    { id: "fajr-halaqa", title: "Fajr Micro Halaqa", recur: { days: [6, 0], from: "2026-01-01", to: "2027-12-31" }, after: "fajr", mins: 20, sample: true, ages: [10, 120], audience: "all", interests: ["faith"], cost: "Free", place: "Main musalla", desc: "A short reminder right after Fajr." },
    { id: "isha-halaqa", title: "Post-Isha Halaqa", recur: { days: [3], from: "2026-01-01", to: "2027-12-31" }, after: "isha", mins: 40, sample: true, ages: [13, 120], audience: "all", interests: ["faith", "learning"], cost: "Free", place: "Main musalla", desc: "Weekly reflection and Q&A." },
    { id: "jumuah", title: "Jumu'ah Prayer & Khutbah", recur: { days: [5], from: "2026-01-01", to: "2027-12-31" }, after: "dhuhr", mins: 50, offset: 15, sample: true, ages: [0, 120], audience: "all", interests: ["faith"], cost: "", place: "Main musalla", desc: "The Friday prayer. Confirm khutbah time with the mosque." },
    { id: "family-friday", title: "Family Friday Night", recur: { days: [5], from: "2026-01-01", to: "2027-12-31" }, after: "maghrib", mins: 120, sample: true, ages: [0, 120], audience: "all", interests: ["family", "social", "faith"], cost: "Free", place: "MCGP", desc: "Dinner, a short talk, and time together." },
    { id: "weekend-school", title: "MCGP Weekend School", recur: { days: [0], from: "2026-09-13", to: "2027-06-06" }, start: "10:00", end: "13:00", sample: true, ages: [5, 15], audience: "all", interests: ["learning", "faith", "youth"], cost: "Enrollment at mcgpschool.org", place: "MCGP", desc: "Quran, Arabic, and Islamic studies for KG–9." },
    { id: "sisters-quran", title: "Sisters Quran Class", recur: { days: [4], from: "2026-09-10", to: "2027-06-10" }, start: "10:30", end: "12:00", sample: true, ages: [16, 120], audience: "sisters", interests: ["faith", "sisters", "learning"], cost: "Free", place: "MCGP", desc: "Recitation and tajweed for sisters." },
    { id: "book-club", title: "Sisters Book Club: A Light of Her Own", date: "2026-11-14", start: "10:30", end: "12:00", sample: true, ages: [16, 120], audience: "sisters", interests: ["sisters", "social", "learning"], cost: "Free · bring a friend", place: "MCGP", desc: "Open to all women." },
    { id: "mommy-me", title: "Mommy & Me", recur: { days: [3], from: "2026-09-09", to: "2027-06-09" }, start: "10:00", end: "11:00", sample: true, ages: [0, 5], audience: "all", interests: ["family"], cost: "Free", place: "MCGP", desc: "Songs, stories, and play for little ones and their parents." },
    { id: "clubhouse", title: "Kids Clubhouse", recur: { days: [6], from: "2026-09-12", to: "2027-06-12" }, start: "15:00", end: "16:30", sample: true, ages: [6, 11], audience: "all", interests: ["youth", "social", "family"], cost: "Free", place: "Game room", desc: "Crafts, games, and Islamic stories." },
    { id: "hunger-van", title: "Hunger Van Volunteer Shift", recur: { days: [6], from: "2026-09-05", to: "2027-06-26", every: 2 }, start: "09:00", end: "11:30", sample: true, ages: [14, 120], audience: "all", interests: ["service"], cost: "Volunteer", place: "MCGP parking lot", desc: "Pack and deliver meals to neighbors in need." }
  ]
};
