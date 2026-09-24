/**
 * The only source of school-specific content.
 * Replace every value containing PLACEHOLDER before publishing the website.
 */
export const school = {
  name: "Shanti Global School",
  session: "2026-27",
  address: "PLACEHOLDER: Add the complete school address",
  phone: "PLACEHOLDER: Add the school phone number",
  email: "PLACEHOLDER: Add the school email address",
  logoPath: "/images/placeholders/school-logo-placeholder.svg",
  colors: { primary: "#1D4ED8", secondary: "#F59E0B", accent: "#0F766E" },
  principal: {
    name: "PLACEHOLDER: Principal name",
    message: "PLACEHOLDER: Add a welcoming message from the principal for parents and students.",
  },
  map: {
    googleMapsUrl: "https://www.google.com/maps/place/Shanti+Global+School/@23.2247196,72.4937356,800m/data=!3m1!1e3!4m14!1m7!3m6!1s0x395c27837f7e03cf:0x3968d52ffffedec4!2sShanti+Global+School!8m2!3d23.2247196!4d72.4963105!16s%2Fg%2F11hdjdv1mr!3m5!1s0x395c27837f7e03cf:0x3968d52ffffedec4!8m2!3d23.2247196!4d72.4963105!16s%2Fg%2F11hdjdv1mr?entry=ttu",
    embedUrl: "https://www.google.com/maps?q=23.2247196,72.4963105&z=16&output=embed",
  },
} as const;

export const schoolContent = {
  nav: [
    { label: "Home", href: "/" }, { label: "About", href: "/about" },
    { label: "Teachers", href: "/teachers" }, { label: "Gallery", href: "/gallery" },
    { label: "Events", href: "/events" }, { label: "Notices", href: "/notices" },
    { label: "Contact", href: "/contact" },
  ],
  home: {
    heroTitle: "PLACEHOLDER: Learning today, leading tomorrow.",
    heroText: "PLACEHOLDER: Add a short introduction to the school community.",
    heroImage: "/images/placeholders/hero-placeholder.svg",
    principalImage: "/images/placeholders/principal-placeholder.svg",
    quickLinks: [
      { label: "Admission inquiry", href: "/admission" },
      { label: "Holiday list", href: "/holidays" },
      { label: "Exam timetable", href: "/exam-timetable" },
      { label: "Class timetable", href: "/class-timetable" },
    ],
  },
  about: {
    vision: "PLACEHOLDER: Add the school vision.",
    mission: "PLACEHOLDER: Add the school mission.",
    history: "PLACEHOLDER: Add a brief school history.",
    facilities: ["PLACEHOLDER: Facility one", "PLACEHOLDER: Facility two", "PLACEHOLDER: Facility three"],
  },
  teachers: [{ name: "PLACEHOLDER: Teacher One", subject: "PLACEHOLDER: Subject", qualification: "PLACEHOLDER: Qualification", experience: "PLACEHOLDER: Experience", image: "/images/placeholders/teacher-placeholder.svg" }],
  notices: [{ date: "2026-04-01", title: "PLACEHOLDER: Welcome notice", body: "PLACEHOLDER: Replace this notice before publishing the website.", urgent: false }],
  events: [{ date: "2026-06-01", title: "PLACEHOLDER: School event", description: "PLACEHOLDER: Add event details.", location: "PLACEHOLDER: Event location", past: false }],
  holidays: [{ date: "2026-05-01", title: "PLACEHOLDER: Holiday", description: "PLACEHOLDER: Holiday details." }],
  gallery: [{ year: "2026", event: "PLACEHOLDER: School event", date: "2026-06-01", heading: "PLACEHOLDER: Gallery heading", image: "/images/placeholders/gallery-placeholder.svg", alt: "PLACEHOLDER: Gallery image description" }],
  live: { title: "PLACEHOLDER: No live event is scheduled.", description: "PLACEHOLDER: The current live event will appear here when an administrator starts it.", embedUrl: "" },
  admission: { title: "PLACEHOLDER: Begin an admission inquiry", description: "PLACEHOLDER: Complete this form and the school office will contact you." },
  contact: { heading: "PLACEHOLDER: Get in touch", description: "PLACEHOLDER: Contact the school office for admissions and general questions." },
} as const;

export const schoolSeed = {
  subjects: ["English", "Maths", "S.St.", "Science", "Hindi", "Gujarati", "Sanskrit", "Grammar", "G.K.", "Computer", "Music", "Drawing", "Dance", "Karate", "Skating", "Game", "M.D."].map((name) => ({ name })),
  classes: Array.from({ length: 12 }, (_, index) => ({ standard: index + 1, section: "A" })),
  teachers: [{ seedKey: "PLACEHOLDER-teacher-one", fullName: "PLACEHOLDER: Teacher One", qualification: "PLACEHOLDER: Qualification", experienceYears: 1, biography: "PLACEHOLDER: Teacher biography.", isPublic: true }],
  notices: [{ seedKey: "PLACEHOLDER-welcome-notice", title: "PLACEHOLDER: Welcome notice", body: "PLACEHOLDER: Replace this notice before publishing the website.", publishedAt: "2026-04-01T09:00:00.000Z", isUrgent: false }],
  events: [{ seedKey: "PLACEHOLDER-school-event", title: "PLACEHOLDER: School event", description: "PLACEHOLDER: Add event details.", startsAt: "2026-06-01T04:00:00.000Z", endsAt: "2026-06-01T07:00:00.000Z", location: "PLACEHOLDER: Event location", isPublic: true }],
  holidays: [{ seedKey: "PLACEHOLDER-holiday", title: "PLACEHOLDER: Holiday", startsOn: "2026-05-01", endsOn: "2026-05-01", description: "PLACEHOLDER: Holiday details.", isPublic: true }],
  faqs: [{ question: "PLACEHOLDER: What are the school timings?", answer: "PLACEHOLDER: Add the school timings." }, { question: "PLACEHOLDER: How do I apply for admission?", answer: "PLACEHOLDER: Add the admission process." }],
} as const;
