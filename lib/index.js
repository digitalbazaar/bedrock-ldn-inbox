/*
 * Bedrock Linked Data Notifications Inbox Module.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
const async = require('async');
const bedrock = require('bedrock');
const brPermission = require('bedrock-permission');
const config = bedrock.config.main;
const database = require('bedrock-mongodb');
const BedrockError = bedrock.util.BedrockError;

// load config defaults
require('./config');

// module permissions
const PERMISSIONS = bedrock.config.permission.permissions;

// module API
const api = {
  inboxes: {},
  messages: {}
};
module.exports = api;

const logger = bedrock.loggers.get('app');
const modcfg = config['ldn-inbox'];
let inboxCollection, messageCollection;

bedrock.events.on('bedrock-mongodb.ready', callback => {
  async.auto({
    openCollections: callback => {
      database.openCollections(
        Object.keys(modcfg.collections).map(key => modcfg.collections[key]),
        //Object.values(modCfg.collections) ES2017 please
        callback);
    },
    createIndexes: ['openCollections', (results, callback) => {
      inboxCollection = database.collections[modcfg.collections.inbox];
      messageCollection = database.collections[modcfg.collections.message];

      database.createIndexes([{
        collection: modcfg.collections.inbox,
        fields: {id: 1},
        options: {unique: true, background: false}
      }, {
        collection: modcfg.collections.inbox,
        fields: {owner: 1, id: 1},
        options: {unique: true, background: false}
      }, {
        collection: modcfg.collections.message,
        fields: {id: 1},
        options: {unique: true, background: false}
      }, {
        collection: modcfg.collections.message,
        fields: {inbox: 1, id: 1},
        options: {unique: true, background: false}
      }], callback);
    }],
    createInboxes: [
      'createIndexes', (results, callback) => {
      // add inboxes, ignoring duplicate errors
      async.eachSeries(Object.keys(modcfg.inboxes), function(id, callback) {
        const inbox = modcfg.inboxes[id];
        api.addInbox(null, inbox, err => {
          if(err && database.isDuplicateError(err)) {
            err = null;
          }
          callback(err);
        });
      }, callback);
    }]
  }, err => callback(err));
});

/**
 * Adds a new LDN inbox.
 *
 * @param actor the Identity performing the action.
 * @param inbox the LDN inbox to add.
 * @param callback(err, record) called once the operation completes.
 */
api.inboxes.add = function(actor, inbox, callback) {
  if(!inbox || typeof inbox !== 'object') {
    throw new TypeError('inbox must be specified.');
  }
  if(typeof inbox.id !== 'string') {
    throw new TypeError('inbox.id must be a string.');
  }
  if(typeof inbox.owner !== 'string') {
    throw new TypeError('inbox.owner must be a string.');
  }

  async.auto({
    checkPermission: callback => brPermission.checkPermission(
      actor, PERMISSIONS.LDN_INBOX_INSERT,
      {resource: inbox, translate: 'owner'}, callback),
    insert: ['checkPermission', (results, callback) => {
      logger.debug('[bedrock-ldn-inbox] adding inbox', inbox);

      var now = Date.now();
      var record = {
        id: database.hash(inbox.id),
        owner: database.hash(inbox.owner),
        meta: {
          created: now,
          updated: now,
          status: 'active'
        },
        inbox: inbox
      };
      inboxCollection.insert(
        record, database.writeOptions, (err, result) => {
          if(err) {
            return callback(err);
          }
          callback(null, result.ops[0]);
        });
    }]
  }, (err, results) => callback(err, results.insert));
};

/**
 * Gets an LDN inbox.
 *
 * @param actor the Identity performing the action.
 * @param id the ID of the LDN inbox to retrieve.
 * @param [options] the options to use:
 *          [meta] true to get the meta data for the inbox too, changing
 *            the value passed to the callback to be: {inbox: ..., meta: ...}.
 * @param callback(err, inbox) called once the operation completes.
 */
api.inboxes.get = function(actor, id, options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};
  async.auto({
    find: callback => inboxCollection.findOne(
      {id: database.hash(id), 'meta.status': 'active'}, {}, callback),
    exists: ['find', (results, callback) => {
      if(!results.find) {
        return callback(new BedrockError(
          'Inbox not found.', 'NotFound',
          {inbox: id, httpStatusCode: 404, public: true}));
      }
      callback();
    }],
    checkPermission: ['exists', (results, callback) =>
      brPermission.checkPermission(
        actor, PERMISSIONS.LDN_INBOX_ACCESS,
        {resource: results.find.inbox, translate: 'owner'}, callback)],
  }, (err, results) => {
    if(err) {
      return callback(err);
    }
    if(options.meta === true) {
      return callback(
        null, {inbox: results.find.inbox, meta: results.find.meta});
    }
    callback(null, results.find.inbox);
  });
};

/**
 * Gets all LDN inboxes matching the given query.
 *
 * @param actor the Identity performing the action.
 * @param [query] the optional query to use (default: {}).
 * @param [fields] optional fields to include or exclude (default: {}).
 * @param [options] options (eg: 'sort', 'limit').
 * @param callback(err, records) called once the operation completes.
 */
