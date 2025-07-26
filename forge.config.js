const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    name: 'Genesis Chronicle',
    executableName: 'genesis-chronicle',
    icon: './assets/icon',
    asar: true,
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'genesis_chronicle',
        setupIcon: './assets/icon.ico',
        loadingGif: './assets/loading.gif',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          maintainer: 'Genesis Chronicle Team',
          homepage: 'https://github.com/genesis-chronicle/genesis-chronicle',
        },
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          maintainer: 'Genesis Chronicle Team',
          homepage: 'https://github.com/genesis-chronicle/genesis-chronicle',
        },
      },
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        name: 'Genesis Chronicle',
        icon: './assets/icon.icns',
        background: './assets/dmg-background.png',
        format: 'ULFO',
      },
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};