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
    name: 'Badge Authority',
    contact: 'brian@example.org',
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
  }),
  'link-basic': new Badge({
    _id: 'bba3989d4825d81b5587f96b7d8ba6941d590fff',
    name: 'Link Badge, basic',
    shortname: 'link-basic',
    description: 'For doing links.',
    image: IMAGE,
    program: 'program',
    tags: ['linking', 'webdev'],
    behaviors: [
      { shortname: 'link', count: 5 }
    ]
  }),
  'link-advanced': new Badge({
    name : 'Link Badge, advanced',
    shortname: 'link-advanced',
    description: 'For doing lots of links.',
    image: IMAGE,
    behaviors: [
      { shortname: 'link', count: 10 }
    ]
  }),
  'comment': new Badge({
    name : 'Commenting badge',
    shortname: 'comment',
    description: 'For doing lots of comments.',
    image: IMAGE,
    behaviors: [
      { shortname: 'comment', count: 5 }
    ]
  }),
  'link-comment': new Badge({
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
    name: 'Offline badge',
    shortname: 'offline-badge',
    description: 'For doing stuff offline',
    program: 'program',
    image: IMAGE,
    claimCodes: [
      { code: 'already-claimed', claimedBy: 'brian@example.org' },
      { code: 'never-claim' },
      { code: 'will-claim' },
      { code: 'remove-claim' },
    ]
  }),
  'multi-claim-badge': new Badge({
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
    name: 'Random code badge',
    shortname: 'random-badge',
    description: 'For doing random stuff',
    image: IMAGE,
    claimCodes: []
  }),
  'with-criteria': new Badge({
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
  })
};
