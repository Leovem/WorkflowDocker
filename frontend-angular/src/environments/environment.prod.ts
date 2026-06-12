export const environment = {
  production: true,
  apiUrl: '/api',
  iaApiUrl: '/ia',
  collabWsUrl: `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/collab`,
  cloudinary: {
    cloudName: 'dsu8dll2n',
    uploadPreset: 'tramites_workflow'
  }
};