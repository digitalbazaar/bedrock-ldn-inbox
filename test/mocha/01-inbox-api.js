/*!
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
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

const inboxCollection = database.collections[modcfg.collections.inbox];

describe('bedrock-ldn-inbox inbox API', () => {
  before(done => helpers.prepareDatabase(mockData, done));
  describe('inbox.add API', () => {
    describe('null actor', () => {
      it('should add an inbox', done => {
        const inbox = helpers.createInbox(mockData);
        const owner = mockData.identities.regularUser.identity.id;
        async.auto({
          add: callback => brLdnInbox.inboxes.add(
            null, inbox, {owner: owner}, (err, result) => {
              expect(err).to.not.be.ok;
              should.exist(result.inbox.id);
              result.inbox.id.should.equal(inbox.id);
              callback(err, result);
            }),
          test: ['add', (results, callback) => inboxCollection.findOne({
            id: database.hash(inbox.id)}, {}, (err, result) => {
              expect(err).to.not.be.ok;
              result.inbox.should.deep.equal(inbox);
              should.exist(result.meta);
              result.meta.should.be.an('object');
              result.meta.created.should.be.a('number');
              result.meta.updated.should.be.a('number');
              result.meta.owner.should.equal(owner);
              result.meta.status.should.equal('active');
              callback();
            })
          ]
        }, done);
      });
      it('returns `TypeError` if `inbox` is not an object', done => {
        const inbox = 'a_string';
        const owner = mockData.identities.regularUser.identity.id;
        expect(() => brLdnInbox.inboxes.add(
          null, inbox, {owner: owner}, () => {})).to.throw(TypeError);
        done();
      });
      it('returns `TypeError` if `inbox.id` is not specified', done => {
        const inbox = {};
        const owner = mockData.identities.regularUser.identity.id;
        expect(() => brLdnInbox.inboxes.add(
          null, inbox, {owner: owner}, () => {})).to.throw(TypeError);
        done();
      });
      it('returns `TypeError` if `options` is not an object', done => {
        const inbox = helpers.createInbox(mockData);
        expect(() => brLdnInbox.inboxes.add(
          null, inbox, 'a_string', () => {})).to.throw(TypeError);
        done();
      });
      it('returns `TypeError` if `options.owner` is not a string', done => {
        const inbox = helpers.createInbox(mockData);
        const owner = null;
        expect(() => brLdnInbox.inboxes.add(
          null, inbox, {owner: owner}, () => {})).to.throw(TypeError);
        done();
      });
    }); // end null actor
    describe('regular user actor', () => {
      const identity = mockData.identities.regularUser.identity.id;
      let actor;
      before(done => brIdentity.get(null, identity, (err, result) => {
        actor = result;
        done();
      }));
      it('should add an inbox', done => {
        const inbox = helpers.createInbox(mockData);
        const owner = actor.id;
        async.auto({
          add: callback => brLdnInbox.inboxes.add(
            actor, inbox, {owner: owner}, (err, result) => {
              expect(err).to.not.be.ok;
              should.exist(result.inbox.id);
              result.inbox.id.should.equal(inbox.id);
              callback(err, result);
            }),
          test: ['add', (results, callback) =>
            inboxCollection.findOne({
              id: database.hash(inbox.id)}, {}, (err, result) => {
                expect(err).to.not.be.ok;
                result.inbox.should.deep.equal(inbox);
                should.exist(result.meta);
                result.meta.should.be.an('object');
                result.meta.created.should.be.a('number');
                result.meta.updated.should.be.a('number');
                result.meta.owner.should.equal(owner);
                result.meta.status.should.equal('active');
                callback();
              })
          ]
        }, done);
      });
      it('returns `PermissionDenied` when actor is not owner', done => {
        const inbox = helpers.createInbox(mockData);
        const owner = helpers.IDENTITY_BASE_PATH + 'otherUser';
        brLdnInbox.inboxes.add(actor, inbox, {owner: owner}, (err) => {
          expect(err).to.be.ok;
          err.name.should.equal('PermissionDenied');
          err.details.sysPermission.should.equal('LDN_INBOX_INSERT');
          done();
        });
      });
    }); // end regular user actor
  }); // end inbox.add
  describe('inbox.get API', () => {
    describe('null actor', () => {
      it('should get an inbox', done => {
        const inbox = helpers.createInbox(mockData);
        const owner = mockData.identities.regularUser.identity.id;
        async.auto({
          add: callback => brLdnInbox.inboxes.add(
            null, inbox, {owner: owner}, callback),
          get: ['add', (results, callback) => brLdnInbox.inboxes.get(
            null, inbox.id, (err, result) => {
              expect(err).to.not.be.ok;
              expect(result).to.be.ok;
              result.should.be.an('object');
              result.id.should.equal(inbox.id);
              callback();
            })
          ]
        }, done);
      });
      it('should get an inbox with meta data', done => {
        const inbox = helpers.createInbox(mockData);
        const owner = mockData.identities.regularUser.identity.id;
        async.auto({
          add: callback => brLdnInbox.inboxes.add(
            null, inbox, {owner: owner}, callback),
          get: ['add', (results, callback) =>
            brLdnInbox.inboxes.get(
              null, inbox.id, {meta: true}, (err, result) => {
                expect(err).to.not.be.ok;
                expect(result).to.be.ok;
                result.should.be.an('object');
                result.inbox.should.be.an('object');
                result.inbox.id.should.equal(inbox.id);
                result.meta.should.be.an('object');
                result.meta.should.be.an('object');
                result.meta.created.should.be.a('number');
                result.meta.updated.should.be.a('number');
                result.meta.owner.should.equal(owner);
                result.meta.status.should.equal('active');
                callback();
              })
          ]
        }, done);
      });
      it('should get an inbox with message list', done => {
        const inbox = helpers.createInbox(mockData);
        const owner = mockData.identities.regularUser.identity.id;
        async.auto({
          add: callback => brLdnInbox.inboxes.add(
            null, inbox, {owner: owner}, callback),
          get: ['add', (results, callback) =>
            brLdnInbox.inboxes.get(
              null, inbox.id, {messageList: true}, (err, result) => {
                expect(err).to.not.be.ok;
                expect(result).to.be.ok;
                result.should.be.an('object');
                result.id.should.equal(inbox.id);
                result.contains.should.be.an('array');
                result.contains.should.have.length(0);
                callback();
              })
          ]
        }, done);
      });
      it('should get an inbox with meta data and message list', done => {
        const inbox = helpers.createInbox(mockData);
        const owner = mockData.identities.regularUser.identity.id;
        async.auto({
          add: callback => brLdnInbox.inboxes.add(
            null, inbox, {owner: owner}, callback),
          get: ['add', (results, callback) =>
            brLdnInbox.inboxes.get(
              null, inbox.id, {
                meta: true, messageList: true
              }, (err, result) => {
                expect(err).to.not.be.ok;
                expect(result).to.be.ok;
                result.should.be.an('object');
                result.inbox.should.be.an('object');
                result.inbox.id.should.equal(inbox.id);
                result.inbox.contains.should.be.an('array');
                result.inbox.contains.should.have.length(0);
                result.meta.should.be.an('object');
                result.meta.should.be.an('object');
                result.meta.created.should.be.a('number');
                result.meta.updated.should.be.a('number');
                result.meta.owner.should.equal(owner);
                result.meta.status.should.equal('active');
                callback();
              })
          ]
        }, done);
      });
      it('returns `NotFound` on unknown inbox', done => {
        const inbox = helpers.createInbox(mockData);
        inbox.id = 'unknown';
        brLdnInbox.inboxes.get(null, inbox.id, (err, result) => {
          expect(err).to.be.ok;
          expect(result).to.not.be.ok;
          err.name.should.equal('NotFound');
          err.details.inbox.should.equal(inbox.id);
          done();
        });
      });
      it('returns `NotFound` if inbox has been removed', done => {
        const inbox = helpers.createInbox(mockData);
        const owner = mockData.identities.regularUser.identity.id;
        async.auto({
          add: callback => brLdnInbox.inboxes.add(
            null, inbox, {owner: owner}, callback),
          remove: ['add', (results, callback) => brLdnInbox.inboxes.remove(
            null, inbox.id, callback)
          ],
          get: ['remove', (results, callback) => brLdnInbox.inboxes.get(
            null, inbox.id, (err, result) => {
              expect(err).to.be.ok;
              expect(result).to.not.be.ok;
              err.name.should.equal('NotFound');
              err.details.inbox.should.equal(inbox.id);
              callback();
            })
          ]
        }, done);
      });
    }); // end null actor
    describe('regular user actor', () => {
      const identity = mockData.identities.regularUser.identity.id;
      let actor;
      before(done => brIdentity.get(null, identity, (err, result) => {
        actor = result;
        done();
      }));
      it('should get an inbox', done => {
        const inbox = helpers.createInbox(mockData);
        const owner = actor.id;
        async.auto({
          add: callback => brLdnInbox.inboxes.add(
            null, inbox, {owner: owner}, callback),
          get: ['add', (results, callback) =>
            brLdnInbox.inboxes.get(actor, inbox.id, (err, result) => {
              expect(err).to.not.be.ok;
              expect(result).to.be.ok;
              result.should.be.an('object');
              result.id.should.equal(inbox.id);
              callback();
            })
          ]
        }, done);
      });
      it('returns `PermissionDenied` if actor is not owner', done => {
        const inbox = helpers.createInbox(mockData);
        const owner = helpers.IDENTITY_BASE_PATH + 'someUser';
        async.auto({
          add: callback => brLdnInbox.inboxes.add(
            null, inbox, {owner: owner}, callback),
          get: ['add', (results, callback) =>
            brLdnInbox.inboxes.get(actor, inbox.id, (err, result) => {
              expect(err).to.be.ok;
              expect(result).to.not.be.ok;
              err.name.should.equal('PermissionDenied');
              callback();
            })
          ]
        }, done);
      });
    }); // end regular user
  }); // end inbox.get
  describe('inbox.getAll API', () => {
    beforeEach(done => helpers.removeCollection(
      modcfg.collections.inbox, done));
    describe('null actor', () => {
      it('should return empty array if there are no inboxes', done => {
        brLdnInbox.inboxes.getAll(null, (err, result) => {
          expect(err).to.not.be.ok;
          expect(result).to.be.ok;
          result.should.be.an('array');
          result.should.have.length(0);
          done();
        });
      });
      it('should get inboxes', done => {
        const inbox = helpers.createInbox(mockData);
        const owner = mockData.identities.regularUser.identity.id;
        async.auto({
          add: callback => brLdnInbox.inboxes.add(
            null, inbox, {owner: owner}, callback),
          get: ['add', (results, callback) =>
            brLdnInbox.inboxes.getAll(null, (err, result) => {
              expect(err).to.not.be.ok;
              expect(result).to.be.ok;
              result.should.be.an('array');
              result.should.have.length(1);
              result[0].should.be.an('object');
              result[0].inbox.should.be.an('object');
              result[0].meta.should.be.an('object');
              callback();
            })
          ]
        }, done);
      });
      it('should query based on owner', done => {
        const inbox = helpers.createInbox(mockData);
        const owner = mockData.identities.regularUser.identity.id;
        const ownerNoInbox = helpers.IDENTITY_BASE_PATH + 'ownerNoInbox';
        async.auto({
          add: callback => brLdnInbox.inboxes.add(
            null, inbox, {owner: owner}, callback),
          get: ['add', (results, callback) => brLdnInbox.inboxes.getAll(
            null, {'meta.owner': owner}, (err, result) => {
              expect(err).to.not.be.ok;
              expect(result).to.be.ok;
              result.should.be.an('array');
              result.should.have.length(1);
              result[0].should.be.an('object');
              result[0].inbox.should.be.an('object');
              result[0].meta.should.be.an('object');
              callback();
            })
          ],
          getZero: ['add', (results, callback) => brLdnInbox.inboxes.getAll(
            null, {'meta.owner': ownerNoInbox}, (err, result) => {
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
    describe('regular user actor', () => {
      const identity = mockData.identities.regularUser.identity.id;
      let actor;
      before(done => brIdentity.get(null, identity, (err, result) => {
        actor = result;
        done();
      }));
      it('should return `[]` if actor does not own any inboxes', done => {
        const inbox = helpers.createInbox(mockData);
        const owner = mockData.identities.adminUser.identity.id;
        async.auto({
          add: callback => brLdnInbox.inboxes.add(
            null, inbox, {owner: owner}, callback),
          get: ['add', (results, callback) => brLdnInbox.inboxes.getAll(
            actor, (err, result) => {
              expect(err).to.not.be.ok;
              expect(result).to.be.ok;
              result.should.be.an('array');
              result.should.have.length(0);
              callback();
            })]
        }, done);
      });
      it('returns inboxes based on owner query', done => {
        const inbox = helpers.createInbox(mockData);
        const owner = mockData.identities.regularUser.identity.id;
        async.auto({
          add: callback => brLdnInbox.inboxes.add(
            null, inbox, {owner: owner}, callback),
          get: ['add', (results, callback) => brLdnInbox.inboxes.getAll(
            actor, {owner: database.hash(owner)}, (err, result) => {
              expect(err).to.not.be.ok;
              expect(result).to.be.ok;
              result.should.be.an('array');
              result.should.have.length(1);
              Object.keys(result[0].inbox).should.have.same.members([
                'id', '@context', 'type'
              ]);
              callback();
            })]
        }, done);
      });
      it('returns inboxes when projection does not include meta', done => {
        const inbox = helpers.createInbox(mockData);
        const owner = mockData.identities.regularUser.identity.id;
        async.auto({
          add: callback => brLdnInbox.inboxes.add(
            null, inbox, {owner: owner}, callback),
          get: ['add', (results, callback) => brLdnInbox.inboxes.getAll(
            actor, {}, {'inbox.id': true}, (err, result) => {
              expect(err).to.not.be.ok;
              expect(result).to.be.ok;
              result.should.be.an('array');
              result.should.have.length(1);
              Object.keys(result[0].inbox).should.have.same.members(['id']);
              callback();
            })]
        }, done);
      });
    }); // end regular user
    describe('admin user actor', () => {
      const identity = mockData.identities.adminUser.identity.id;
      let actor;
      before(done => brIdentity.get(null, identity, (err, result) => {
        actor = result;
        done();
      }));
      it('should return empty array if there are no inboxes', done => {
        brLdnInbox.inboxes.getAll(actor, (err, result) => {
          expect(err).to.not.be.ok;
          expect(result).to.be.ok;
          result.should.be.an('array');
          result.should.have.length(0);
          done();
        });
      });
      it('should get inboxes', done => {
        const inbox = helpers.createInbox(mockData);
        const owner = mockData.identities.regularUser.identity.id;
        async.auto({
          add: callback => brLdnInbox.inboxes.add(
            null, inbox, {owner: owner}, callback),
          get: ['add', (results, callback) =>
            brLdnInbox.inboxes.getAll(actor, (err, result) => {
              expect(err).to.not.be.ok;
              expect(result).to.be.ok;
              result.should.be.an('array');
              result.should.have.length(1);
              result[0].should.be.an('object');
              result[0].inbox.should.be.an('object');
              result[0].meta.should.be.an('object');
              callback();
            })
          ]
        }, done);
      });
    }); // end admin user
  }); // end inbox.getAll
  describe('inbox.remove API', () => {
    describe('null actor', () => {
      it('should remove an inbox', done => {
        const inbox = helpers.createInbox(mockData);
        const owner = mockData.identities.regularUser.identity.id;
        async.auto({
          add: callback => brLdnInbox.inboxes.add(
            null, inbox, {owner: owner}, callback),
          remove: ['add', (results, callback) => brLdnInbox.inboxes.remove(
            null, inbox.id, (err, result) => {
              expect(err).to.not.be.ok;
              expect(result).to.be.ok;
              result.should.be.an('object');
              result.n.should.equal(1);
              callback();
            })
          ],
          test: ['remove', (results, callback) =>
            inboxCollection.findOne({
              id: database.hash(inbox.id)}, {}, (err, result) => {
                expect(err).to.not.be.ok;
                result.inbox.should.deep.equal(inbox);
                should.exist(result.meta);
                result.meta.status.should.equal('deleted');
                callback();
              })
          ]
        }, done);
      });
      it('returns `NotFound` on an unknown inbox', done => {
        brLdnInbox.inboxes.remove(null, 'unknown_inbox', (err, result) => {
          expect(err).to.be.ok;
          expect(result).to.not.be.ok;
          err.name.should.equal('NotFound');
          done();
        });
      });
    }); // end null actor
    describe('regular user actor', () => {
      const identity = mockData.identities.regularUser.identity.id;
      let actor;
      before(done => brIdentity.get(null, identity, (err, result) => {
        actor = result;
        done();
      }));
      it('should remove an inbox', done => {
        const inbox = helpers.createInbox(mockData);
        const owner = actor.id;
        async.auto({
          add: callback => brLdnInbox.inboxes.add(
            null, inbox, {owner: owner}, callback),
          remove: ['add', (results, callback) => brLdnInbox.inboxes.remove(
            actor, inbox.id, (err, result) => {
              expect(err).to.not.be.ok;
              expect(result).to.be.ok;
              result.should.be.an('object');
              result.n.should.equal(1);
              callback();
            })
          ],
          test: ['remove', (results, callback) =>
            inboxCollection.findOne({
              id: database.hash(inbox.id)}, {}, (err, result) => {
                expect(err).to.not.be.ok;
                result.inbox.should.deep.equal(inbox);
                should.exist(result.meta);
                result.meta.status.should.equal('deleted');
                callback();
              })
          ]
        }, done);
      });
      it('returns `PermissionDenied` if actor is not owner', done => {
        const inbox = helpers.createInbox(mockData);
        const owner = helpers.IDENTITY_BASE_PATH + 'someUser';
        async.auto({
          add: callback => brLdnInbox.inboxes.add(
            null, inbox, {owner: owner}, callback),
          remove: ['add', (results, callback) => brLdnInbox.inboxes.remove(
            actor, inbox.id, (err, result) => {
              expect(err).to.be.ok;
              expect(result).to.not.be.ok;
              err.name.should.equal('PermissionDenied');
              err.details.sysPermission.should.equal('LDN_INBOX_REMOVE');
              callback();
            })
          ]
        }, done);
      });
    }); // end regular user
  }); // end inbox remove
});
