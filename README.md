<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: CC0-1.0
-->

# BAR Lobby

BAR Lobby is a new WIP lobby for the RTS game [Beyond All Reason](https://www.beyondallreason.info/). It hopes to boldly go where no Spring client has gone before, providing a more streamlined experience, with good visuals and UX being high priority. The ultimate goal of BAR Lobby is to replace all other lobbies when it comes to playing BAR. If a significant amount of people don't wish to use it because of reasons such as functionality or speed, then this project is going very wrong.

![image](https://user-images.githubusercontent.com/1434248/223881325-bb8ac4f5-ed14-4ad8-ad33-970781cf3089.png)

## Project Status

BAR Lobby is a work-in-progress and actively developed project. We are currently working towards milestones defined in the [wiki/Roadmap](https://github.com/beyond-all-reason/bar-lobby/wiki/Roadmap).

BAR Lobby is an important part of [BAR's Steam Roadmap](https://www.beyondallreason.info/development/steam-release), and there is a lot of other work in other places that support this development. Please take a look at the [infrastructure documentation](https://beyond-all-reason.github.io/infrastructure/new_client/) for details on how BAR Lobby fits into the rest of the system.

## Functionality and Goals

- Provide functionality for everything related to BAR. Campaigns, Missions, Multiplayer, Replays etc
- Simple and intutive codebase, lots of documenation for contributing
- Steam integration, automatic account creation and login
- Smooth, seemless, fully integrated downloads. Content should be preloaded when sensible
- Communicate entirely via Teiserver's new protocol, [Tachyon](https://github.com/beyond-all-reason/teiserver/tree/master/documents/tachyon). No support for the legacy SpringLobbyProtocol
- TLS only, no unencypted comms

## Contributing

Please take a look at the [contributing guide](CONTRIBUTING.md) to learn how to help the project.

## Development

### Primary Tech Stack

- [Electron](https://www.electronjs.org/)
- [Vue 3](https://v3.vuejs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [SCSS](https://sass-lang.com/)
- [PrimeVue Components](https://primevue.org/datatable)

### Recommended Environment

It is highly recommended to use [VSCode](https://code.visualstudio.com/) for development, as it provides full, built-in TypeScript support, as well as useful extensions such as [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) and [Vue - Official (previously Volar)](https://marketplace.visualstudio.com/items?itemName=vue.volar).

### Requirements

- [Node.js 22.16.0](https://nodejs.org/en/download/)

We recommend tools management software like [NVM](https://github.com/nvm-sh/nvm) or [mise-en-place](https://mise.jdx.dev/) for installation of the correct node version.

### Local Development

```bash
npm install
npm start
```

### Project Structure

```
.
├──buildResources   # used by electron-builder
├──src
│  ├──main
│  │  ├──main.ts
│  │  └──...
│  ├──preload
│  │  ├──preload.ts
│  │  └──...
│  └──renderer      # with vue
│     ├──public     # (optional) publicDir for renderer
│     ├──index.ts
│     ├──index.html
│     └──...
├──electron-builder.config.ts
├──electron.vite.config.ts
├──package.json
└──...
```

- [**Main process**](https://www.electronjs.org/docs/latest/tutorial/process-model#the-main-process)
    - Runs in a Node.js environment and has access to Node.js APIs
    - Anything requiring access to the operating system or Node.js APIs needs to live here
- [**Preload script**](https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts)
    - Runs in a Node.js environment
    - Defines global objects that can be used in the renderer
    - Handles communication between the main and renderer processes
        - Uses Electron's ipcMain and ipcRenderer modules for inter-process communication (IPC).
- [**Renderer process**](https://www.electronjs.org/docs/latest/tutorial/process-model#the-renderer-process)
    - Runs in a web environment and has **no** direct access to Node.js APIs

### Build & Publish

- [`electron-forge`](https://www.electronforge.io/config/plugins/vite)
    - Builds the app with a pre-configured Vite setup for Electron apps
    - This intentionally does not include `electron` or any other `node_modules` dependencies in the build
        - Dependencies get added to the package by `electron-builder` with ASAR
        - Note: apps that only have CJS exports need to be included in the build, e.g. `glob-promise`
- [`electron-builder`](https://www.electron.build/)
    - Packages Electron app for distribution
        - Configured for Windows NSIS installer and Linux AppImage
    - Handles publishing updates
        - Auto-updates TBD

### Commands

- `npm start`
    - Runs `electron-forge` in `development` mode
    - **renderer** runs with Hot Module Replacement (HMR)
    - **main** and **preload** are directly bundled to `.vite/build`
- `npm run package`
    - Runs `electron-forge` in `production` mode
    - **renderer** is bundled to `.vite/renderer`
    - **main** and **preload** are bundled to `.vite/build`
    - This should be run before any of the `npm run build` commands below.
- `npm run preview`
    - Runs `electron-forge` in `production` mode, and runs electron
    - **main**, **preload**, and **renderer** are bundled to `.vite/build`
    - This is useful for validating the `production` build without packaging the app
- `npm run build:win`
    - Runs `npm run build` and `electron-builder`, building for Windows
    - Outputs NSIS installer in `dist`
- `npm run buildall:win`
    - Runs `npm run package` then runs `npm run build:win`.
- `npm run build:linux`
    - Runs `npm run build` and `electron-builder`, building for Linux
    - Outputs AppImage executable in `dist`
- `npm run buildall:linux`
    - Runs `npm run package` then runs `npm run build:linux`.
- `npm run build:unpack`
    - Runs `npm run build` and `electron-builder`, building an unpackaged directory
    - Outputs the unpacked contents in `dist`
    - Useful for testing
- `npm run dev-cert` (optional and only for Windows development)
    - Runs `electron-builder` to create a self-signed cert for Windows apps.
    - After selecting "None" in the pop-up, a cert file should be created called `BAR Team.pfx`
    - Then run `npm run build:win:dev-cert` to build a signed Windows installer
- `npm run generate-i18n-assets` (run when modifying source translation files)
    - Generates transformed asset files for translations in `src/renderer/assets/languages`

### Mutliplayer

You can start multiple separate instances by overriding the assets and/or state location using env variables:

```
BAR_STATE_PATH=state-2 npm start
BAR_ASSETS_PATH=assets-3 BAR_STATE_PATH=state-3 npm start
```

At time of writing, the [production server (server4)](https://server4.beyondallreason.info/) isn't setup for the new client. You need
to enable dev mode in the settings, and then, in the dev settings, choose [server5](https://server5.beyondallreason.info/) which is closer to the production
server, or the [dev server](https://lobby-server-dev.beyondallreason.dev/) where you can create test accounts.

### License

[![REUSE status](https://api.reuse.software/badge/github.com/beyond-all-reason/bar-lobby)](https://api.reuse.software/info/github.com/beyond-all-reason/bar-lobby)

Please see the [LICENSE.md](LICENSE.md) file for details on the license of this project.
