/** One reviewed image per page family. Language variants share the subject,
 * including account and legal photographs. Paths are versioned to avoid stale previews. */
export const CLUBS_PAGE_SOCIAL_ASSETS: Readonly<Record<string, string>> = {
 '': '/__crays-clubs/social/crays-community-owner-20261012.jpg',
 'about-us': '/__crays-clubs/social/20261012/about-us.jpg',
 'apply-directly': '/__crays-clubs/social/20261012/apply-directly.jpg',
 'ambassador-programme': '/__crays-clubs/social/2026-10/ambassadors.jpg',
 'legal': '/__crays-clubs/social/2026-10/legal.jpg',
 'legal/imprint': '/__crays-clubs/social/2026-10/legal-imprint.jpg',
 'legal/privacy-policy': '/__crays-clubs/social/2026-10/legal-privacy-policy.jpg',
 'legal/terms-and-conditions': '/__crays-clubs/social/2026-10/legal-terms-and-conditions.jpg',
 'legal/data-protection': '/__crays-clubs/social/2026-10/legal-data-protection.jpg',
 'account': '/__crays-clubs/social/2026-10/portfolio-companies.jpg',
 'search': '/__crays-clubs/forest-city-public/forest-city.jpg',
 experiences: '/__crays-clubs/experiences-screen2/hero-main-hd.png',
 discover: '/__crays-clubs/phase9-owner/forest-city-v16/hero-forest-city-city-aerial.webp',
 lifestyle: '/__crays-clubs/assets/crays-seo/home-guests-arriving-at-an-evening-lifestyle-event-11.webp',
 'community-life': '/__crays-clubs/community-life-option1/community-life-hero-pool-friends-v1.jpg',
 'become-a-member': '/__crays-clubs/assets/crays-seo/home-crays-club-work-lounge-with-guests-meeting-working-and-connecting-01.jpg',
 families: '/__crays-clubs/phase9-owner/families-option2/family-at-home.webp',
 teams: '/__crays-clubs/teams/option1/hero-01.webp',
 'host-company': '/__crays-clubs/host-company/host-company-sunset-resort.png',
 'school-jobs': '/__crays-clubs/school-jobs-v2/01-hero-lifestyle-learning.jpg',
 'brand-as-a-service': '/__crays-clubs/phase9-owner/brand-as-a-service-wireframe/brand-as-a-service-hero-forest-city-1920.webp',
 contact: '/__crays-clubs/social/20261012/contact.jpg',
 ambassadors: '/__crays-clubs/people/ambassadors-v1/directory-hero-coffee-conversation.webp',
 hospitality: '/__crays-clubs/phase9-owner/forest-city-v16/hero-forest-city-marina.webp',
 'hospitality/golf-hotel': '/__crays-clubs/forest-city-public/golf-hotel-exterior.jpg',
 'hospitality/marina-hotel': '/__crays-clubs/social/20261012/hospitality-marina-hotel.jpg',
 'agentic-life': '/__crays-clubs/agentic-life/page/hero-people.webp',
 'this-your-kinda-crowd': '/__crays-clubs/social/20261012/this-your-kinda-crowd.jpg',
};

export function clubsSocialPath(route: string, _locale: import("./public-site").ClubsLocale): string | undefined {
 return CLUBS_PAGE_SOCIAL_ASSETS[route];
}
