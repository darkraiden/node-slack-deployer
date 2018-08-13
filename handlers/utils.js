//Extract a SHA1 hash from a given string
exports.getHash = bucketPath => {
    return bucketPath.match(/[a-z0-9]{40}/g)[0];
};
