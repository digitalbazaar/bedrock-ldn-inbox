/*!
 * Bedrock Linked Data Notifications Inbox Module Test Configuration.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
const bedrock = require('bedrock');
const config = bedrock.config;
const path = require('path');
const permissions = config.permission.permissions;
const roles = config.permission.roles;

config.mocha.tests.push(path.join(__dirname, 'mocha'));

// mongodb config
config.mongodb.name = 'bedrock_ldn_inbox_test';
// drop all collections on initialization
config.mongodb.dropCollections = {};
config.mongodb.dropCollections.onInit = true;
config.mongodb.dropCollections.collections = [];

roles['bedrock-ldn-inbox.test'] = {
  id: 'bedrock-ldn-inbox.test',
  label: 'Test Role',
  comment: 'Role for Test User',
  sysPermission: [
    permissions.LDN_INBOX_ACCESS.id,
    permissions.LDN_INBOX_EDIT.id,
    permissions.LDN_INBOX_INSERT.id,
    permissions.LDN_INBOX_REMOVE.id,
    permissions.LDN_MESSAGE_ACCESS.id,
    permissions.LDN_MESSAGE_EDIT.id,
    permissions.LDN_MESSAGE_INSERT.id,
    permissions.LDN_MESSAGE_REMOVE.id
  ]
};
