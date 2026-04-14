export function validateTaskVersion(bodyVersion, currentVersion) {
  if (bodyVersion === undefined || bodyVersion === null) {
    const err = new Error('versionNumber is required for updates (optimistic locking)');
    err.status = 400;
    throw err;
  }
  if (Number(bodyVersion) !== currentVersion) {
    const err = new Error('Stale version: task was modified by another user');
    err.status = 409;
    throw err;
  }
}
