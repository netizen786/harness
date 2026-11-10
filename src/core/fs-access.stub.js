// REPLACE-WHEN-IMPLEMENTING: swap this file for fs-access.js and flip FEATURES.localFolder to true. No other file changes required.

export async function openLocalFolder() {
  throw new Error("FEATURE_DISABLED: open_local_folder");
}

export async function localRead(path) {
  throw new Error("FEATURE_DISABLED: local_read");
}

export async function localWrite(path, content) {
  throw new Error("FEATURE_DISABLED: local_write");
}
