import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || '/auth',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'geostack',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'geostack-web',
});

let initialized = false;
const origInit = keycloak.init.bind(keycloak);
keycloak.init = (opts: Parameters<typeof origInit>[0]) => {
  if (initialized) {
    return Promise.resolve(keycloak.authenticated ?? false);
  }
  initialized = true;
  return origInit(opts);
};

export default keycloak;
