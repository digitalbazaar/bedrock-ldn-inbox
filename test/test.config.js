/*
 * Bedrock Linked Data Notifications Inbox Module Test Configuration.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
const bedrock = require('bedrock');
const config = bedrock.config.main;
const path = require('path');

config.mocha.tests.push(path.join(__dirname, 'mocha'));

bedrock.events.on('bedrock.test.configure', function() {
  // mongodb config
  config.mongodb.name = 'bedrock_ldn_inbox_test';
  config.mongodb.host = 'localhost';
  config.mongodb.port = 27017;
  config.mongodb.local.collection = 'bedrock_ldn_inbox_test';
  // drop all collections on initialization
  config.mongodb.dropCollections = {};
  config.mongodb.dropCollections.onInit = false;
  config.mongodb.dropCollections.collections = [];
});
