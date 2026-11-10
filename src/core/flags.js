export const FEATURES = {
  search: true,
  pythonSandbox: true,
  remoteBrowser: false,
  localFolder: false,
};

export function isFeatureEnabled(flagName) {
  return FEATURES[flagName] === true;
}
