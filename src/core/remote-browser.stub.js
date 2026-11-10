// REPLACE-WHEN-IMPLEMENTING: swap this file for remote-browser.js and flip FEATURES.remoteBrowser to true. No other file changes required.

export async function browseUrl({ url }) {
  throw new Error("FEATURE_DISABLED: browse_url");
}