api.inboxes.getAll = function(actor, query, fields, options, callback) {
  // handle args
  if(typeof query === 'function') {
    callback = query;
    query = null;
    fields = null;
  } else if(typeof fields === 'function') {
    callback = fields;
    fields = null;
  } else if(typeof options === 'function') {
    callback = options;
    options = null;
  }

  query = query || {};
  fields = fields || {};
  options = options || {};
  async.auto({
    // need inbox access capability for all resources to use this
    checkPermission: callback => brPermission.checkPermission(
      actor, PERMISSIONS.LDN_INBOX_ACCESS, callback),
    find: ['checkPermission', (results, callback) => inboxCollection.find(
      query, fields, options).toArray(callback)],
  }, (err, results) => callback(err, results.find || []));
};

// TODO: implement updating inboxes

/**
 * Marks an LDN inbox as deleted.
 *
 * @param actor the Identity performing the action.
 * @param id the ID of the LDN inbox.
 * @param callback(err) called once the operation completes.
 */
api.inboxes.remove = function(actor, id, callback) {
  async.auto({
    get: callback => api.inboxes.get(null, id, callback),
    checkPermission: ['get', (results, callback) =>
      brPermission.checkPermission(
        actor, PERMISSIONS.LDN_INBOX_REMOVE,
        {resource: results.get, translate: 'owner'}, callback)],
    update: ['checkPermission', callback => {
      var now = Date.now();
      inboxCollection.update(
        {id: database.hash(id)},
        {$set: {'meta.status': 'deleted', 'meta.updated': now}},
        database.writeOptions, (err, result) => {
          if(err) {
            return callback(err);
          }
          if(result.n === 0) {
            return callback(new BedrockError(
              'Could not remove inbox. Inbox not found.', 'NotFound',
              {httpStatusCode: 404, inbox: id, public: true}
            ));
          }
          callback(null, result);
        });
    }]
  }, (err, results) => callback(err, results ? results.update.result : null));
};

/**
 * Adds a new LDN message.
 *
 * @param actor the Identity performing the action.
 * @param message the LDN message to add.
 * @param options the options to use:
 *          inbox the ID of the inbox to add this message to.
 * @param callback(err, record) called once the operation completes.
 */
api.messages.add = function(actor, message, options, callback) {
  if(!message || typeof message !== 'object') {
    throw new TypeError('message must be specified.');
  }
  if(typeof message.id !== 'string') {
    throw new TypeError('message.id must be a string.');
  }
  if(!options || typeof options !== 'object' ||
    typeof options.inbox !== 'string') {
    throw new TypeError('options.inbox must be a string.');
  }

  async.auto({
    getInbox: callback => api.inboxes.get(null, options.inbox, callback),
    checkPermission: ['getInbox', (results, callback) =>
      // message insert capability must be for the *inbox*, not the message
      brPermission.checkPermission(
        actor, PERMISSIONS.LDN_MESSAGE_INSERT,
        {resource: results.getInbox, translate: 'owner'}, callback)],
    insert: ['checkPermission', (results, callback) => {
      logger.debug('[bedrock-ldn-inbox] adding message', message);

      var now = Date.now();
      var record = {
        id: database.hash(message.id),
        inbox: database.hash(options.inbox),
        meta: {
          created: now,
          updated: now,
          status: 'active',
          inbox: options.inbox
        },
        message: message
      };
      messageCollection.insert(
        record, database.writeOptions, (err, result) => {
          if(err) {
            return callback(err);
          }
          callback(null, result.ops[0]);
        });
    }]
  }, (err, results) => callback(err, results.insert));
};

/**
 * Gets an LDN message.
 *
 * @param actor the Identity performing the action.
 * @param id the ID of the LDN message to retrieve.
 * @param [options] the options to use:
 *          [meta] true to get the meta data for the message too, changing
 *            the value passed to the callback to be: {message: ..., meta: ...}.
 * @param callback(err, message) called once the operation completes.
 */
api.messages.get = function(actor, id, options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};
  async.auto({
    find: callback => messageCollection.findOne(
      {id: database.hash(id), 'meta.status': 'active'}, {}, callback),
    exists: ['find', (results, callback) => {
      if(!results.find) {
        return callback(new BedrockError(
          'Message not found.', 'NotFound',
          {message: id, httpStatusCode: 404, public: true}));
      }
      callback();
    }],
    checkPermission: ['exists', (results, callback) =>
      // need message access capability for message or its inbox
      brPermission.checkPermission(
        actor, PERMISSIONS.LDN_MESSAGE_ACCESS, {
          resource: results.find.message,
          translate: _useInboxOwnerTranslator(results.find.meta.inbox)
        }, callback)],
  }, (err, results) => {
    if(err) {
      return callback(err);
    }
    if(options.meta === true) {
      return callback(
        null, {message: results.find.message, meta: results.find.meta});
    }
    callback(null, results.find.message);
  });
};

/**
 * Gets all LDN messages matching the given query.
 *
 * @param actor the Identity performing the action.
 * @param [query] the optional query to use (default: {}).
 * @param [fields] optional fields to include or exclude (default: {}).
 * @param [options] options (eg: 'sort', 'limit').
 * @param callback(err, records) called once the operation completes.
 */
