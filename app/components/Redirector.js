// @flow
//
// Copyright (C) 2019 ExtraHash
//
// Please see the included LICENSE file for more information.
import React, { Component } from 'react';
import log from 'electron-log';
import { ipcRenderer } from 'electron';
import { Redirect, withRouter } from 'react-router-dom';
import { session, eventEmitter, loginCounter, config } from '../index';

type State = {
  home: boolean,
  importKey: boolean,
  importSeed: boolean,
  changePassword: boolean,
  firstStartup: boolean,
  loginFailed: boolean,
  login: boolean,
  isLoggedIn: boolean,
  freshRestore: boolean,
  autoLockInterval: number,
  autoLockEnabled: boolean
};

type Location = {
  hash: string,
  pathname: string,
  search: string
};

type Props = {
  location: Location
};

class Redirector extends Component<Props, State> {
  props: Props;

  state: State;

  activityTimer: TimeoutID;

  constructor(props?: Props) {
    super(props);
    this.state = {
      home: false,
      importKey: false,
      importSeed: false,
      changePassword: false,
      firstStartup: session.firstStartup,
      loginFailed: session.loginFailed,
      login: false,
      isLoggedIn: loginCounter.isLoggedIn,
      freshRestore: loginCounter.freshRestore,
      autoLockInterval: config.autoLockInterval,
      autoLockEnabled: config.autoLockEnabled
    };
    const { autoLockInterval, autoLockEnabled } = this.state;
    this.goToImportFromSeed = this.goToImportFromSeed.bind(this);
    this.goToImportFromKey = this.goToImportFromKey.bind(this);
    this.goToPasswordChange = this.goToPasswordChange.bind(this);
    this.goToHome = this.goToHome.bind(this);
    this.goToLogin = this.goToLogin.bind(this);
    this.logOut = this.logOut.bind(this);
    this.setAutoLock = this.setAutoLock.bind(this);
    if (
      session.walletPassword !== '' &&
      loginCounter.isLoggedIn &&
      autoLockEnabled
    ) {
      this.activityTimer = setTimeout(
        () => this.logOut(),
        1000 * 60 * autoLockInterval
      );
    }
  }

  componentDidMount() {
    ipcRenderer.on('importSeed', this.goToImportFromSeed);
    ipcRenderer.on('importKey', this.goToImportFromKey);
    ipcRenderer.on('handlePasswordChange', this.goToPasswordChange);
    eventEmitter.on('importSeed', this.goToImportFromSeed);
    eventEmitter.on('importKey', this.goToImportFromKey);
    eventEmitter.on('handlePasswordChange', this.goToPasswordChange);
    eventEmitter.on('openNewWallet', this.goToHome);
    eventEmitter.on('initializeNewSession', this.goToHome);
    eventEmitter.on('refreshLogin', this.goToHome);
    eventEmitter.on('loginFailed', this.goToLogin);
    eventEmitter.on('goHome', this.goToHome);
    eventEmitter.on('goToLogin', this.goToLogin);
    eventEmitter.on('logOut', this.logOut);
    eventEmitter.on('activityDetected', this.resetTimeout);
    eventEmitter.on('newLockInterval', this.resetTimeout);
    eventEmitter.on('setAutoLock', this.setAutoLock);
  }

  componentWillUnmount() {
    ipcRenderer.off('importSeed', this.goToImportFromSeed);
    ipcRenderer.off('importKey', this.goToImportFromKey);
    ipcRenderer.off('handlePasswordChange', this.goToPasswordChange);
    eventEmitter.off('importSeed', this.goToImportFromSeed);
    eventEmitter.off('importKey', this.goToImportFromKey);
    eventEmitter.off('handlePasswordChange', this.goToPasswordChange);
    eventEmitter.off('openNewWallet', this.goToHome);
    eventEmitter.off('initializeNewSession', this.goToHome);
    eventEmitter.off('refreshLogin', this.goToHome);
    eventEmitter.off('loginFailed', this.goToLogin);
    eventEmitter.off('goHome', this.goToHome);
    eventEmitter.off('goToLogin', this.goToLogin);
    eventEmitter.off('logOut', this.logOut);
    eventEmitter.off('activityDetected', this.resetTimeout);
    eventEmitter.off('newLockInterval', this.resetTimeout);
    eventEmitter.off('setAutoLock', this.setAutoLock);
    clearTimeout(this.activityTimer);
  }

  setAutoLock = async (enable: boolean) => {
    if (enable) {
      await this.setState({
        autoLockEnabled: true
      });
      this.resetTimeout();
    } else {
      await this.setState({
        autoLockEnabled: false
      });
      clearTimeout(this.activityTimer);
    }
  };

  logOut = () => {
    loginCounter.isLoggedIn = false;
    loginCounter.userLoginAttempted = false;
    loginCounter.loginsAttempted = 0;
    session.loginFailed = false;
    this.goToLogin();
    log.debug('Wallet was locked.');
  };

  resetTimeout = async (timeout?: number) => {
    const { autoLockEnabled } = this.state;
    if (!autoLockEnabled) {
      return;
    }
    if (timeout) {
      await this.setState({
        autoLockInterval: timeout
      });
    }
    const { autoLockInterval } = this.state;
    if (session.walletPassword !== '' && loginCounter.isLoggedIn) {
      clearTimeout(this.activityTimer);
      this.activityTimer = setTimeout(
        () => this.logOut(),
        1000 * 60 * autoLockInterval
      );
    }
  };

  goToLogin = () => {
    this.setState({
      login: true
    });
  };

  goToHome = () => {
    this.setState({
      home: true
    });
  };

  goToImportFromSeed = () => {
    this.setState({
      importSeed: true
    });
  };

  goToImportFromKey = () => {
    this.setState({
      importKey: true
    });
  };

  goToPasswordChange = () => {
    this.setState({
      changePassword: true
    });
  };

  goToFirstStartup = () => {
    this.setState({
      firstStartup: true
    });
  };

  render() {
    // prettier-ignore
    const { location: { pathname } } = this.props;
    const {
      changePassword,
      importKey,
      importSeed,
      loginFailed,
      firstStartup,
      home,
      login,
      isLoggedIn,
      freshRestore
    } = this.state;
    if (freshRestore === true && pathname !== '/changepassword') {
      loginCounter.freshRestore = false;
      return <Redirect to="/changepassword" />;
    }
    if (home === true && pathname !== '/') {
      return <Redirect to="/" />;
    }
    if (changePassword === true && pathname !== '/changepassword') {
      return <Redirect to="/changepassword" />;
    }

    if (importKey === true && pathname !== '/importkey') {
      return <Redirect to="/importkey" />;
    }

    if (importSeed === true && pathname !== '/import') {
      return <Redirect to="/import" />;
    }

    if (
      loginFailed === true &&
      pathname !== '/login' &&
      pathname !== '/import' &&
      pathname !== '/importkey' &&
      pathname !== '/firststartup'
    ) {
      return <Redirect to="/login" />;
    }

    if (login === true && pathname !== '/login') {
      return <Redirect to="/login" />;
    }

    if (
      isLoggedIn === false &&
      pathname !== '/login' &&
      pathname !== '/import' &&
      pathname !== '/importkey' &&
      pathname !== '/firststartup'
    ) {
      return <Redirect to="/login" />;
    }

    if (
      firstStartup === true &&
      pathname !== '/firststartup' &&
      pathname !== '/import' &&
      pathname !== '/importkey'
    ) {
      return <Redirect to="/firststartup" />;
    }

    return null;
  }
}

// $FlowFixMe
export default withRouter(Redirector);
