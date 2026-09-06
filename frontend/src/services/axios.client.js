import $axios from 'axios';
import { generateRequestId } from '../common/general-utils';
import Cookies from 'js-cookie';

// Mocks for missing Vue/Nuxt infrastructure in this React app
const toast = {
  error: (msg, duration) => console.error('[TOAST ERROR]', msg)
};
const store = {
  commit: (mutation, payload) => console.log('[STORE COMMIT]', mutation, payload)
};

const setCookie = (name, value) => {
  document.cookie = `${name}=${value}; path=/`;
};

import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

NProgress.configure({ showSpinner: false, speed: 400, minimum: 0.1 });

// Mock loading indicator composable
let pendingRequests = 0;
const start = () => NProgress.start();
const finish = () => NProgress.done();
const clear = () => { NProgress.done(); NProgress.remove(); };
const errorState = { _value: false };

function handleNuxtLoadingProgress() {
  pendingRequests--;
  if (pendingRequests === 0) {
    finish();
    errorState._value = false;
  }
  if (pendingRequests > 0 && !errorState._value) {
    start();
  }
}

// Setup base URL
$axios.defaults.baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
$axios.defaults.headers.common['Content-Type'] = 'application/json';

let responseCount = 0;
let axiosClient = $axios;

const checkLoginRedir = (response) => {
  if (
    typeof response.data === 'string' &&
    response.data.indexOf('<!doctype html>') === 0 &&
    response.request.responseURL
  ) {
    if (
      response.request.responseURL.indexOf(`${window.location.origin}/login`) > -1 ||
      response.request.responseURL.includes('/verify-otp')
    ) {
      window.location.href = response.request.responseURL;
    } else {
      toast.error(`No such API: ${response.request.responseURL}`, 10000);
    }
  }
};

$axios.interceptors.response.use(
  (response) => {
    handleNuxtLoadingProgress();
    
    if (response?.headers?.['maxage']) {
      setCookie('sessionTimeout', new Date().getTime() + Number(response.headers['maxage']));
    }
    if (response?.headers?.['session-expired']) {
      if (responseCount === 0) {
        window.location.href = '/login?reason=invalidsession';
      }
      responseCount++;
      return Promise.resolve(response.data);
    }

    if (response?.headers?.['saml-logged-out'] && window.location.pathname !== '/login') {
      if (responseCount === 0) {
        window.location.href = '/login?isSamlUser=1';
      }
      responseCount++;
      return Promise.resolve(response.data);
    }

    if (response?.config?.url === '/api/users/forceLogoutCheck' && response.data !== 'Authorized') {
      const path = window.location.pathname;
      if (
        path !== '/login' &&
        !path.startsWith('/verify-otp') &&
        !path.startsWith('/form') &&
        !path.startsWith('/reset-password') &&
        !path.startsWith('/forgot-password')
      ) {
        window.location.href = '/login';
      }
      return Promise.resolve(response.data);
    }
    
    checkLoginRedir(response, toast);
    
    if (response.config?.resolveResponse) {
      return Promise.resolve(response);
    }
    return Promise.resolve(response.data);
  },
  (er) => {
    if ($axios.isCancel(er) || er.message === 'canceled') {
      if (pendingRequests > 1) {
        clear();
        start();
      }
      handleNuxtLoadingProgress();
      return Promise.reject(er);
    }

    errorState._value = true;
    handleNuxtLoadingProgress();
    
    if (!$axios.isAxiosError(er)) {
      return Promise.reject(er);
    }
    if (er + '' === 'Error: Network Error') {
      toast.error(er, 10000);
      return Promise.reject(er);
    }

    const path = window.location.pathname;
    if (er.response && er.response.status === 401) {
      if (path.startsWith('/form')) {
        if (
          er.config?.url === '/api/users/forceLogoutCheck' ||
          er.response?.config?.url === '/api/users/forceLogoutCheck'
        ) {
          return Promise.reject(er);
        }
        store.commit('external-forms/setInvalid', true);
        return Promise.reject(er);
      } else if (er.response.data && er.response.data.message === 'ForceLogOut') {
        window.location.href = '/admin/force-logout';
        return Promise.reject(er);
      }

      if (
        !path.startsWith('/login') &&
        !path.startsWith('/verify-otp') &&
        !path.startsWith('/forgot-password') &&
        !path.startsWith('/reset-password')
      ) {
        window.location.href = '/login?reason=session_expired';
        return Promise.reject(er);
      }
    }
    
    if (er.code === '500') {
      toast.error(er, 10000);
    }
    
    const errorCode = er.response?.status || er.code;
    if (typeof errorCode === 'number' && errorCode > 500) {
      const customError = new Error(
        'An unexpected server error has occurred. We apologize for the inconvenience. Please try again later, and contact support if the issue persists.'
      );
      customError.stack = er.stack;
      return Promise.reject(customError);
    }
    return Promise.reject(er);
  }
);

$axios.interceptors.request.use((config) => {
  config.headers['request-id'] = config.headers['request-id'] || generateRequestId();
  
  const token = Cookies.get('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (pendingRequests === 0) {
    start();
  }
  errorState._value = false;
  pendingRequests++;
  config.params = { _t: new Date().getTime(), ...config.params };
  return config;
});

// Export Nuxt-style helpers, but also export standard axios as default
export const axios = [
  '$request',
  '$delete',
  '$get',
  '$head',
  '$options',
  '$post',
  '$put',
  '$patch',
  'isAxiosError'
].reduce((acc, method) => {
  acc[method] = function () {
    if (!axiosClient) throw new Error('Axios not yet loaded');
    if (method === 'isAxiosError') {
      return axiosClient.isAxiosError.apply(null, arguments);
    }
    return axiosClient[method.replace(/^\$/, '')].apply(null, arguments);
  };
  return acc;
}, {});

// Export standard configured instance so axios.post works normally
export default axiosClient;
