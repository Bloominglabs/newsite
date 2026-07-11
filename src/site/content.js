'use strict';

/**
 * Public-site content is centralized here so future content revisions can be
 * reviewed without hunting through rendering logic. The generator imports this
 * module and focuses only on turning structured content into HTML.
 *
 * Voice: plain and specific. Prefer facts from the wiki over marketing cadence.
 */
const siteContent = {
  organization: {
    name: 'Bloominglabs',
    tagline: 'A space for sharing tools and knowledge to make stuff',
    summary:
      'Bloomington’s hackerspace: a shared workshop for projects that need tools, room, and other people.',
    address: '1840 S. Walnut Street, Suite 200, Bloomington, IN 47401',
    addressShort: '1840 S. Walnut Street, Suite 200',
    city: 'Bloomington, IN',
    mailingAddress: 'P.O. Box 2443, Bloomington, IN 47402',
    email: 'contact@bloominglabs.org',
    publicHours: 'Wednesdays, 7pm–10pm',
    publicHoursDetail: 'every Wednesday from 7pm until 10pm',
    entranceNote: 'Go around back; the Suite 200 entrance is next to the garage door.',
    wikiUrl: 'https://github.com/Bloominglabs/newsite/wiki',
    makeventionUrl: 'https://www.makevention.org/',
    calendarUrl: 'https://github.com/Bloominglabs/newsite/wiki/Upcoming-Workshops',
  },
  home: {
    headline: 'Bloomington’s hackerspace',
    lead:
      'We rent a shared workshop full of tools for individual and group projects. Open to the public Wednesday nights.',
    about:
      'Bloominglabs is Indiana’s first hackerspace. People use the shop for woodworking, electronics, welding, sewing, 3D printing, software, and whatever else they are building. We also run Makevention each year.',
    visitCta: 'Visit',
    membershipCta: 'Membership',
  },
  visit: {
    lead: 'Show up Wednesday evening. It is free. All ages are welcome.',
    arrivalNotes: [
      'First visit: fill out a liability waiver.',
      'Under 18: a parent or guardian signs the waiver, and an adult stays with them.',
      'Need a different time? Email contact@bloominglabs.org and ask.',
    ],
    contactRoutes: [
      'Email: contact@bloominglabs.org (ask for a Slack invite too).',
      'Workshops and one-offs: Upcoming Workshops on the wiki.',
      'Mail: P.O. Box 2443, Bloomington, IN 47402.',
    ],
  },
  membership: {
    lead:
      'Come to three public nights or workshops, tell someone you want to join, then fill out the form and pay the first month of dues.',
    steps: [
      'Attend three meetings or workshops.',
      'Tell a member you want to join.',
      'After the third visit, fill out the membership form and pay the first month.',
    ],
    benefits: [
      '24/7 access to the space and most tools.',
      'A vote at the annual members meeting.',
      'You can bring guests and host events at the space.',
    ],
  },
  support: {
    lead:
      'We are a 501(c)(3). Most of the budget is member dues. Money, usable tools/materials, and volunteer help all matter.',
    options: [
      'Cash, check, or other monetary donations go to rent, utilities, and tools.',
      'Hardware is welcome if we can actually use it.',
      'Kroger Community Rewards can send a cut of your shopping to Bloominglabs.',
      'Or join, teach, or help run events.',
    ],
  },
  wiki: {
    explanation:
      'Project notes, equipment docs, meeting minutes, procedures, and other long-form material live on the wiki. This site is the short version for visitors.',
    archiveNote:
      'A text snapshot of the wiki is also stored in this git repo.',
  },
};

module.exports = { siteContent };
