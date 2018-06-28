/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const brIdentity = require('bedrock-identity');
const config = require('bedrock').config;
const database = require('bedrock-mongodb');
const uuid = require('uuid/v4');

const api = {};
module.exports = api;

api.IDENTITY_BASE_PATH = 'https://bedrock.dev/i/';

api.createInbox = function(mockData, options = {addId: true}) {
  const inbox = bedrock.util.clone(mockData.inbox);
  if(options.addId) {
    inbox.id = uuid();
  }
  return inbox;
};

api.createMessage = function(mockData, options = {addId: true}) {
  const message = bedrock.util.clone(mockData.inbox);
  if(options.addId) {
    message.id = uuid();
  }
  return message;
};

api.createIdentity = function(options) {
  const userName = options.userName || uuid();
  const newIdentity = {
    id: api.IDENTITY_BASE_PATH + userName,
    type: 'Identity',
    sysSlug: userName,
    label: userName,
    email: userName + '@bedrock.dev',
    sysPassword: 'password',
    sysPublic: ['label', 'url', 'description'],
    sysResourceRole: [],
    url: 'https://example.com',
    description: userName,
    sysStatus: 'active'
  };
  if(options.credentialSigningKey) {
    newIdentity.sysPreferences = {
      credentialSigningKey: config.server.baseUri + config.key.basePath + '/' +
        options.credentialSigningKey
    };
  }
  return newIdentity;
};

api.createKeyPair = function(options) {
  const {userName, publicKey, privateKey} = options;
  const keyId = options.keyId || uuid();
  let fullKeyId;
  let ownerId;
  if(userName.startsWith('did:')) {
    fullKeyId = userName + '/keys/' + keyId;
    ownerId = userName;
  } else {
    fullKeyId = config.server.baseUri + config.key.basePath + '/' + keyId;
    ownerId = config.server.baseUri + config['identity-http'].basePath + '/'
      + userName;
  }
  const newKeyPair = {
    publicKey: {
      '@context': 'https://w3id.org/identity/v1',
      id: fullKeyId,
      type: 'CryptographicKey',
      owner: ownerId,
      label: 'Signing Key 1',
      publicKeyPem: publicKey,
      sysStatus: 'active'
    },
    privateKey: {
      type: 'CryptographicKey',
      owner: ownerId,
      label: 'Signing Key 1',
      publicKey: fullKeyId,
      privateKeyPem: privateKey
    }
  };
  if(options.isSigningKey) {
    newKeyPair.isSigningKey = true;
  }
  return newKeyPair;
};

api.removeCollection = function(collection, callback) {
  const collectionNames = [collection];
  database.openCollections(collectionNames, () => {
    async.each(collectionNames, function(collectionName, callback) {
      database.collections[collectionName].remove({}, callback);
    }, function(err) {
      callback(err);
    });
  });
};

api.removeCollections = function(callback) {
  const collectionNames = ['customer', 'eventLog', 'identity', 'publicKey'];
  database.openCollections(collectionNames, () => {
    async.each(collectionNames, (collectionName, callback) => {
      database.collections[collectionName].remove({}, callback);
    }, function(err) {
      callback(err);
    });
  });
};

api.prepareDatabase = function(mockData, callback) {
  async.series([
    callback => {
      api.removeCollections(callback);
    },
    callback => {
      insertTestData(mockData, callback);
    }
  ], callback);
};

// Insert identities and public keys used for testing into database
function insertTestData(mockData, callback) {
  async.forEachOf(mockData.identities, (identity, key, callback) =>
    async.parallel([
      callback => brIdentity.insert(null, identity.identity, callback)
    ], callback),
  err => {
    if(err) {
      if(!database.isDuplicateError(err)) {
        // duplicate error means test data is already loaded
        return callback(err);
      }
    }
    callback();
  }, callback);
}
