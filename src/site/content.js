'use strict';

/**
 * Public-site content is centralized here so future content revisions can be
 * reviewed without hunting through rendering logic. The generator imports this
 * module and focuses only on turning structured content into HTML.
 */
const siteContent = {
  organization: {
    name: 'Bloominglabs',
    tagline: 'A space for sharing tools and knowledge to make stuff',
    summary:
      'Bloomington, Indiana’s hackerspace for people who want to build, repair, explore, and learn together.',
    address: '1840 S. Walnut Street, Suite 200, Bloomington, IN 47401',
    mailingAddress: 'P.O. Box 2443, Bloomington, IN 47402',
    email: 'contact@bloominglabs.org',
    publicHours: 'Wednesday evenings from 7pm until 10pm',
    wikiUrl: 'https://www.bloominglabs.org/Main_Page',
    makeventionUrl: 'https://www.makevention.org/',
    calendarUrl: 'https://calendar.google.com/',
  },
  home: {
    intro:
      'Bloominglabs is Indiana’s first hackerspace. We share tools, space, and practical knowledge so more people can make ambitious things in public.',
    quickFacts: [
      {
        title: 'Public Hours',
        body: 'Every Wednesday from 7pm until 10pm. Free, all ages, and a good first visit if you want to see the space in action.',
      },
      {
        title: 'Location',
        body: 'Find us at 1840 S. Walnut Street, Suite 200 in Bloomington. The entrance is around the back next to the garage door.',
      },
      {
        title: 'Makevention',
        body: 'Bloominglabs organizes Makevention, Bloomington’s annual maker fair and showcase for inventive local work.',
      },
      {
        title: 'Membership',
        body: 'Members get 24/7 access to the space and most shared tools once they complete the joining process.',
      },
    ],
  },
  visit: {
    arrivalNotes: [
      'Public night is the easiest time to visit for the first time.',
      'Your first visit requires a liability waiver.',
      'Visitors under 18 need a parent or guardian to sign the waiver, and a responsible adult must remain involved during the visit.',
      'If Wednesday does not work, email the space and ask whether another visit time can be arranged.',
    ],
    contactRoutes: [
      'Email contact@bloominglabs.org for general questions.',
      'Ask for a Slack invite if you want to talk with members between events.',
      'Use the shared calendar to keep track of workshops and public happenings.',
      'Postal mail should go to P.O. Box 2443, Bloomington, IN 47402.',
    ],
  },
  membership: {
    steps: [
      'Attend 3 meetings or workshops so members can get to know you and you can decide whether the space fits your projects.',
      'Tell a member that you want to join so the group can track your visits and answer membership questions directly.',
      'After your third public event, complete the membership form and pay the first month of dues.',
    ],
    benefits: [
      '24/7 access to the space and most shared tools.',
      'Voting rights at the annual members meeting.',
      'The ability to host non-members for informal or organized events at the space.',
      'A community that can help with fabrication, electronics, software, craft, repair, and weird experiments.',
    ],
  },
  support: {
    options: [
      'Monetary donations help cover rent, utilities, and tool upkeep.',
      'Hardware donations are welcome when the equipment or materials are useful to the space.',
      'Kroger Community Rewards can direct a small portion of eligible shopping to Bloominglabs at no additional cost to the shopper.',
      'The best long-term support is showing up, teaching something, helping with events, or becoming a member.',
    ],
  },
  wiki: {
    explanation:
      'This public-facing site is intentionally narrow. The live wiki remains the full reference for projects, history, meeting notes, procedures, and other deep organizational material.',
    archiveNote:
      'A textual preservation snapshot of the current wiki also lives in this repository so Bloominglabs is not dependent on one hosting arrangement.',
  },
};

module.exports = { siteContent };
