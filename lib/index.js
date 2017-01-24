/*
 * Bedrock Linked Data Notifications Inbox Module.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
const async = require('async');
const bedrock = require('bedrock');
const brPermission = require('bedrock-permission');
const database = require('bedrock-mongodb');
const util = require('util');
const BedrockError = bedrock.util.BedrockError;

// load config defaults
require('./config');

// module permissions
const PERMISSIONS = bedrock.config.permission.permissions;

// module API
const api = {};
module.exports = api;

const logger = bedrock.loggers.get('app');
