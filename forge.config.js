
module.exports = {
  packagerConfig: {
    name: 'Genesis Chronicle',
    executableName: 'genesis-chronicle',
    asar: false,
    ignore: [
      /^\/src\//,
      /^\/\.git/,
      /^\/\.vscode/,
      /^\/coverage/,
      /^\/node_modules\/.*\/test/,
      /^\/node_modules\/.*\/tests/,
      /^\/.*\.test\./,
      /^\/.*\.spec\./,
      /^\/test-.*\.js$/,
      /^\/run-.*\.js$/,
      /^\/TASK-.*\.md$/,
      /^\/scripts\//,
    ],
    appBundleId: 'com.genesischronicle.app',
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux', 'win32'],
    },
  ],
  plugins: [],
};
