/* global chai */
/* global sinon */
/* global describe */
/* global it */
/* global expect */
/* global afterEach */

import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import _ from 'lodash';

import isTSA from 'tidepool-standard-action';

import * as async from '../../../../app/redux/actions/async';

import initialState from '../../../../app/redux/reducers/initialState';

import * as ErrorMessages from '../../../../app/redux/constants/errorMessages';
import * as UserMessages from '../../../../app/redux/constants/usrMessages';

describe('Actions', () => {
  const mockStore = configureStore([thunk]);

  afterEach(function() {
    // very important to do this in an afterEach than in each test when __Rewire__ is used
    // if you try to reset within each test you'll make it impossible for tests to fail!
    async.__ResetDependency__('utils')
  })

  describe('Asynchronous Actions', () => {
    describe('signup', (done) => {
      it('should trigger SIGNUP_SUCCESS and it should call signup and get once for a successful request', () => {
        let user = { id: 27 };
        let api = {
          user: {
            signup: sinon.stub().callsArgWith(1, null, user),
          }
        };

        let expectedActions = [
          { type: 'SIGNUP_REQUEST' },
          { type: 'SIGNUP_SUCCESS', payload: { user: { id: 27 } } },
          { type: '@@router/TRANSITION', payload: { args: [ '/email-verification' ], method: 'push' } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.signup(api, {foo: 'bar'}));

      });

      it('[409] should trigger SIGNUP_FAILURE and it should call signup once and get zero times for a failed signup request', () => {
        let user = { id: 27 };
        let api = {
          user: {
            signup: sinon.stub().callsArgWith(1, {status: 409, body: 'Error!'}, null),
          }
        };

        let err = new Error(ErrorMessages.ERR_ACCOUNT_ALREADY_EXISTS);
        err.status = 409;

        let expectedActions = [
          { type: 'SIGNUP_REQUEST' },
          { type: 'SIGNUP_FAILURE', error: err, meta: { apiError: {status: 409, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.signup(api, {foo: 'bar'}));

        expect(api.user.signup.callCount).to.equal(1);
      });

      it('[500] should trigger SIGNUP_FAILURE and it should call signup once and get zero times for a failed signup request', () => {
        let user = { id: 27 };
        let api = {
          user: {
            signup: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'}, null),
          }
        };

        let err = new Error(ErrorMessages.ERR_SIGNUP);
        err.status = 500;

        let expectedActions = [
          { type: 'SIGNUP_REQUEST' },
          { type: 'SIGNUP_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.signup(api, {foo: 'bar'}));

        expect(api.user.signup.callCount).to.equal(1);
      });
    });

    describe('confirmSignup', () => {
      it('should trigger CONFIRM_SIGNUP_SUCCESS and it should call confirmSignup once for a successful request', (done) => {
        let user = { id: 27 };
        let api = {
          user: {
            confirmSignUp: sinon.stub().callsArgWith(1, null)
          }
        };

        let expectedActions = [
          { type: 'CONFIRM_SIGNUP_REQUEST' },
          { type: 'CONFIRM_SIGNUP_SUCCESS' }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.confirmSignup(api, 'fakeSignupKey'));

        expect(api.user.confirmSignup.calledWith('fakeSignupKey').callCount).to.equal(1);
      });

      it('should trigger CONFIRM_SIGNUP_FAILURE and it should call confirmSignup once for a failed request', (done) => {
        let user = { id: 27 };
        let api = {
          user: {
            confirmSignUp: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'})
          }
        };

        let err = new Error(ErrorMessages.ERR_CONFIRMING_SIGNUP);
        err.status = 500;

        let expectedActions = [
          { type: 'CONFIRM_SIGNUP_REQUEST' },
          { type: 'CONFIRM_SIGNUP_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.confirmSignup(api, 'fakeSignupKey'));

        expect(api.user.confirmSignup.calledWith('fakeSignupKey').callCount).to.equal(1);
      });
    });

    describe('resendEmailVerification', () => {
      it('should trigger RESEND_EMAIL_VERIFICATION_SUCCESS and it should call resendEmailVerification once for a successful request', (done) => {
        const email = 'foo@bar.com';
        let api = {
          user: {
            resendEmailVerification: sinon.stub().callsArgWith(1, null)
          }
        };

        let expectedActions = [
          { type: 'RESEND_EMAIL_VERIFICATION_REQUEST' },
          { type: 'RESEND_EMAIL_VERIFICATION_SUCCESS', payload: {notification: {type: 'alert', message: 'We just sent you an e-mail.'}} }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.resendEmailVerification(api, email));

        expect(api.user.resendEmailVerification.calledWith(email).callCount).to.equal(1);
      });

      it('should trigger RESEND_EMAIL_VERIFICATION_FAILURE and it should call resendEmailVerification once for a failed request', (done) => {
        const email = 'foo@bar.com';
        let api = {
          user: {
            resendEmailVerification: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'})
          }
        };

        let err = new Error(ErrorMessages.ERR_RESENDING_EMAIL_VERIFICATION);
        err.status = 500;

        let expectedActions = [
          { type: 'RESEND_EMAIL_VERIFICATION_REQUEST' },
          { type: 'RESEND_EMAIL_VERIFICATION_FAILURE', error: err, meta: {apiError: {status: 500, body: 'Error!'}} }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.resendEmailVerification(api, email));

        expect(api.user.resendEmailVerification.calledWith(email).callCount).to.equal(1);
      });
    });

    describe('acceptTerms', () => {
      it('should trigger ACCEPT_TERMS_SUCCESS and it should call acceptTerms once for a successful request', (done) => {
        let acceptedDate = new Date();
        let loggedInUserId = 500;
        let termsData = { termsAccepted: new Date() };
        let api = {
          user: {
            acceptTerms: sinon.stub().callsArgWith(1, null)
          }
        };

        let expectedActions = [
          { type: 'ACCEPT_TERMS_REQUEST' },
          { type: 'ACCEPT_TERMS_SUCCESS', payload: { userId: loggedInUserId, acceptedDate: acceptedDate } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let initialStateForTest = _.merge({}, initialState, { blip: { loggedInUserId: loggedInUserId } });

        let store = mockStore(initialStateForTest, expectedActions, done);

        store.dispatch(async.acceptTerms(api, acceptedDate));

        expect(api.user.acceptTerms.calledWith(termsData).callCount).to.equal(1);
      });

      it('should trigger ACCEPT_TERMS_FAILURE and it should call acceptTerms once for a failed request', (done) => {
        let termsData = { termsAccepted: new Date() };
        let loggedInUserId = 500;
        let api = {
          user: {
            acceptTerms: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'})
          }
        };

        let err = new Error(ErrorMessages.ERR_ACCEPTING_TERMS);
        err.status = 500;

        let expectedActions = [
          { type: 'ACCEPT_TERMS_REQUEST' },
          { type: 'ACCEPT_TERMS_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let initialStateForTest = _.merge({}, initialState, { blip: { loggedInUserId: loggedInUserId } });

        let store = mockStore(initialStateForTest, expectedActions, done);

        store.dispatch(async.acceptTerms(api, termsData));

        expect(api.user.acceptTerms.calledWith(termsData).callCount).to.equal(1);
      });
    });

    describe('login', () => {
      it('should trigger LOGIN_SUCCESS and it should call login and user.get once for a successful request', (done) => {
        let creds = { username: 'bruce', password: 'wayne' };
        let user = { id: 27 };
        let api = {
          user: {
            login: sinon.stub().callsArgWith(2, null),
            get: sinon.stub().callsArgWith(0, null, user)
          }
        };

        let expectedActions = [
          { type: 'LOGIN_REQUEST' },
          { type: 'LOGIN_SUCCESS', payload: { user: user } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.login(api, creds));

        expect(api.user.login.calledWith(creds).callCount).to.equal(1);
        expect(api.user.get.callCount).to.equal(1);
      });

      it('should trigger LOGIN_SUCCESS and it should call login, user.get and patient.get once for a successful request', (done) => {
        let creds = { username: 'bruce', password: 'wayne' };
        let user = { id: 27, profile: { patient: true } };
        let patient = { foo: 'bar' };

        let api = {
          user: {
            login: sinon.stub().callsArgWith(2, null),
            get: sinon.stub().callsArgWith(0, null, user)
          },
          patient: {
            get: sinon.stub().callsArgWith(1, null, patient)
          }
        };

        let expectedActions = [
          { type: 'LOGIN_REQUEST' },
          { type: 'LOGIN_SUCCESS', payload: { user: _.merge({}, user, patient) } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.login(api, creds));

        expect(api.user.login.calledWith(creds).callCount).to.equal(1);
        expect(api.user.get.callCount).to.equal(1);
        expect(api.patient.get.callCount).to.equal(1);
      });

      it('[400] should trigger LOGIN_FAILURE and it should call login once and user.get zero times for a failed login request', (done) => {
        let creds = { username: 'bruce', password: 'wayne' };
        let user = { id: 27 };
        let api = {
          user: {
            login: sinon.stub().callsArgWith(2, {status: 400, body: 'Error!'}),
            get: sinon.stub()
          }
        };

        let err = new Error(ErrorMessages.ERR_LOGIN);
        err.status = 400;

        let expectedActions = [
          { type: 'LOGIN_REQUEST' },
          { type: 'LOGIN_FAILURE', error: err, payload: null, meta: { apiError: {status: 400, body: 'Error!'}}}
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.login(api, creds));

        expect(api.user.login.calledWith(creds).callCount).to.equal(1);
        expect(api.user.get.callCount).to.equal(0);
      });

      it('[401] should trigger LOGIN_FAILURE and it should call login once and user.get zero times for a failed login because of wrong password request', (done) => {
        let creds = { username: 'bruce', password: 'wayne' };
        let user = { id: 27 };
        let api = {
          user: {
            login: sinon.stub().callsArgWith(2, {status: 401, body: 'Wrong password!'}),
            get: sinon.stub()
          }
        };

        let err = new Error(ErrorMessages.ERR_LOGIN_CREDS);
        err.status = 401;

        let expectedActions = [
          { type: 'LOGIN_REQUEST' },
          { type: 'LOGIN_FAILURE', error: err, payload: null, meta: { apiError: {status: 401, body: 'Wrong password!'}} }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.login(api, creds));

        expect(api.user.login.calledWith(creds).callCount).to.equal(1);
        expect(api.user.get.callCount).to.equal(0);
      });

      it('[403] should trigger LOGIN_FAILURE and it should call login once and user.get zero times for a failed login because of unverified e-mail', (done) => {
        let creds = { username: 'bruce', password: 'wayne' };
        let user = { id: 27 };
        let api = {
          user: {
            login: sinon.stub().callsArgWith(2, {status: 403, body: 'E-mail not verified!'}),
            get: sinon.stub()
          }
        };

        let err = null;
        let payload = {isLoggedIn: false, emailVerificationSent: false};

        let expectedActions = [
          { type: 'LOGIN_REQUEST' },
          { type: 'LOGIN_FAILURE', error: err, payload: payload, meta: { apiError: {status: 403, body: 'E-mail not verified!'}} }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.login(api, creds));

        expect(api.user.login.calledWith(creds).callCount).to.equal(1);
        expect(api.user.get.callCount).to.equal(0);
      });

      it('[500 on user fetch] should trigger LOGIN_FAILURE and it should call login and user.get once for a failed user.get request', (done) => {
        let creds = { username: 'bruce', password: 'wayne' };
        let user = { id: 27 };
        let api = {
          user: {
            login: sinon.stub().callsArgWith(2, null),
            get: sinon.stub().callsArgWith(0, {status: 500, body: 'Error!'})
          }
        };

        let err = new Error(ErrorMessages.ERR_FETCHING_USER);
        err.status = 500;

        let expectedActions = [
          { type: 'LOGIN_REQUEST' },
          { type: 'LOGIN_FAILURE', error: err, payload: null, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.login(api, creds));

        expect(api.user.login.calledWith(creds).callCount).to.equal(1);
        expect(api.user.get.callCount).to.equal(1);
      });

      it('[500 on patient fetch] should trigger LOGIN_FAILURE and it should call login, user.get, and patient.get once for a failed patient.get request', (done) => {
        let creds = { username: 'bruce', password: 'wayne' };
        let user = { id: 27, profile: { patient: true} };
        let api = {
          patient: {
            get: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'})
          },
          user: {
            login: sinon.stub().callsArgWith(2, null),
            get: sinon.stub().callsArgWith(0, null, user)
          }
        };

        let err = new Error(ErrorMessages.ERR_FETCHING_PATIENT);
        err.status = 500;

        let expectedActions = [
          { type: 'LOGIN_REQUEST' },
          { type: 'LOGIN_FAILURE', error: err, payload: null, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.login(api, creds));

        expect(api.user.login.calledWith(creds).callCount).to.equal(1);
        expect(api.user.get.callCount).to.equal(1);
        expect(api.patient.get.callCount).to.equal(1);
      });
    });

    describe('logout', () => {
      it('should trigger LOGOUT_SUCCESS and it should call logout once for a successful request', (done) => {
        let api = {
          user: {
            logout: sinon.stub().callsArgWith(0, null)
          }
        };

        let expectedActions = [
          { type: 'LOGOUT_REQUEST' },
          { type: 'LOGOUT_SUCCESS' },
          { type: '@@router/TRANSITION', payload: { args: [ '/' ], method: 'push' } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.logout(api));

        expect(api.user.logout.callCount).to.equal(1);
      });
    });

    describe('createPatient', () => {
      it('should trigger CREATE_PATIENT_SUCCESS and it should call createPatient once for a successful request', (done) => {
        let loggedInUserId = 500;
        let patient = { id: 27, name: 'Bruce' };
        let api = {
          patient: {
            post: sinon.stub().callsArgWith(1, null, patient)
          }
        };

        let expectedActions = [
          { type: 'CREATE_PATIENT_REQUEST' },
          { type: 'CREATE_PATIENT_SUCCESS', payload: { userId: loggedInUserId, patient: patient } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let initialStateForTest = _.merge({}, initialState, { blip: { loggedInUserId: loggedInUserId } });

        let store = mockStore(initialStateForTest, expectedActions, done);

        store.dispatch(async.createPatient(api, patient));

        expect(api.patient.post.calledWith(patient).callCount).to.equal(1);
      });

      it('should trigger CREATE_PATIENT_FAILURE and it should call createPatient once for a failed request', (done) => {
        let loggedInUserId = 500;
        let patient = { id: 27, name: 'Bruce' };
        let api = {
          patient: {
            post: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'})
          }
        };

        let err = new Error(ErrorMessages.ERR_DSA_SETUP);
        err.status = 500;

        let expectedActions = [
          { type: 'CREATE_PATIENT_REQUEST' },
          { type: 'CREATE_PATIENT_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let initialStateForTest = _.merge({}, initialState, { blip: { loggedInUserId: loggedInUserId } });

        let store = mockStore(initialStateForTest, expectedActions, done);

        store.dispatch(async.createPatient(api, patient));

        expect(api.patient.post.calledWith(patient).callCount).to.equal(1);
      });
    });

    describe('removePatient', () => {
      it('should trigger REMOVE_PATIENT_SUCCESS and it should call leaveGroup and patient.getAll once for a successful request', (done) => {
        let patientId = 27;
        let patients = [
          { id: 200 },
          { id: 101 }
        ]
        let api = {
          access: {
            leaveGroup: sinon.stub().callsArgWith(1, null)
          },
          patient: {
            getAll: sinon.stub().callsArgWith(0, null, patients)
          }
        };

        let expectedActions = [
          { type: 'REMOVE_PATIENT_REQUEST' },
          { type: 'REMOVE_PATIENT_SUCCESS', payload: { removedPatientId: patientId } },
          { type: 'FETCH_PATIENTS_REQUEST' },
          { type: 'FETCH_PATIENTS_SUCCESS', payload: { patients: patients } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.removePatient(api, patientId));

        expect(api.access.leaveGroup.calledWith(patientId).callCount).to.equal(1);
        expect(api.patient.getAll.callCount).to.equal(1);
      });

      it('should trigger REMOVE_PATIENT_FAILURE and it should call removePatient once for a failed request', (done) => {
        let patientId = 27;
        let api = {
          access: {
            leaveGroup: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'})
          }
        };

        let err = new Error(ErrorMessages.ERR_REMOVING_MEMBERSHIP);
        err.status = 500;

        let expectedActions = [
          { type: 'REMOVE_PATIENT_REQUEST' },
          { type: 'REMOVE_PATIENT_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.removePatient(api, patientId));

        expect(api.access.leaveGroup.calledWith(patientId).callCount).to.equal(1);
      });
    });

    describe('removeMember', () => {
      it('should trigger REMOVE_MEMBER_SUCCESS and it should call removeMember once for a successful request', (done) => {
        let memberId = 27;
        let patientId = 456;
        let patient = { id: 546, name: 'Frank' };
        let api = {
          access: {
            removeMember: sinon.stub().callsArgWith(1, null)
          },
          patient: {
            get: sinon.stub().callsArgWith(1, null, patient)
          }
        };

        let expectedActions = [
          { type: 'REMOVE_MEMBER_REQUEST' },
          { type: 'REMOVE_MEMBER_SUCCESS', payload: { removedMemberId: memberId } },
          { type: 'FETCH_PATIENT_REQUEST' },
          { type: 'FETCH_PATIENT_SUCCESS', payload: { patient: patient } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.removeMember(api, patientId, memberId));

        expect(api.access.removeMember.calledWith(memberId).callCount).to.equal(1);
        expect(api.patient.get.calledWith(patientId).callCount).to.equal(1);
      });

      it('should trigger REMOVE_MEMBER_FAILURE and it should call removeMember once for a failed request', (done) => {
        let memberId = 27;
        let api = {
          access: {
            removeMember: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'})
          }
        };

        let err = new Error(ErrorMessages.ERR_REMOVING_MEMBER);
        err.status = 500;

        let expectedActions = [
          { type: 'REMOVE_MEMBER_REQUEST' },
          { type: 'REMOVE_MEMBER_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.removeMember(api, memberId));

        expect(api.access.removeMember.calledWith(memberId).callCount).to.equal(1);
      });
    });

    describe('sendInvite', () => {
      it('should trigger SEND_INVITE_SUCCESS and it should call sendInvite once for a successful request', (done) => {
        let email = 'a@b.com';
        let permissions = {
          view: true
        };
        let invite = { foo: 'bar' };
        let api = {
          invitation: {
            send: sinon.stub().callsArgWith(2, null, invite)
          }
        };

        let expectedActions = [
          { type: 'SEND_INVITE_REQUEST' },
          { type: 'SEND_INVITE_SUCCESS', payload: { invite: invite } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.sendInvite(api, email, permissions));

        expect(api.invitation.send.calledWith(email, permissions).callCount).to.equal(1);
      });

      it('should trigger SEND_INVITE_FAILURE when invite has already been sent to the e-mail', (done) => {
        let email = 'a@b.com';
        let permissions = {
          view: true
        };
        let invitation = { foo: 'bar' };
        let api = {
          invitation: {
            send: sinon.stub().callsArgWith(2, {status: 409, body: 'Error!'})
          }
        };

        let err = new Error(ErrorMessages.ERR_ALREADY_SENT_TO_EMAIL);
        err.status = 409;

        let expectedActions = [
          { type: 'SEND_INVITE_REQUEST' },
          { type: 'SEND_INVITE_FAILURE', error: err, meta: { apiError: {status: 409, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.sendInvite(api, email, permissions));

        expect(api.invitation.send.calledWith(email, permissions).callCount).to.equal(1);
      });

      it('should trigger SEND_INVITE_FAILURE and it should call sendInvite once for a failed request', (done) => {
        let email = 'a@b.com';
        let permissions = {
          view: true
        };
        let invitation = { foo: 'bar' };
        let api = {
          invitation: {
            send: sinon.stub().callsArgWith(2, {status: 500, body: 'Error!'})
          }
        };

        let err = new Error(ErrorMessages.ERR_SENDING_INVITE);
        err.status = 500;

        let expectedActions = [
          { type: 'SEND_INVITE_REQUEST' },
          { type: 'SEND_INVITE_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.sendInvite(api, email, permissions));

        expect(api.invitation.send.calledWith(email, permissions).callCount).to.equal(1);
      });
    });

    describe('cancelSentInvite', () => {
      it('should trigger CANCEL_SENT_INVITE_SUCCESS and it should call cancelSentInvite once for a successful request', (done) => {
        let email = 'a@b.com';
        let api = {
          invitation: {
            cancel: sinon.stub().callsArgWith(1, null)
          }
        };

        let expectedActions = [
          { type: 'CANCEL_SENT_INVITE_REQUEST' },
          { type: 'CANCEL_SENT_INVITE_SUCCESS', payload: { removedEmail: email } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.cancelSentInvite(api, email));

        expect(api.invitation.cancel.calledWith(email).callCount).to.equal(1);
      });

      it('should trigger CANCEL_SENT_INVITE_FAILURE and it should call cancelSentInvite once for a failed request', (done) => {
        let email = 'a@b.com';
        let api = {
          invitation: {
            cancel: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'})
          }
        };

        let err = new Error(ErrorMessages.ERR_CANCELLING_INVITE);
        err.status = 500;

        let expectedActions = [
          { type: 'CANCEL_SENT_INVITE_REQUEST' },
          { type: 'CANCEL_SENT_INVITE_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.cancelSentInvite(api, email));

        expect(api.invitation.cancel.calledWith(email).callCount).to.equal(1);
      });
    });

    describe('acceptReceivedInvite', () => {
      it('should trigger ACCEPT_RECEIVED_INVITE_SUCCESS and it should call acceptReceivedInvite once for a successful request', (done) => {
        let invitation = { key: 'foo', creator: { userid: 500 } };
        let patient = { id: 500, name: 'Buddy Holly', age: 65 };

        let api = {
          invitation: {
            accept: sinon.stub().callsArgWith(2, null, invitation)
          },
          patient: {
            get: sinon.stub().callsArgWith(1, null, patient)
          }
        };

        let expectedActions = [
          { type: 'ACCEPT_RECEIVED_INVITE_REQUEST', payload: { acceptedReceivedInvite: invitation } },
          { type: 'ACCEPT_RECEIVED_INVITE_SUCCESS', payload: { acceptedReceivedInvite: invitation } },
          { type: 'FETCH_PATIENT_REQUEST' },
          { type: 'FETCH_PATIENT_SUCCESS', payload: { patient : patient } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.acceptReceivedInvite(api, invitation));

        expect(api.invitation.accept.calledWith(invitation.key, invitation.creator.userid).callCount).to.equal(1);
        expect(api.patient.get.calledWith(invitation.creator.userid).callCount).to.equal(1);
      });

      it('should trigger ACCEPT_RECEIVED_INVITE_FAILURE and it should call acceptReceivedInvite once for a failed request', (done) => {
        let invitation = { key: 'foo', creator: { id: 500 } };
        let api = {
          invitation: {
            accept: sinon.stub().callsArgWith(2, {status: 500, body: 'Error!'})
          }
        };

        let err = new Error(ErrorMessages.ERR_ACCEPTING_INVITE);
        err.status = 500;

        let expectedActions = [
          { type: 'ACCEPT_RECEIVED_INVITE_REQUEST', payload: { acceptedReceivedInvite: invitation } },
          { type: 'ACCEPT_RECEIVED_INVITE_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.acceptReceivedInvite(api, invitation));

        expect(api.invitation.accept.calledWith(invitation.key, invitation.creator.userid).callCount).to.equal(1);
      });
    });

    describe('rejectReceivedInvite', () => {
      it('should trigger REJECT_RECEIVED_INVITE_SUCCESS and it should call rejectReceivedInvite once for a successful request', (done) => {
        let invitation = { key: 'foo', creator: { userid: 500 } };
        let api = {
          invitation: {
            dismiss: sinon.stub().callsArgWith(2, null, invitation)
          }
        };

        let expectedActions = [
          { type: 'REJECT_RECEIVED_INVITE_REQUEST', payload: { rejectedReceivedInvite: invitation } },
          { type: 'REJECT_RECEIVED_INVITE_SUCCESS', payload: { rejectedReceivedInvite: invitation } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.rejectReceivedInvite(api, invitation));

        expect(api.invitation.dismiss.calledWith(invitation.key, invitation.creator.userid).callCount).to.equal(1);
      });

      it('should trigger REJECT_RECEIVED_INVITE_FAILURE and it should call rejectReceivedInvite once for a failed request', (done) => {
        let invitation = { key: 'foo', creator: { id: 500 } };
        let api = {
          invitation: {
            dismiss: sinon.stub().callsArgWith(2, {status: 500, body: 'Error!'})
          }
        };

        let err = new Error(ErrorMessages.ERR_REJECTING_INVITE);
        err.status = 500;

        let expectedActions = [
          { type: 'REJECT_RECEIVED_INVITE_REQUEST', payload: { rejectedReceivedInvite: invitation } },
          { type: 'REJECT_RECEIVED_INVITE_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.rejectReceivedInvite(api, invitation));

        expect(api.invitation.dismiss.calledWith(invitation.key, invitation.creator.userid).callCount).to.equal(1);
      });
    });

    describe('setMemberPermissions', () => {
      it('should trigger SET_MEMBER_PERMISSIONS_SUCCESS and it should call setMemberPermissions once for a successful request', (done) => {
        let patientId = 50;
        let patient = { id: 50, name: 'Jeanette Peach' };
        let memberId = 2;
        let permissions = {
          read: false
        };
        let api = {
          access: {
            setMemberPermissions: sinon.stub().callsArgWith(2, null)
          },
          patient: {
            get: sinon.stub().callsArgWith(1, null, patient)
          }
        };

        let expectedActions = [
          { type: 'SET_MEMBER_PERMISSIONS_REQUEST' },
          { type: 'SET_MEMBER_PERMISSIONS_SUCCESS', payload: {
              memberId: memberId,
              permissions: permissions
            } 
          },
          { type: 'FETCH_PATIENT_REQUEST' },
          { type: 'FETCH_PATIENT_SUCCESS', payload: { patient: patient } },
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.setMemberPermissions(api, patientId, memberId, permissions));

        expect(api.access.setMemberPermissions.calledWith(memberId, permissions).callCount).to.equal(1);
        expect(api.patient.get.calledWith(patientId).callCount).to.equal(1);
      });

      it('should trigger SET_MEMBER_PERMISSIONS_FAILURE and it should call setMemberPermissions once for a failed request', (done) => {
        let patientId = 50;
        let memberId = 2;
        let permissions = {
          read: false
        };
        let api = {
          access: {
            setMemberPermissions: sinon.stub().callsArgWith(2, {status: 500, body: 'Error!'})
          }
        };

        let err = new Error(ErrorMessages.ERR_CHANGING_PERMS);
        err.status = 500;

        let expectedActions = [
          { type: 'SET_MEMBER_PERMISSIONS_REQUEST' },
          { type: 'SET_MEMBER_PERMISSIONS_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.setMemberPermissions(api, patientId, memberId, permissions));

        expect(api.access.setMemberPermissions.calledWith(memberId, permissions).callCount).to.equal(1);
      });
    });

    describe('updatePatient', () => {
      it('should trigger UPDATE_PATIENT_SUCCESS and it should call updatePatient once for a successful request', (done) => {
        let patient = { name: 'Bruce' };
        let api = {
          patient: {
            put: sinon.stub().callsArgWith(1, null, patient)
          }
        };

        let expectedActions = [
          { type: 'UPDATE_PATIENT_REQUEST' },
          { type: 'UPDATE_PATIENT_SUCCESS', payload: { updatedPatient: patient } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.updatePatient(api, patient));

        expect(api.access.updatePatient.calledWith(patient).callCount).to.equal(1);
      });

      it('should trigger UPDATE_PATIENT_FAILURE and it should call updatePatient once for a failed request', (done) => {
        let patient = { name: 'Bruce' };
        let api = {
          patient: {
            put: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'})
          }
        };

        let err = new Error(ErrorMessages.ERR_UPDATING_PATIENT);
        err.status = 500;

        let expectedActions = [
          { type: 'UPDATE_PATIENT_REQUEST' },
          { type: 'UPDATE_PATIENT_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.updatePatient(api, patient));

        expect(api.access.updatePatient.calledWith(patient).callCount).to.equal(1);
      });
    });

    describe('updateUser', () => {
      it('should trigger UPDATE_USER_SUCCESS and it should call updateUser once for a successful request', (done) => {
        let loggedInUserId = 400;
        let currentUser = { 
          profile: { 
            name: 'Joe Bloggs', 
            age: 29
          }, 
          password: 'foo',
          emails: [
            'joe@bloggs.com'
          ],
          username: 'Joe'
        };

        let formValues = { 
          profile: { 
            name: 'Joe Steven Bloggs', 
            age: 30
          }, 
        };

        let updatingUser = {
          profile: { 
            name: 'Joe Steven Bloggs', 
            age: 30
          }, 
          emails: [
            'joe@bloggs.com'
          ],
          username: 'Joe'
        };

        let userUpdates = {
          profile: { 
            name: 'Joe Steven Bloggs', 
            age: 30
          }
        };

        let updatedUser = {
          profile: { 
            name: 'Joe Steven Bloggs', 
            age: 30
          }, 
          emails: [
            'joe@bloggs.com'
          ],
          username: 'Joe',
          password: 'foo'
        };

        let api = {
          user: {
            put: sinon.stub().callsArgWith(1, null, updatedUser)
          }
        };

        let initialStateForTest = _.merge({}, initialState, { allUsersMap: { [loggedInUserId] : currentUser }, loggedInUserId: loggedInUserId });

        let expectedActions = [
          { type: 'UPDATE_USER_REQUEST', payload: { userId: loggedInUserId, updatingUser: updatingUser} },
          { type: 'UPDATE_USER_SUCCESS', payload: { userId: loggedInUserId, updatedUser: updatedUser } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip : initialStateForTest }, expectedActions, done);

        store.dispatch(async.updateUser(api, formValues));

        expect(api.access.updateUser.calledWith(userUpdates).callCount).to.equal(1);
      });

      it('should trigger UPDATE_USER_FAILURE and it should call updateUser once for a failed request', (done) => {
        let loggedInUserId = 400;
        let currentUser = { 
          profile: { 
            name: 'Joe Bloggs', 
            age: 29
          }, 
          password: 'foo',
          emails: [
            'joe@bloggs.com'
          ],
          username: 'Joe'
        };

        let formValues = { 
          profile: { 
            name: 'Joe Steven Bloggs', 
            age: 30
          }, 
        };

        let updatingUser = {
          profile: { 
            name: 'Joe Steven Bloggs', 
            age: 30
          }, 
          emails: [
            'joe@bloggs.com'
          ],
          username: 'Joe'
        };

        let userUpdates = {
          profile: { 
            name: 'Joe Steven Bloggs', 
            age: 30
          }
        };
        let api = {
          user: {
            put: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'})
          }
        };

        let err = new Error(ErrorMessages.ERR_UPDATING_USER);
        err.status = 500;

        let initialStateForTest = _.merge({}, initialState, { allUsersMap: { [loggedInUserId] : currentUser }, loggedInUserId: loggedInUserId });

        let expectedActions = [
          { type: 'UPDATE_USER_REQUEST', payload: { userId: loggedInUserId, updatingUser: updatingUser} },
          { type: 'UPDATE_USER_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'}} }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip : initialStateForTest }, expectedActions, done);

        store.dispatch(async.updateUser(api, formValues));

        expect(api.access.updateUser.calledWith(userUpdates).callCount).to.equal(1);
      });
    });

    describe('requestPasswordReset', () => {
      it('should trigger REQUEST_PASSWORD_RESET_SUCCESS and it should call requestPasswordReset once for a successful request', (done) => {
        const email = 'foo@bar.com';
        let api = {
          user: {
            requestPasswordReset: sinon.stub().callsArgWith(1, null)
          }
        };

        let expectedActions = [
          { type: 'REQUEST_PASSWORD_RESET_REQUEST' },
          { type: 'REQUEST_PASSWORD_RESET_SUCCESS' }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.requestPasswordReset(api, email));

        expect(api.user.requestPasswordReset.calledWith(email).callCount).to.equal(1);
      });

      it('should trigger REQUEST_PASSWORD_RESET_FAILURE and it should call requestPasswordReset once for a failed request', (done) => {
        const email = 'foo@bar.com';
        let api = {
          user: {
            requestPasswordReset: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'})
          }
        };

        let err = new Error(ErrorMessages.ERR_REQUESTING_PASSWORD_RESET);
        err.status = 500;

        let expectedActions = [
          { type: 'REQUEST_PASSWORD_RESET_REQUEST' },
          { type: 'REQUEST_PASSWORD_RESET_FAILURE', error: err, meta: {apiError: {status: 500, body: 'Error!'}} }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.requestPasswordReset(api, email));

        expect(api.user.requestPasswordReset.calledWith(email).callCount).to.equal(1);
      });
    });

    describe('confirmPasswordReset', () => {
      it('should trigger CONFIRM_PASSWORD_RESET_SUCCESS and it should call confirmPasswordReset once for a successful requestPasswordReset', (done) => {
        const payload = {};
        let api = {
          user: {
            confirmPasswordReset: sinon.stub().callsArgWith(1, null)
          }
        };

        let expectedActions = [
          { type: 'CONFIRM_PASSWORD_RESET_REQUEST' },
          { type: 'CONFIRM_PASSWORD_RESET_SUCCESS' }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.confirmPasswordReset(api, payload));

        expect(api.user.confirmPasswordReset.calledWith(payload).callCount).to.equal(1);
      });

      it('should trigger CONFIRM_PASSWORD_RESET_FAILURE and it should call confirmPasswordReset once for a failed requestPasswordReset', (done) => {
        const payload = {};
        let api = {
          user: {
            confirmPasswordReset: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'})
          }
        };

        let err = new Error(ErrorMessages.ERR_CONFIRMING_PASSWORD_RESET);
        err.status = 500;

        let expectedActions = [
          { type: 'CONFIRM_PASSWORD_RESET_REQUEST' },
          { type: 'CONFIRM_PASSWORD_RESET_FAILURE', error: err, meta: {apiError: {status: 500, body: 'Error!'}} }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.confirmPasswordReset(api, payload));

        expect(api.user.confirmPasswordReset.calledWith(payload).callCount).to.equal(1);
      });
    });

    describe('logError', () => {
      it('should trigger LOG_ERROR_SUCCESS and it should call error once for a successful request', (done) => {
        let error = 'Error';
        let message = 'Some random detailed error message!';
        let props = { 
          stacktrace: true
        };

        let api = {
          errors: {
            log: sinon.stub().callsArgWith(3, null)
          }

        };

        let expectedActions = [
          { type: 'LOG_ERROR_REQUEST' },
          { type: 'LOG_ERROR_SUCCESS' }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.logError(api, error, message, props));

        expect(api.errors.log.withArgs(error, message, props).callCount).to.equal(1);
      });
    });

    describe('fetchUser', () => {
      it('should trigger FETCH_USER_SUCCESS and it should call get once for a successful request', (done) => {
        let user = { emailVerified: true, username: 'frankie@gmaz.com', id: 306, name: 'Frankie Boyle' };

        let api = {
          user: {
            get: sinon.stub().callsArgWith(0, null, user)
          }
        };

        let expectedActions = [
          { type: 'FETCH_USER_REQUEST' },
          { type: 'FETCH_USER_SUCCESS', payload: { user : user } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.fetchUser(api));

        expect(api.user.get.callCount).to.equal(1);
      });

      it('should trigger FETCH_USER_SUCCESS and it should call user.get and patient.get once for a successful request', (done) => {
        let user = { emailVerified: true, username: 'frankie@gmaz.com', id: 306, name: 'Frankie Boyle', profile: { patient: true } };
        let patient = { foo: 'bar' };
        let api = {
          user: {
            get: sinon.stub().callsArgWith(0, null, user)
          },
          patient: {
            get: sinon.stub().callsArgWith(1, null, patient)
          }
        };

        let expectedActions = [
          { type: 'FETCH_USER_REQUEST' },
          { type: 'FETCH_USER_SUCCESS', payload: { user : _.merge({}, user, patient) } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.fetchUser(api));

        expect(api.user.get.callCount).to.equal(1);
        expect(api.patient.get.callCount).to.equal(1);
      });

      it('should trigger FETCH_USER_FAILURE and it should call error once for a request for user that has not verified email', (done) => {
        let user = { emailVerified: false, username: 'frankie@gmaz.com', id: 306, name: 'Frankie Boyle' };

        let api = {
          user: {
            get: sinon.stub().callsArgWith(0, null, user)
          }
        };

        let expectedActions = [
          { type: 'FETCH_USER_REQUEST' },
          { type: 'FETCH_USER_FAILURE', error: new Error(ErrorMessages.ERR_EMAIL_NOT_VERIFIED), meta: { apiError: null } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.fetchUser(api));

        expect(api.user.get.callCount).to.equal(1);
      });


      it('[401] should trigger FETCH_USER_FAILURE and it should call error once for a failed request', (done) => {
        let user = { id: 306, name: 'Frankie Boyle' };

        let api = {
          user: {
            get: sinon.stub().callsArgWith(0, { status: 401 }, null)
          }
        };

        let expectedActions = [
          { type: 'FETCH_USER_REQUEST' },
          { type: 'FETCH_USER_FAILURE', error: null, meta: { apiError: { status: 401 } } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.fetchUser(api));

        expect(api.user.get.callCount).to.equal(1);
      });

      it('[500] should trigger FETCH_USER_FAILURE and it should call error once for a failed request', (done) => {
        let user = { id: 306, name: 'Frankie Boyle' };

        let api = {
          user: {
            get: sinon.stub().callsArgWith(0, {status: 500, body: 'Error!'}, null)
          }
        };

        let err = new Error(ErrorMessages.ERR_FETCHING_USER);
        err.status = 500;

        let expectedActions = [
          { type: 'FETCH_USER_REQUEST' },
          { type: 'FETCH_USER_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.fetchUser(api));

        expect(api.user.get.callCount).to.equal(1);
      });
    });

    describe('fetchPendingSentInvites', () => {
      it('should trigger FETCH_PENDING_SENT_INVITES_SUCCESS and it should call error once for a successful request', (done) => {
        let pendingSentInvites = [ 1, 555, 78191 ];

        let api = {
          invitation: {
            getSent: sinon.stub().callsArgWith(0, null, pendingSentInvites)
          }
        };

        let expectedActions = [
          { type: 'FETCH_PENDING_SENT_INVITES_REQUEST' },
          { type: 'FETCH_PENDING_SENT_INVITES_SUCCESS', payload: { pendingSentInvites : pendingSentInvites } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.fetchPendingSentInvites(api));

        expect(api.invitation.getSent.callCount).to.equal(1);
      });

      it('should trigger FETCH_PENDING_SENT_INVITES_FAILURE and it should call error once for a failed request', (done) => {
        let pendingSentInvites = [ 1, 555, 78191 ];

        let api = {
          invitation: {
            getSent: sinon.stub().callsArgWith(0, {status: 500, body: 'Error!'}, null)
          }
        };

        let err = new Error(ErrorMessages.ERR_FETCHING_PENDING_SENT_INVITES);
        err.status = 500;

        let expectedActions = [
          { type: 'FETCH_PENDING_SENT_INVITES_REQUEST' },
          { type: 'FETCH_PENDING_SENT_INVITES_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.fetchPendingSentInvites(api));

        expect(api.invitation.getSent.callCount).to.equal(1);
      });
    });

    describe('fetchPendingReceivedInvites', () => {
      it('should trigger FETCH_PENDING_RECEIVED_INVITES_SUCCESS and it should call error once for a successful request', (done) => {
        let pendingReceivedInvites = [ 1, 555, 78191 ];

        let api = {
          invitation: {
            getReceived: sinon.stub().callsArgWith(0, null, pendingReceivedInvites)
          }
        };

        let expectedActions = [
          { type: 'FETCH_PENDING_RECEIVED_INVITES_REQUEST' },
          { type: 'FETCH_PENDING_RECEIVED_INVITES_SUCCESS', payload: { pendingReceivedInvites : pendingReceivedInvites } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.fetchPendingReceivedInvites(api));

        expect(api.invitation.getReceived.callCount).to.equal(1);
      });

      it('should trigger FETCH_PENDING_RECEIVED_INVITES_FAILURE and it should call error once for a failed request', (done) => {
        let pendingReceivedInvites = [ 1, 555, 78191 ];

        let api = {
          invitation: {
            getReceived: sinon.stub().callsArgWith(0, {status: 500, body: 'Error!'}, null)
          }
        };

        let err = new Error(ErrorMessages.ERR_FETCHING_PENDING_RECEIVED_INVITES);
        err.status = 500;

        let expectedActions = [
          { type: 'FETCH_PENDING_RECEIVED_INVITES_REQUEST' },
          { type: 'FETCH_PENDING_RECEIVED_INVITES_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.fetchPendingReceivedInvites(api));

        expect(api.invitation.getReceived.callCount).to.equal(1);
      });
    });

    describe('fetchPatient', () => {
      it('should trigger FETCH_PATIENT_SUCCESS and it should call error once for a successful request', (done) => {
        let patient = { id: 58686, name: 'Buddy Holly', age: 65 };

        let api = {
          patient: {
            get: sinon.stub().callsArgWith(1, null, patient)
          }
        };

        let expectedActions = [
          { type: 'FETCH_PATIENT_REQUEST' },
          { type: 'FETCH_PATIENT_SUCCESS', payload: { patient : patient } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState }, expectedActions, done);

        store.dispatch(async.fetchPatient(api, 58686));

        expect(api.patient.get.withArgs(58686).callCount).to.equal(1);
      });

      it('[500] should trigger FETCH_PATIENT_FAILURE and it should call error once for a failed request', (done) => {
        let patient = { id: 58686, name: 'Buddy Holly', age: 65 };

        let api = {
          patient: {
            get: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'}, null)
          }
        };

        let err = new Error(ErrorMessages.ERR_FETCHING_MESSAGE_THREAD);
        err.status = 500;

        let expectedActions = [
          { type: 'FETCH_PATIENT_REQUEST' },
          { type: 'FETCH_PATIENT_FAILURE', error: err, payload: {link: null}, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState }, expectedActions, done);

        store.dispatch(async.fetchPatient(api, 58686));

        expect(api.patient.get.withArgs(58686).callCount).to.equal(1);
      });

      it('[404] should trigger FETCH_PATIENT_FAILURE and it should call error once for a failed request', (done) => {
        let patient = { id: 58686, name: 'Buddy Holly', age: 65 };
        let thisInitialState = Object.assign(initialState, {loggedInUserId: 58686});

        let api = {
          patient: {
            get: sinon.stub().callsArgWith(1, {status: 404, body: 'Error!'}, null)
          }
        };

        let err = new Error(ErrorMessages.ERR_YOUR_ACCOUNT_NOT_CONFIGURED);
        err.status = 404;

        let expectedActions = [
          { type: 'FETCH_PATIENT_REQUEST' },
          { type: 'FETCH_PATIENT_FAILURE', error: err, payload: {link: {to: '/patients/new', text: UserMessages.YOUR_ACCOUNT_DATA_SETUP}}, meta: { apiError: {status: 404, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: thisInitialState }, expectedActions, done);

        store.dispatch(async.fetchPatient(api, 58686));

        expect(api.patient.get.withArgs(58686).callCount).to.equal(1);
      });
    });

    describe('fetchPatients', () => {
      it('should trigger FETCH_PATIENTS_SUCCESS and it should call error once for a successful request', (done) => {
        let patients = [
          { id: 58686, name: 'Buddy Holly', age: 65 }
        ]

        let api = {
          patient: {
            getAll: sinon.stub().callsArgWith(0, null, patients)
          }
        };

        let expectedActions = [
          { type: 'FETCH_PATIENTS_REQUEST' },
          { type: 'FETCH_PATIENTS_SUCCESS', payload: { patients : patients } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.fetchPatients(api));

        expect(api.patient.getAll.callCount).to.equal(1);
      });

      it('should trigger FETCH_PATIENTS_FAILURE and it should call error once for a failed request', (done) => {
        let patients = [
          { id: 58686, name: 'Buddy Holly', age: 65 }
        ]

        let api = {
          patient: {
            getAll: sinon.stub().callsArgWith(0, {status: 500, body: {status: 500, body: 'Error!'}}, null)
          }
        };

        let err = new Error(ErrorMessages.ERR_FETCHING_MESSAGE_THREAD);
        err.status = 500;

        let expectedActions = [
          { type: 'FETCH_PATIENTS_REQUEST' },
          { type: 'FETCH_PATIENTS_FAILURE', error: err, meta: { apiError: {status: 500, body: {status: 500, body: 'Error!'}} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.fetchPatients(api));

        expect(api.patient.getAll.callCount).to.equal(1);
      });
    });

    describe('fetchPatientData', () => {
      it('should trigger FETCH_PATIENT_DATA_SUCCESS and it should call error once for a successful request', (done) => {
        async.__Rewire__('utils', {
          processPatientData: sinon.stub().returnsArg(0)
        });

        let patientId = 300;

        let patientData = [
          { id: 25, value: 540.4 }
        ];

        let teamNotes = [
          { id: 25, note: 'foo' }
        ];

        let api = {
          patientData: {
            get: sinon.stub().callsArgWith(1, null, patientData),
          },
          team: {
            getNotes: sinon.stub().callsArgWith(1, null, teamNotes)
          }
        };

        let expectedActions = [
          { type: 'FETCH_PATIENT_DATA_REQUEST' },
          { type: 'FETCH_PATIENT_DATA_SUCCESS', payload: { patientData : patientData, patientNotes: teamNotes, patientId: patientId } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState }, expectedActions, done);

        store.dispatch(async.fetchPatientData(api, patientId));

        expect(api.patientData.get.withArgs(patientId).callCount).to.equal(1);
        expect(api.team.getNotes.withArgs(patientId).callCount).to.equal(1);
      });

      it('should trigger FETCH_PATIENT_DATA_FAILURE and it should call error once for a failed request due to patient data call returning error', (done) => {
        async.__Rewire__('utils', {
          processPatientData: sinon.stub()
        });

        let patientId = 400;

        let patientData = [
          { id: 25, value: 540.4 }
        ];

        let teamNotes = [
          { id: 25, note: 'foo' }
        ];

        let api = {
          patientData: {
            get: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'}, null),
          },
          team: {
            getNotes: sinon.stub().callsArgWith(1, null, teamNotes)
          }
        };

        let err = new Error(ErrorMessages.ERR_FETCHING_MESSAGE_THREAD);
        err.status = 500;

        let expectedActions = [
          { type: 'FETCH_PATIENT_DATA_REQUEST' },
          { type: 'FETCH_PATIENT_DATA_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState }, expectedActions, done);

        store.dispatch(async.fetchPatientData(api, patientId));

        expect(api.patientData.get.withArgs(patientId).callCount).to.equal(1);
        expect(api.team.getNotes.withArgs(patientId).callCount).to.equal(1);
      });


      it('should trigger FETCH_PATIENT_DATA_FAILURE and it should call error once for a failed request due to team notes call returning error', (done) => {
        async.__Rewire__('utils', {
          processPatientData: sinon.stub()
        });

        let patientId = 400;

        let patientData = [
          { id: 25, value: 540.4 }
        ];

        let teamNotes = [
          { id: 25, note: 'foo' }
        ];

        let api = {
          patientData: {
            get: sinon.stub().callsArgWith(1, null, patientData),
          },
          team: {
            getNotes: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'}, null)
          }
        };

        let err = new Error(ErrorMessages.ERR_FETCHING_PATIENT_DATA);
        err.status = 500;

        let expectedActions = [
          { type: 'FETCH_PATIENT_DATA_REQUEST' },
          { type: 'FETCH_PATIENT_DATA_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.fetchPatientData(api, patientId));

        expect(api.patientData.get.withArgs(patientId).callCount).to.equal(1);
        expect(api.team.getNotes.withArgs(patientId).callCount).to.equal(1);
      });
    });

    describe('fetchMessageThread', () => {
      it('should trigger FETCH_MESSAGE_THREAD_SUCCESS and it should call error once for a successful request', (done) => {
        let messageThread = [
          { message: 'Foobar' }
        ]

        let api = {
          team: {
            getMessageThread: sinon.stub().callsArgWith(1, null, messageThread)
          }
        };

        let expectedActions = [
          { type: 'FETCH_MESSAGE_THREAD_REQUEST' },
          { type: 'FETCH_MESSAGE_THREAD_SUCCESS', payload: { messageThread : messageThread } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.fetchMessageThread(api, 300));

        expect(api.team.getMessageThread.withArgs(300).callCount).to.equal(1);
      });

      it('should trigger FETCH_MESSAGE_THREAD_FAILURE and it should call error once for a failed request', (done) => {
        let messageThread = [
          { message: 'Foobar' }
        ]

        let api = {
          team: {
            getMessageThread: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'}, null)
          }
        };

        let err = new Error(ErrorMessages.ERR_FETCHING_MESSAGE_THREAD);
        err.status = 500;

        let expectedActions = [
          { type: 'FETCH_MESSAGE_THREAD_REQUEST' },
          { type: 'FETCH_MESSAGE_THREAD_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore(initialState, expectedActions, done);

        store.dispatch(async.fetchMessageThread(api, 400));

        expect(api.team.getMessageThread.withArgs(400).callCount).to.equal(1);
      });
    });
  });
});