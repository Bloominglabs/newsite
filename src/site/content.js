'use strict';

/**
 * Public-site content is centralized here so future content revisions can be
 * reviewed without hunting through rendering logic. The generator imports this
 * module and focuses only on turning structured content into HTML.
 */
const siteContent = {
  organization: {
    name: 'Bloominglabs',
    tagline: 'Bloomington’s hackerspace',
    summary:
      'A shared workshop where neighbors build, repair, teach, and experiment together.',
    address: '1840 S. Walnut Street, Suite 200, Bloomington, IN 47401',
    addressShort: '1840 S. Walnut Street, Suite 200',
    city: 'Bloomington, IN',
    mailingAddress: 'P.O. Box 2443, Bloomington, IN 47402',
    email: 'contact@bloominglabs.org',
    publicHours: 'Wednesdays, 7pm–10pm',
    publicHoursDetail: 'Every Wednesday from 7pm until 10pm',
    entranceNote: 'Entrance is around the back, next to the garage door.',
    wikiUrl: 'https://github.com/Bloominglabs/newsite/wiki',
    makeventionUrl: 'https://www.makevention.org/',
    calendarUrl: 'https://github.com/Bloominglabs/newsite/wiki/Upcoming-Workshops',
  },
  home: {
    headline: 'Shared tools. Open nights. Room to make stuff.',
    lead:
      'Indiana’s first hackerspace — a public workshop in Bloomington for building, repairing, teaching, and learning together.',
    about:
      'Bloominglabs is a member-run shop full of tools for electronics, fabrication, craft, repair, and experiments that do not fit in a spare bedroom. Come for public night, stay for workshops, or join if you want keys and a stake in the space.',
    visitCta: 'Come to public night',
    membershipCta: 'How to join',
  },
  visit: {
    lead:
      'Public night is the easiest first visit: free, open to all ages, and the best time to meet members and see the shop in use.',
    arrivalNotes: [
      'Public night is the easiest time to visit for the first time.',
      'Your first visit requires a liability waiver.',
      'Visitors under 18 need a parent or guardian to sign the waiver, and a responsible adult must remain with them.',
      'If Wednesday does not work, email the space and ask whether another visit time can be arranged.',
    ],
    contactRoutes: [
      'Email contact@bloominglabs.org for questions or a Slack invite.',
      'Check Upcoming Workshops on the wiki for classes and special events.',
      'Postal mail goes to P.O. Box 2443, Bloomington, IN 47402.',
    ],
  },
  membership: {
    lead:
      'Membership is a relationship, not a checkout form. Show up a few times, meet people, then join if the space fits your projects.',
    steps: [
      'Attend 3 meetings or workshops so members can get to know you and you can decide whether the space fits.',
      'Tell a member that you want to join so the group can track your visits and answer questions directly.',
      'After your third public event, complete the membership form and pay the first month of dues.',
    ],
    benefits: [
      '24/7 access to the space and most shared tools.',
      'Voting rights at the annual members meeting.',
      'The ability to host guests for informal or organized events.',
      'A community that can help with fabrication, electronics, software, craft, repair, and odd experiments.',
    ],
  },
  support: {
    lead:
      'Bloominglabs is a 501(c)(3) nonprofit funded mainly by member dues. Donations, useful hardware, and volunteer time keep the shop open to the public.',
    options: [
      'Monetary donations help cover rent, utilities, and tool upkeep.',
      'Hardware donations are welcome when the equipment or materials are useful to the space.',
      'Kroger Community Rewards can direct a small portion of eligible shopping to Bloominglabs at no extra cost.',
      'Showing up, teaching, helping with events, or becoming a member is often the most useful support.',
    ],
  },
  wiki: {
    explanation:
      'The wiki holds project notes, procedures, meeting history, equipment docs, and other deep reference material. This public site covers the essentials for visitors.',
    archiveNote:
      'A textual snapshot of the wiki also lives in this repository so Bloominglabs is not tied to one hosting arrangement.',
  },
};

module.exports = { siteContent };
