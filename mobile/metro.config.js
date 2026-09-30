const fs = require("fs");
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

// OneDrive marks normal files as reparse points. Node then reports them as
// symlinks, and Metro crashes when readlink fails with EINVAL.
const isRealSymlink = (dirent) => {
  const parent = dirent.parentPath || dirent.path;
  if (!parent) return dirent.isSymbolicLink();
  try {
    fs.readlinkSync(path.join(parent, dirent.name));
    return true;
  } catch (error) {
    return error.code !== "EINVAL";
  }
};

const originalIsSymbolicLink = fs.Dirent.prototype.isSymbolicLink;
const originalIsFile = fs.Dirent.prototype.isFile;

fs.Dirent.prototype.isSymbolicLink = function isSymbolicLink() {
  if (!originalIsSymbolicLink.call(this)) return false;
  return isRealSymlink(this);
};

fs.Dirent.prototype.isFile = function isFile() {
  if (originalIsFile.call(this)) return true;
  return originalIsSymbolicLink.call(this) && !isRealSymlink(this);
};

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
