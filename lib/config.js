/*
 * Bedrock Linked Data Notifications Inbox Module Configuration.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
const config = require('bedrock').config;
require('bedrock-permission');

config['ldn-inbox'] = {};
config['ldn-inbox'].collections = {};
config['ldn-inbox'].collections.inbox = 'ldn_inbox';
config['ldn-inbox'].collections.messages = 'ldn_message';
config['ldn-inbox'].inboxes = {};

// permissions
var permissions = config.permission.permissions;
permissions.LDN_INBOX_ACCESS = {
  id: 'LDN_INBOX_ACCESS',
  label: 'Access an LDN inbox',
  comment: 'Required to access a Linked Data Notifications inbox.'
};
permissions.LDN_INBOX_INSERT = {
  id: 'LDN_INBOX_INSERT',
  label: 'Insert an LDN inbox',
  comment: 'Required to insert a Linked Data Notifications inbox.'
};
permissions.LDN_INBOX_EDIT = {
  id: 'LDN_INBOX_EDIT',
  label: 'Edit an LDN inbox',
  comment: 'Required to edit a Linked Data Notifications inbox.'
};
permissions.LDN_INBOX_REMOVE = {
  id: 'LDN_INBOX_REMOVE',
  label: 'Remove an LDN inbox',
  comment: 'Required to remove a Linked Data Notifications inbox.'
};
permissions.LDN_MESSAGE_ACCESS = {
  id: 'LDN_MESSAGE_ACCESS',
  label: 'Access an LDN message',
  comment: 'Required to access a Linked Data Notifications message.'
};
permissions.LDN_MESSAGE_INSERT = {
  id: 'LDN_MESSAGE_INSERT',
  label: 'Insert an LDN message',
  comment: 'Required to insert a Linked Data Notifications message.'
};
permissions.LDN_MESSAGE_EDIT = {
  id: 'LDN_MESSAGE_EDIT',
  label: 'Edit an LDN message',
  comment: 'Required to edit a Linked Data Notifications message.'
};
permissions.LDN_MESSAGE_REMOVE = {
  id: 'LDN_MESSAGE_REMOVE',
  label: 'Remove an LDN message',
  comment: 'Required to remove a Linked Data Notifications message.'
};
