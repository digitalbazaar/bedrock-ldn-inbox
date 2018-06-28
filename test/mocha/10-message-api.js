/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
/* global should */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const config = bedrock.config;
const brIdentity = require('bedrock-identity');
const brLdnInbox = require('bedrock-ldn-inbox');
const database = require('bedrock-mongodb');
const expect = global.chai.expect;
const helpers = require('./helpers');
const mockData = require('./mock.data');
const modcfg = config['ldn-inbox'];

const messageCollection = database.collections[modcfg.collections.message];

describe('bedrock-ldn-inbox message API', () => {
  before(done => helpers.prepareDatabase(mockData, done));
  let inboxId;
  let inboxIdBeta;
  let inboxIdGamma;
  beforeEach(done => {
    async.series([
      callback => helpers.removeCollection(
        modcfg.collections.inbox, callback),
      callback => {
        const inbox = helpers.createInbox(mockData);
        inboxId = inbox.id;
        const owner = mockData.identities.regularUser.identity.id;
        brLdnInbox.inboxes.add(null, inbox, {owner: owner}, callback);
      },
      callback => {
        const inbox = helpers.createInbox(mockData);
        inboxIdBeta = inbox.id;
        const owner = mockData.identities.regularUser.identity.id;
        brLdnInbox.inboxes.add(null, inbox, {owner: owner}, callback);
      },
      callback => {
        const inbox = helpers.createInbox(mockData);
        inboxIdGamma = inbox.id;
        const owner = helpers.IDENTITY_BASE_PATH + 'someUser';
        brLdnInbox.inboxes.add(null, inbox, {owner: owner}, callback);
      }
    ], done);
  });
  describe('message.add API', () => {
    describe('null actor', () => {
      it('adds a message', done => {
        const message = helpers.createMessage(mockData);
        async.auto({
          add: callback => brLdnInbox.messages.add(
            null, message, {inbox: inboxId}, (err, result) => {
              expect(err).to.not.be.ok;
              expect(result).to.be.ok;
              result.message.should.deep.equal(message);
              should.exist(result.meta);
              result.meta.should.be.an('object');
              result.meta.created.should.be.a('number');
              result.meta.updated.should.be.a('number');
              result.meta.inbox.should.equal(inboxId);
              result.meta.status.should.equal('active');
              callback();
            }),
          test: ['add', (results, callback) => messageCollection.findOne(
            {id: database.hash(message.id)}, {}, (err, result) => {
              expect(err).to.not.be.ok;
              expect(result).to.be.ok;
              result.message.should.deep.equal(message);
              should.exist(result.meta);
              result.meta.should.be.an('object');
              result.meta.created.should.be.a('number');
              result.meta.updated.should.be.a('number');
              result.meta.inbox.should.equal(inboxId);
              result.meta.status.should.equal('active');
              callback();
            })
          ]
        }, done);
      });
      it('returns `TypeError` if `message` is not an object', done => {
        const message = 'a_string';
        expect(() => brLdnInbox.messages.add(
          null, message, {inbox: inboxId}, () => {})).to.throw(TypeError);
        done();
      });
      it('returns `TypeError` if `message.id` is not a string', done => {
        const message = {id: null};
        expect(() => brLdnInbox.messages.add(
          null, message, {inbox: inboxId}, () => {})).to.throw(TypeError);
        done();
      });
      it('returns `TypeError` if `options.inbox` is not a string', done => {
        const message = helpers.createMessage(mockData);
        expect(() => brLdnInbox.messages.add(
          null, message, {inbox: null}, () => {})).to.throw(TypeError);
        done();
      });
    }); // end null actor
    describe('regular actor', () => {
      const identity = mockData.identities.regularUser.identity.id;
      let actor;
      before(done => brIdentity.get(null, identity, (err, result) => {
        actor = result;
        done();
      }));
      it('adds a message', done => {
        const message = helpers.createMessage(mockData);
        async.auto({
          add: callback => brLdnInbox.messages.add(
            actor, message, {inbox: inboxId}, (err, result) => {
              expect(err).to.not.be.ok;
              expect(result).to.be.ok;
              result.message.should.deep.equal(message);
              should.exist(result.meta);
              result.meta.should.be.an('object');
              result.meta.created.should.be.a('number');
              result.meta.updated.should.be.a('number');
              result.meta.inbox.should.equal(inboxId);
              result.meta.status.should.equal('active');
              callback();
            }),
          test: ['add', (results, callback) => messageCollection.findOne(
            {id: database.hash(message.id)}, {}, (err, result) => {
              expect(err).to.not.be.ok;
              expect(result).to.be.ok;
              result.message.should.deep.equal(message);
              should.exist(result.meta);
              result.meta.should.be.an('object');
              result.meta.created.should.be.a('number');
              result.meta.updated.should.be.a('number');
              result.meta.inbox.should.equal(inboxId);
              result.meta.status.should.equal('active');
              callback();
            })
          ]
        }, done);
      });
      it('returns `PermissionDenied` if actor is not inbox owner', done => {
        const message = helpers.createMessage(mockData);
        brLdnInbox.messages.add(
          actor, message, {inbox: inboxIdGamma}, (err, result) => {
            expect(err).to.be.ok;
            expect(result).to.not.be.ok;
            err.name.should.equal('PermissionDenied');
            err.details.sysPermission.should.equal('LDN_MESSAGE_INSERT');
            done();
          });
      });
    }); // end regular user
  }); // end message.add
  describe('message.get API', () => {
    describe('null actor', () => {
      it('should get a message', done => {
        const message = helpers.createMessage(mockData);
        async.auto({
          add: callback => brLdnInbox.messages.add(
            null, message, {inbox: inboxId}, callback),
          get: ['add', (results, callback) => brLdnInbox.messages.get(
            null, message.id, (err, result) => {
              expect(err).to.not.be.ok;
              expect(result).to.be.ok;
              result.should.be.an('object');
              result.id.should.equal(message.id);
              callback();
            })
          ]
        }, done);
      });
      it('should get an message with meta data', done => {
        const message = helpers.createMessage(mockData);
        async.auto({
          add: callback => brLdnInbox.messages.add(
            null, message, {inbox: inboxId}, callback),
          get: ['add', (results, callback) =>
            brLdnInbox.messages.get(
              null, message.id, {meta: true}, (err, result) => {
                expect(err).to.not.be.ok;
                expect(result).to.be.ok;
                result.should.be.an('object');
                result.message.should.be.an('object');
                result.message.id.should.equal(message.id);
                result.meta.should.be.an('object');
                result.meta.should.be.an('object');
                result.meta.created.should.be.a('number');
                result.meta.updated.should.be.a('number');
                result.meta.inbox.should.equal(inboxId);
                result.meta.status.should.equal('active');
                callback();
              })
          ]
        }, done);
      });
      it('returns `NotFound` on unknown message', done => {
        const messageId = 'unknown';
        brLdnInbox.messages.get(null, messageId, (err, result) => {
          expect(err).to.be.ok;
          expect(result).to.not.be.ok;
          err.name.should.equal('NotFound');
          err.details.message.should.equal(messageId);
          done();
        });
      });
      it('returns `NotFound` if message has been removed', done => {
        const message = helpers.createMessage(mockData);
        async.auto({
          add: callback => brLdnInbox.messages.add(
            null, message, {inbox: inboxId}, callback),
          remove: ['add', (results, callback) => brLdnInbox.messages.remove(
            null, message.id, callback)
          ],
          get: ['remove', (results, callback) => brLdnInbox.messages.get(
            null, message.id, (err, result) => {
              expect(err).to.be.ok;
              expect(result).to.not.be.ok;
              err.name.should.equal('NotFound');
              err.details.message.should.equal(message.id);
              callback();
            })
          ]
        }, done);
      });
    }); // end null actor
    describe('regular actor', () => {
      const identity = mockData.identities.regularUser.identity.id;
      let actor;
      before(done => brIdentity.get(null, identity, (err, result) => {
        actor = result;
        done();
      }));
      it('should get a message', done => {
        const message = helpers.createMessage(mockData);
        async.auto({
          add: callback => brLdnInbox.messages.add(
            null, message, {inbox: inboxId}, callback),
          get: ['add', (results, callback) => brLdnInbox.messages.get(
            actor, message.id, (err, result) => {
              expect(err).to.not.be.ok;
              expect(result).to.be.ok;
              result.should.be.an('object');
              result.id.should.equal(message.id);
              callback();
            })
          ]
        }, done);
      });
      it('returns `PermissionDenied` if actor is not inbox owner', done => {
        const message = helpers.createMessage(mockData);
        async.auto({
          add: callback => brLdnInbox.messages.add(
            null, message, {inbox: inboxIdGamma}, callback),
          get: ['add', (results, callback) => brLdnInbox.messages.get(
            actor, message.id, (err, result) => {
              expect(err).to.be.ok;
              expect(result).to.not.be.ok;
              err.name.should.equal('PermissionDenied');
              err.details.sysPermission.should.equal('LDN_MESSAGE_ACCESS');
              callback();
            })
          ]
        }, done);
      });
    }); // end regular user
  }); // end message.get
  describe('message.getAll API', () => {
    beforeEach(done => helpers.removeCollection(
      modcfg.collections.message, done));
    describe('null actor', () => {
      it('should return empty array if there are no messages', done => {
        brLdnInbox.messages.getAll(null, (err, result) => {
          expect(err).to.not.be.ok;
          expect(result).to.be.ok;
          result.should.be.an('array');
          result.should.have.length(0);
          done();
        });
      });
      it('should get messages', done => {
        const message = helpers.createMessage(mockData);
        async.auto({
          add: callback => brLdnInbox.messages.add(
            null, message, {inbox: inboxId}, callback),
          get: ['add', (results, callback) => brLdnInbox.messages.getAll(
            null, (err, result) => {
              expect(err).to.not.be.ok;
              expect(result).to.be.ok;
              result.should.be.an('array');
              result.should.have.length(1);
              result[0].should.be.an('object');
              result[0].message.should.be.an('object');
              result[0].meta.should.be.an('object');
              callback();
            })
          ]
        }, done);
      });
      it('should query based on inbox', done => {
        const message = helpers.createMessage(mockData);
        async.auto({
          add: callback => brLdnInbox.messages.add(
            null, message, {inbox: inboxId}, callback),
          get: ['add', (results, callback) => brLdnInbox.messages.getAll(
            null, {'meta.inbox': inboxId}, (err, result) => {
              expect(err).to.not.be.ok;
              expect(result).to.be.ok;
              result.should.be.an('array');
              result.should.have.length(1);
              result[0].should.be.an('object');
              result[0].message.should.be.an('object');
              result[0].meta.should.be.an('object');
              callback();
            })
          ],
          getZero: ['add', (results, callback) => brLdnInbox.messages.getAll(
            null, {'meta.inbox': 'noInbox'}, (err, result) => {
              expect(err).to.not.be.ok;
              expect(result).to.be.ok;
              result.should.be.an('array');
              result.should.have.length(0);
              callback();
            })
          ]
        }, done);
      });
    }); // end null actor
    describe('regular actor', () => {
      const identity = mockData.identities.regularUser.identity.id;
      let actor;
      before(done => brIdentity.get(null, identity, (err, result) => {
        actor = result;
        done();
      }));
      it('should return `PermissionDenied`', done => {
        brLdnInbox.messages.getAll(actor, (err, result) => {
          expect(err).to.be.ok;
          expect(result).to.not.be.ok;
          err.name.should.equal('PermissionDenied');
          err.details.sysPermission.should.equal('LDN_MESSAGE_ACCESS');
          done();
        });
      });
    }); // end regular user
    describe('admin user actor', () => {
      const identity = mockData.identities.adminUser.identity.id;
      let actor;
      before(done => brIdentity.get(null, identity, (err, result) => {
        actor = result;
        done();
      }));
      it('should return empty array if there are no messages', done => {
        brLdnInbox.messages.getAll(actor, (err, result) => {
          expect(err).to.not.be.ok;
          expect(result).to.be.ok;
          result.should.be.an('array');
          result.should.have.length(0);
          done();
        });
      });
      it('should get messages', done => {
        const message = helpers.createMessage(mockData);
        async.auto({
          add: callback => brLdnInbox.messages.add(
            null, message, {inbox: inboxId}, callback),
          get: ['add', (results, callback) => brLdnInbox.messages.getAll(
            actor, (err, result) => {
              expect(err).to.not.be.ok;
              expect(result).to.be.ok;
              result.should.be.an('array');
              result.should.have.length(1);
              result[0].should.be.an('object');
              result[0].message.should.be.an('object');
              result[0].meta.should.be.an('object');
              callback();
            })
          ]
        }, done);
      });
    }); // end admin user
  }); // end message.getAll
  describe('message.remove API', () => {
    describe('null actor', () => {
      it('should remove a message', done => {
        const message = helpers.createMessage(mockData);
        async.auto({
          add: callback => brLdnInbox.messages.add(
            null, message, {inbox: inboxId}, callback),
          remove: ['add', (results, callback) => brLdnInbox.messages.remove(
            null, message.id, (err, result) => {
              expect(err).to.not.be.ok;
              expect(result).to.be.ok;
              result.should.be.an('object');
              result.n.should.equal(1);
              callback();
            })
          ],
          test: ['remove', (results, callback) =>
            messageCollection.findOne(
              {id: database.hash(message.id)}, {}, (err, result) => {
                expect(err).to.not.be.ok;
                result.message.should.deep.equal(message);
                should.exist(result.meta);
                result.meta.status.should.equal('deleted');
                callback();
              })
          ]
        }, done);
      });
      it('returns `NotFound` on an unknown message', done => {
        brLdnInbox.messages.remove(null, 'unknown_message', (err, result) => {
          expect(err).to.be.ok;
          expect(result).to.not.be.ok;
          err.name.should.equal('NotFound');
          done();
        });
      });
    }); // end null actor
    describe('regular actor', () => {
      const identity = mockData.identities.regularUser.identity.id;
      let actor;
      before(done => brIdentity.get(null, identity, (err, result) => {
        actor = result;
        done();
      }));
      it('should remove a message', done => {
        const message = helpers.createMessage(mockData);
        async.auto({
          add: callback => brLdnInbox.messages.add(
            null, message, {inbox: inboxId}, callback),
          remove: ['add', (results, callback) => brLdnInbox.messages.remove(
            actor, message.id, (err, result) => {
              expect(err).to.not.be.ok;
              expect(result).to.be.ok;
              result.should.be.an('object');
              result.n.should.equal(1);
              callback();
            })
          ],
          test: ['remove', (results, callback) =>
            messageCollection.findOne(
              {id: database.hash(message.id)}, {}, (err, result) => {
                expect(err).to.not.be.ok;
                result.message.should.deep.equal(message);
                should.exist(result.meta);
                result.meta.status.should.equal('deleted');
                callback();
              })
          ]
        }, done);
      });
      it('returns `PermissionDenied` if actor is not inbox owner', done => {
        const message = helpers.createMessage(mockData);
        async.auto({
          add: callback => brLdnInbox.messages.add(
            null, message, {inbox: inboxIdGamma}, callback),
          remove: ['add', (results, callback) => brLdnInbox.messages.remove(
            actor, message.id, (err, result) => {
              expect(err).to.be.ok;
              expect(result).to.not.be.ok;
              err.name.should.equal('PermissionDenied');
              err.details.sysPermission.should.equal('LDN_MESSAGE_REMOVE');
              callback();
            })
          ]
        }, done);
      });
    }); // end regular user
  }); // end message.remove
  describe('message.move API', () => {
    describe('null actor', () => {
      it('should move a message', done => {
        const message = helpers.createMessage(mockData);
        async.auto({
          add: callback => brLdnInbox.messages.add(
            null, message, {inbox: inboxId}, callback),
          move: ['add', (results, callback) => brLdnInbox.messages.move(
            null, message.id, inboxIdGamma, (err, result) => {
              expect(err).to.not.be.ok;
              expect(result).to.be.ok;
              result.should.be.an('object');
              result.n.should.equal(1);
              callback();
            })
          ],
          test: ['move', (results, callback) =>
            messageCollection.findOne(
              {id: database.hash(message.id)}, {}, (err, result) => {
                expect(err).to.not.be.ok;
                result.message.should.deep.equal(message);
                should.exist(result.meta);
                result.meta.inbox.should.equal(inboxIdGamma);
                callback();
              })
          ]
        }, done);
      });
    }); // end null actor
    describe('regular actor', () => {
      const identity = mockData.identities.regularUser.identity.id;
      let actor;
      before(done => brIdentity.get(null, identity, (err, result) => {
        actor = result;
        done();
      }));
      it('moves message if actor owns target and source inbox', done => {
        const message = helpers.createMessage(mockData);
        async.auto({
          add: callback => brLdnInbox.messages.add(
            null, message, {inbox: inboxId}, callback),
          move: ['add', (results, callback) => brLdnInbox.messages.move(
            actor, message.id, inboxIdBeta, (err, result) => {
              expect(err).to.not.be.ok;
              expect(result).to.be.ok;
              result.should.be.an('object');
              result.n.should.equal(1);
              callback();
            })
          ],
          test: ['move', (results, callback) =>
            messageCollection.findOne(
              {id: database.hash(message.id)}, {}, (err, result) => {
                expect(err).to.not.be.ok;
                result.message.should.deep.equal(message);
                should.exist(result.meta);
                result.meta.inbox.should.equal(inboxIdBeta);
                callback();
              })
          ]
        }, done);
      });
      it('`PermissionDenied` if actor does not own target inbox', done => {
        const message = helpers.createMessage(mockData);
        async.auto({
          add: callback => brLdnInbox.messages.add(
            null, message, {inbox: inboxId}, callback),
          move: ['add', (results, callback) => brLdnInbox.messages.move(
            actor, message.id, inboxIdGamma, (err, result) => {
              expect(err).to.be.ok;
              expect(result).to.not.be.ok;
              err.name.should.equal('PermissionDenied');
              err.details.sysPermission.should.equal('LDN_MESSAGE_INSERT');
              callback();
            })
          ]
        }, done);
      });
      it('`PermissionDenied` if actor does not own source inbox', done => {
        const message = helpers.createMessage(mockData);
        async.auto({
          add: callback => brLdnInbox.messages.add(
            null, message, {inbox: inboxIdGamma}, callback),
          move: ['add', (results, callback) => brLdnInbox.messages.move(
            actor, message.id, inboxId, (err, result) => {
              expect(err).to.be.ok;
              expect(result).to.not.be.ok;
              err.name.should.equal('PermissionDenied');
              err.details.sysPermission.should.equal('LDN_MESSAGE_REMOVE');
              callback();
            })
          ]
        }, done);
      });
    }); // end regular user
    describe('admin actor', () => {
      const identity = mockData.identities.adminUser.identity.id;
      let actor;
      before(done => brIdentity.get(null, identity, (err, result) => {
        actor = result;
        done();
      }));
      it('should move a message', done => {
        const message = helpers.createMessage(mockData);
        async.auto({
          add: callback => brLdnInbox.messages.add(
            null, message, {inbox: inboxId}, callback),
          move: ['add', (results, callback) => brLdnInbox.messages.move(
            actor, message.id, inboxIdGamma, (err, result) => {
              expect(err).to.not.be.ok;
              expect(result).to.be.ok;
              result.should.be.an('object');
              result.n.should.equal(1);
              callback();
            })
          ],
          test: ['move', (results, callback) =>
            messageCollection.findOne(
              {id: database.hash(message.id)}, {}, (err, result) => {
                expect(err).to.not.be.ok;
                result.message.should.deep.equal(message);
                should.exist(result.meta);
                result.meta.inbox.should.equal(inboxIdGamma);
                callback();
              })
          ]
        }, done);
      });
    }); // end admin user
  }); // end message.move
});
