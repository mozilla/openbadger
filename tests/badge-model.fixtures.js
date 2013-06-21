const fs = require('fs');
const Issuer = require('../models/issuer');
const User = require('../models/user');
const BadgeInstance = require('../models/badge-instance');
const Badge = require('../models/badge');
const Program = require('../models/program');
const test = require('./');

const IMAGE = test.asset('sample.png');

module.exports = {
  'issuer': new Issuer({
    _id: 'issuer',
    shortname: 'issuer',
    name: 'Badge Authority',
    contact: 'brian@example.org',
    url: 'http://badgeauthority.org',
    image: IMAGE,
    programs: [
      {name: 'Org 1'},
      {name: 'Org 2'},
    ]
  }),
  'program': new Program({
    _id: 'program',
    name: 'Some Program',
    issuer: 'issuer',
    url: 'http://example.org/program',
    image: IMAGE,
  }),
  'orphaned-program': new Program({
    _id: 'orphaned-program',
    name: 'Orphaned Program',
    issuer: null,
    url: 'http://example.org/program',
    image: IMAGE,
  }),
  'filterable-program': new Program({
    _id: 'filterable-program',
    shortname: 'filterable-program',
    name: 'Filterable Program',
    issuer: 'issuer',
  }),
  'filterable-badge': new Badge({
    program: 'filterable-program',
    name: 'Badge for program filter',
    shortname: 'filterable-badge',
    description: 'desc',
    categories: ['technology', 'math'],
    ageRange: [Badge.ADULT],
    activityType: 'online',
    image: IMAGE,
  }),
  'no-image-issuer': new Issuer({
    _id: 'no-image-issuer',
    name: 'No Image Issuer',
    contact: 'brian@example.org',
    url: 'http://no-image.example.org',
    image: Buffer(0),
  }),
  'no-image-program': new Program({
    _id: 'no-image-program',
    name: 'no image program',
    issuer: 'no-image-issuer',
    url: 'http://example.org/program',
    image: Buffer(0),
  }),
  'no-image-badge': new Badge({
    program: 'no-image-program',
    name: 'Program with no image',
    shortname: 'no-image-badge',
    description: 'desc',
    image: IMAGE,
  }),
  'do-not-list-badge': new Badge({
    program: 'program',
    name: 'Do Not List',
    shortname: 'do-not-list-badge',
    description: 'desc',
    image: IMAGE,
    doNotList: true,
  }),
  'link-basic': new Badge({
    _id: 'bba3989d4825d81b5587f96b7d8ba6941d590fff',
    program: 'program',
    name: 'Link Badge, basic',
    shortname: 'link-basic',
    description: 'For doing links.',
    image: IMAGE,
    tags: ['linking', 'webdev'],
    behaviors: [
      { shortname: 'link', count: 5 }
    ]
  }),
  'link-advanced': new Badge({
    program: 'program',
    name : 'Link Badge, advanced',
    shortname: 'link-advanced',
    description: 'For doing lots of links.',
    image: IMAGE,
    claimCodes: [
      { code: 'NARGS_CODE', reservedFor: 'narg@moose.org' },
    ],
    behaviors: [
      { shortname: 'link', count: 10 }
    ]
  }),
  'comment': new Badge({
    program: 'program',
    name : 'Commenting badge',
    type: 'skill',
    shortname: 'comment',
    description: 'For doing lots of comments.',
    image: IMAGE,
    behaviors: [
      { shortname: 'comment', count: 5 }
    ]
  }),
  'link-comment': new Badge({
    program: 'program',
    name : 'Linking and commenting badge',
    shortname: 'link-comment',
    description: 'For doing lots of comments and links',
    image: IMAGE,
    behaviors: [
      { shortname: 'comment', count: 5 },
      { shortname: 'link', count: 5 }
    ]
  }),
  'offline-badge': new Badge({
    program: 'program',
    name: 'Offline badge',
    shortname: 'offline-badge',
    description: 'For doing stuff offline',
    program: 'program',
    image: IMAGE,
    claimCodes: [
      { code: 'already-claimed', claimedBy: 'brian@example.org' },
      { code: 'never-claim' },
      { code: 'will-claim' },
      { code: 'reserved-claim', reservedFor: 'foo@bar.org' },
      { code: 'remove-claim' },
    ]
  }),
  'multi-claim-badge': new Badge({
    program: 'program',
    name: 'Multi claim badge',
    shortname: 'multi-claim-badge',
    description: 'Multi',
    image: IMAGE,
    claimCodes: [
      { code: 'multi-claim',
        claimedBy: 'someone@example.org',
        multi: true
      },
    ]
  }),
  'other-offline-badge': new Badge({
    program: 'program',
    name: 'Other Offline badge',
    shortname: 'other-offline-badge',
    description: 'For doing more offline stuff',
    image: IMAGE,
    claimCodes: [
      { code: 'slothstronaut' },
      { code: 'bearstronaut' },
      { code: 'catstronaut' }
    ]
  }),
  'random-badge': new Badge({
    program: 'program',
    name: 'Random code badge',
    shortname: 'random-badge',
    description: 'For doing random stuff',
    image: IMAGE,
    claimCodes: []
  }),
  'with-criteria': new Badge({
    program: 'program',
    name: 'Badge with criteria',
    shortname: 'with-criteria',
    description: 'For doing random stuff',
    criteria: {
      content: "* person is awesome"
    },
    program: 'program',
    image: IMAGE,
  }),
  'user': new User({
    user: 'brian@example.org',
    credit: {}
  }),
  'instance': new BadgeInstance({
    user: 'brian@example.org',
    badge: 'bba3989d4825d81b5587f96b7d8ba6941d590fff',
    seen: true
  }),
  'science1': new Badge({
    program: 'program',
    name: 'science1',
    type: 'skill',
    shortname: 'science1',
    description: 'science1',
    image: IMAGE,
    categories: ['science'],
  }),
  'science2': new Badge({
    program: 'program',
    name: 'science2',
    shortname: 'science2',
    description: 'science2',
    image: IMAGE,
    categories: ['science'],
    program: '',
  }),
  'science3': new Badge({
    program: 'program',
    name: 'science3',
    shortname: 'science3',
    description: 'science3',
    image: IMAGE,
    categories: ['science']
  }),
  'science-math1': new Badge({
    program: 'program',
    name: 'science-math1',
    shortname: 'science-math1',
    description: 'science-math1',
    image: IMAGE,
    categories: ['science', 'math']
  }),
  'science-math2': new Badge({
    program: 'program',
    name: 'science-math2',
    shortname: 'science-math2',
    description: 'science-math2',
    image: IMAGE,
    categories: ['science', 'math']
  }),
  'science-math3': new Badge({
    program: 'program',
    name: 'science-math3',
    shortname: 'science-math3',
    description: 'science-math3',
    image: IMAGE,
    categories: ['science', 'math']
  }),
  'science-requirement': new Badge({
    program: 'program',
    name: 'science-requirement',
    shortname: 'science-requirement',
    description: 'science-requirement',
    image: IMAGE,
    categories: ['science'],
    categoryRequirement: 0,
    categoryWeight: 100,
    claimCodes: [
      { code: 'science-requirement' }
    ]
  }),
  'science-reward': new Badge({
    program: 'program',
    name: 'science-reward',
    shortname: 'science-reward',
    description: 'science-reward',
    image: IMAGE,
    categoryAward: 'science',
    categoryRequirement: 100,
    categoryWeight: 0
  }),
  'deleted-badge': new Badge({
    program: 'program',
    name : 'Deleted badge',
    shortname: 'deleted-badge',
    description: 'For doing lots of deleting.',
    image: IMAGE,
    deleted: true
  })
};