api.messages.getAll = function(actor, query, fields, options, callback) {
  // handle args
  if(typeof query === 'function') {
    callback = query;
    query = null;
    fields = null;
  } else if(typeof fields === 'function') {
    callback = fields;
    fields = null;
  } else if(typeof options === 'function') {
    callback = options;
    options = null;
  }

  query = query || {};
  fields = fields || {};
  options = options || {};
  async.auto({
    // need message access capability for all resources to use this
    checkPermission: callback => brPermission.checkPermission(
      actor, PERMISSIONS.LDN_MESSAGE_ACCESS, callback),
    find: ['checkPermission', (results, callback) => messageCollection.find(
      query, fields, options).toArray(callback)],
  }, (err, results) => callback(err, results.find || []));
};

// TODO: implement updating messages

/**
 * Marks an LDN message as deleted.
 *
 * @param actor the Identity performing the action.
 * @param id the ID of the LDN message.
 * @param callback(err) called once the operation completes.
 */
api.messages.remove = function(actor, id, callback) {
  async.auto({
    get: callback => api.messages.get(null, id, {meta: true}, callback),
    checkPermission: ['get', (results, callback) =>
      // need message removal capability for message or its inbox
      brPermission.checkPermission(
        actor, PERMISSIONS.LDN_MESSAGE_REMOVE, {
          resource: results.get.message,
          translate: _useInboxOwnerTranslator(results.get.meta.inbox)
        }, callback)],
    update: ['checkPermission', callback => {
      var now = Date.now();
      messageCollection.update(
        {id: database.hash(id)},
        {$set: {'meta.status': 'deleted', 'meta.updated': now}},
        database.writeOptions, (err, result) => {
          if(err) {
            return callback(err);
          }
          if(result.n === 0) {
            return callback(new BedrockError(
              'Could not remove message. Message not found.', 'NotFound',
              {httpStatusCode: 404, message: id, public: true}
            ));
          }
          callback(null, result);
        });
    }]
  }, (err, results) => callback(err, results ? results.update.result : null));
};

/**
 * Sets an LDN message's inbox (i.e. moves the message to another inbox).
 *
 * @param actor the Identity performing the action.
 * @param messageId the message ID.
 * @param inboxId the ID of the inbox to move the message to.
 * @param [options] the options to use:
 *          messageRecord the message record, including `message` and `meta`,
 *            useful when doing bulk filtering to avoid multiple db queries.
 *          targetInbox the target inbox resource, useful when doing bulk
 *            filtering to avoid multiple db queries.
 * @param callback(err) called once the operation completes.
 */
api.messages.move = function(actor, messageId, inboxId, options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};
  async.auto({
    getMessage: callback => {
      if(options.messageRecord) {
        return callback(null, options.messageRecord);
      }
      api.messages.get(null, messageId, {meta: true}, callback);
    },
    getTargetInbox: callback => {
      if(options.targetInbox) {
        return callback(null, options.targetInbox);
      }
      api.inboxes.get(null, inboxId, callback);
    },
    checkRemovePermission: ['getMessage', (results, callback) =>
      // need message removal capability for message or its current inbox
      brPermission.checkPermission(
        actor, PERMISSIONS.LDN_MESSAGE_REMOVE, {
          resource: results.getMessage.message,
          translate: _useInboxOwnerTranslator(results.getMessage.meta.inbox)
        }, callback)],
    checkInsertPermission: ['getTargetInbox', (results, callback) =>
      // message insert capability must be for target *inbox*, not the message
      brPermission.checkPermission(
        actor, PERMISSIONS.LDN_MESSAGE_INSERT,
        {resource: results.getTargetInbox, translate: 'owner'}, callback)],
    update: [
      'checkRemovePermission', 'checkInsertPermission', (results, callback) => {
      var now = Date.now();
      messageCollection.update(
        {id: database.hash(messageId), 'meta.inbox': {$ne: inboxId}},
        {$set: {'meta.inbox': inboxId, 'meta.updated': now}},
        database.writeOptions, (err, result) => {
          if(err) {
            return callback(err);
          }
          if(result.n === 0) {
            return callback(new BedrockError(
              `Could not move message; message not found or already present `
              `in the target inbox.`, 'BadRequest', {
                httpStatusCode: 400,
                message: messageId,
                target: inboxId,
                public: true
              }
            ));
          }
          callback(null, result);
        });
    }]
  }, (err, results) => callback(err, results ? results.update.result : null));
};

function _useInboxOwnerTranslator(inbox) {
  return function useInboxOwnerTranslator(permission, options, callback) {
    const ids = [];
    const resources = options.resource || options.or || options.and;
    if(!options.and) {
      ids.push(...resources);
    }
    async.auto({
      getInbox: callback => {
        if(typeof inbox === 'string') {
          return api.inboxes.get(null, inbox, callback);
        }
        callback(null, inbox);
      },
      addOwner: ['getInbox', (results, callback) => {
        ids.push(results.getInbox.owner);
        callback();
      }]
    }, err => callback(err, ids));
  };
}
