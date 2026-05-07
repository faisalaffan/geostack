import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || '/auth',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'geostack',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'geostack-web',
});

export default keycloak;
