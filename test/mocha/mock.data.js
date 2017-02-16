/*!
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const helpers = require('./helpers');

const mock = {};
module.exports = mock;

const identities = mock.identities = {};
let userName;

userName = 'regularUser';
identities[userName] = {};
identities[userName].identity = helpers.createIdentity({userName: userName});
identities[userName].identity.sysResourceRole.push({
  sysRole: 'bedrock-ldn-inbox.test',
  generateResource: 'id'
});

userName = 'adminUser';
identities[userName] = {};
identities[userName].identity = helpers.createIdentity({userName: userName});
identities[userName].identity.sysResourceRole.push({
  sysRole: 'bedrock-ldn-inbox.test'
});

mock.inbox = {
  type: 'Container',
  '@context': [
    'https://www.w3.org/ns/ldp',
    {
      owner: {
        '@id': 'https://w3id.org/security#owner',
        '@type': '@id'
      }
    }
  ]
};

mock.message = {};
