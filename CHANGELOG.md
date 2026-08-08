## 1.3.1 (2026-08-08)

### Features

* **library:** add a persistent Last listened sort backed by Storytel's real listening timestamps and live playback updates
* **settings:** show the Storytel Player, Electron, Chrome, and Node.js versions in a new About section
* **player:** keep playback active while browsing, add listening-history recovery, and improve cross-device progress handling
* **read along:** add private on-device live transcription with word-level navigation in the expanded player
* **discovery:** add catalog search and library management without interrupting playback

### Bug Fixes

* **bookshelf:** preserve listening and library-activity timestamps returned by the current Storytel API
* **library:** make every sort mode deterministic and replace the misleading Recently added order with Recently updated
* **i18n:** complete missing single-sign-on labels across all supported languages
* **release:** publish validated stable tags only after every platform build succeeds

## 1.2.20 (2026-07-15)


### Bug Fixes

* adapting layout ([037182c](https://github.com/scherzma/fork-storytel-player/commit/037182cc375cfbbfa3269841f689ff14da39669b))
* **auth:** restore Firebase token refresh ([e9a5cef](https://github.com/scherzma/fork-storytel-player/commit/e9a5cef78ca6aea5cf27452915d3cae4bb16765f))
* **bookmarks:** close create bookmark modal on cancel/close ([d130f52](https://github.com/scherzma/fork-storytel-player/commit/d130f52c6f85225a4ed8d28359ddb004247d9179))
* changed README assets ([ae0fbab](https://github.com/scherzma/fork-storytel-player/commit/ae0fbabcdebc942433a178faddb78e1262005934))
* **core:** improve 401 handling and error propagation across IPC ([006fa5b](https://github.com/scherzma/fork-storytel-player/commit/006fa5bfcbf83b43779483f87ae3d97098c4d146))
* decoupling components ([1a6ece5](https://github.com/scherzma/fork-storytel-player/commit/1a6ece519bf79a8198b3a9a545abda22a0576978))
* dotenv quiet ([8ab2d15](https://github.com/scherzma/fork-storytel-player/commit/8ab2d1597927f02d4d5545f1a5bbc2c2c442d2ae))
* **electron:** set quitting flag and always quit on window close ([b15345b](https://github.com/scherzma/fork-storytel-player/commit/b15345ba2777dc31bd58721699c1dac2c1ba278c))
* emit error in case of network issue ([7858388](https://github.com/scherzma/fork-storytel-player/commit/7858388da5fc87258636c84d772a21e5d042cded))
* ensure workflow does not create multiple draft releases ([88d606d](https://github.com/scherzma/fork-storytel-player/commit/88d606d39d88c9981859b219027797181ad4eea2))
* ensure workflow does not create multiple draft releases ([6641782](https://github.com/scherzma/fork-storytel-player/commit/6641782ca00e3c1d7ba9d5e97e2d522ee6b5b0c8))
* filteredBooks don't take care about ebooks ([b0c2ce9](https://github.com/scherzma/fork-storytel-player/commit/b0c2ce9ac629b6783c74a4de18ed41e7d1687a75))
* goToPosition sometimes did not work as expected ([f44745f](https://github.com/scherzma/fork-storytel-player/commit/f44745f614242c7e51a82d756c92a295fb132074))
* JWT token check ([e630de0](https://github.com/scherzma/fork-storytel-player/commit/e630de08b8aa46dcf6e54370664523201ebb7819))
* loadChapters sometimes did not work as expected ([cffadfd](https://github.com/scherzma/fork-storytel-player/commit/cffadfd4ec91d2e6ad25f7e396293ace1f84f9cb))
* README download action ([02373ad](https://github.com/scherzma/fork-storytel-player/commit/02373adaace21a8218a8133b06156e1e2d6f5efd))
* README.md ([1c7bfb8](https://github.com/scherzma/fork-storytel-player/commit/1c7bfb8a7923b4a540d9cc9c61e102dc8f3e2a5d))
* **server:** encode Storytel login params ([da15430](https://github.com/scherzma/fork-storytel-player/commit/da15430f6b5e5bfc53c916c0c3f1158d04022eeb))
* **server:** propagate Storytel 401 login errors ([6cbcd17](https://github.com/scherzma/fork-storytel-player/commit/6cbcd1760d493639facf26454b8e9aa0888a7cfe))
* **server:** remove duplicate Italian translation import and response ([f5981f5](https://github.com/scherzma/fork-storytel-player/commit/f5981f54c1138feeb3ef8a25f621ec4c143977ab))
* set timeout for external API calls ([ab4f09b](https://github.com/scherzma/fork-storytel-player/commit/ab4f09be4d43d8f439ec2e6cd20d2cbd60498f4b))
* small changes in electron builder options ([192845e](https://github.com/scherzma/fork-storytel-player/commit/192845e8151a391c90f4f635d74f539a633cac12))
* spacing changes in book details in player view ([3b2c456](https://github.com/scherzma/fork-storytel-player/commit/3b2c456fc0337726f2654c2a407777e8ad7bdc30))
* **tray:** set template image on macOS tray icon ([27ae4d1](https://github.com/scherzma/fork-storytel-player/commit/27ae4d132de810b634064c68f57a79f50aa2fcd3))
* updated README.md ([2aa501b](https://github.com/scherzma/fork-storytel-player/commit/2aa501b106477310aef2359f5665e8198a433b5c))
* workflow ([cbf5973](https://github.com/scherzma/fork-storytel-player/commit/cbf59732dadce80e1dd5c42c59913431f483ff69))


### Features

* add about and help commands in tray ([e93fea4](https://github.com/scherzma/fork-storytel-player/commit/e93fea459572d7ce30d9d7cb0a904e703b73012d))
* add session expiration handling across client and server ([09c12ca](https://github.com/scherzma/fork-storytel-player/commit/09c12ca90800803907e56f4738c94645e085715b))
* added book view ([720614b](https://github.com/scherzma/fork-storytel-player/commit/720614b8ece49f79cbcc7b75542b2c238eec066d))
* **client:** add logs modal and search hotkeys, increase timeouts ([cda8c45](https://github.com/scherzma/fork-storytel-player/commit/cda8c45179c13622abfcd16076326fdc84ea6daf))
* **client:** add welcome and settings modals with i18n ([ce56fda](https://github.com/scherzma/fork-storytel-player/commit/ce56fdae4ddf3fa7f2efd1d54d907004bd88e2db))
* **core:** add action logging and multi-language support ([8cdfdbf](https://github.com/scherzma/fork-storytel-player/commit/8cdfdbfd5cda1837d3248090a7dae88b7f0b68ca))
* **docs:** add separate macOS Intel and Apple Silicon downloads ([091c8b5](https://github.com/scherzma/fork-storytel-player/commit/091c8b5d47bc251c4c4489508f7789e32d4fa733))
* electron try improvements ([fe171c5](https://github.com/scherzma/fork-storytel-player/commit/fe171c5045619c5c7d8d308fa7ac253e0f7bae8d))
* **error:** keep header visible and add logout on bookshelf error ([1f91d0e](https://github.com/scherzma/fork-storytel-player/commit/1f91d0e539c3581ee197297e7d84a057b764ba25))
* manage download removal ([afd366d](https://github.com/scherzma/fork-storytel-player/commit/afd366dd5dee119a6bc91227a5a22b4b6e45fc3a))
* **server:** add /api/account endpoint and email translation ([1215db1](https://github.com/scherzma/fork-storytel-player/commit/1215db1b99f7bfa1c05add42d0c14a8e2a060bcc))
* **server:** add log rotation and size limit for logger ([37e75a5](https://github.com/scherzma/fork-storytel-player/commit/37e75a57c1a52ed0b0606b3540a403c3bb006fcc))
* **settings-modal:** add toggle for always-on-top window setting ([0bf0c31](https://github.com/scherzma/fork-storytel-player/commit/0bf0c3133b9f69e7d5dbb964652660f8857ea1b7))
* **sso:** add SSO login flow and offline fallbacks ([abdbe98](https://github.com/scherzma/fork-storytel-player/commit/abdbe98e8edb4477ad909e033c5b12aee8661377))
* **storytel:** migrate bookshelf and book details to api.storytel.net ([45e98fc](https://github.com/scherzma/fork-storytel-player/commit/45e98fcee9bbbc937193b9520d385f8571cdd493))
* **storytel:** stream audio via api.storytel.net assets endpoint ([de62e46](https://github.com/scherzma/fork-storytel-player/commit/de62e46af97eb3a7e82c8f5d38bbb21a5e551435))
* **tray:** add platform-specific tray icons and use nativeImage ([058087c](https://github.com/scherzma/fork-storytel-player/commit/058087cf97ce1eeb20298668242b40d2429a167b))
* UI improvements ([b08be1e](https://github.com/scherzma/fork-storytel-player/commit/b08be1ec673724797cfdd9018777acd7b481d345))

## [1.2.16](https://github.com/debba/storytel-player/compare/v1.2.15...v1.2.16) (2026-07-13)


### Bug Fixes

* **auth:** restore Firebase token refresh ([e9a5cef](https://github.com/debba/storytel-player/commit/e9a5cef78ca6aea5cf27452915d3cae4bb16765f))


### Features

* **error:** keep header visible and add logout on bookshelf error ([1f91d0e](https://github.com/debba/storytel-player/commit/1f91d0e539c3581ee197297e7d84a057b764ba25))

## [1.2.15](https://github.com/debba/storytel-player/compare/v1.2.15-beta1...v1.2.15) (2026-07-10)


### Bug Fixes

* **bookmarks:** close create bookmark modal on cancel/close ([d130f52](https://github.com/debba/storytel-player/commit/d130f52c6f85225a4ed8d28359ddb004247d9179))


### Features

* **storytel:** migrate bookshelf and book details to api.storytel.net ([45e98fc](https://github.com/debba/storytel-player/commit/45e98fcee9bbbc937193b9520d385f8571cdd493))
* **storytel:** stream audio via api.storytel.net assets endpoint ([de62e46](https://github.com/debba/storytel-player/commit/de62e46af97eb3a7e82c8f5d38bbb21a5e551435))

## [1.2.14](https://github.com/debba/storytel-player/compare/v1.2.13...v1.2.14) (2026-05-15)


### Features

* **sso:** add SSO login flow and offline fallbacks ([abdbe98](https://github.com/debba/storytel-player/commit/abdbe98e8edb4477ad909e033c5b12aee8661377))


### Bug Fixes

* **server:** encode Storytel login params ([da15430](https://github.com/debba/storytel-player/commit/da15430f6b5e5bfc53c916c0c3f1158d04022eeb))
* **server:** propagate Storytel 401 login errors ([6cbcd17](https://github.com/debba/storytel-player/commit/6cbcd1760d493639facf26454b8e9aa0888a7cfe))

## [1.2.13](https://github.com/debba/storytel-player/compare/v1.2.12...v1.2.13) (2026-04-03)


### Features

* **docs:** add separate macOS Intel and Apple Silicon downloads ([091c8b5](https://github.com/debba/storytel-player/commit/091c8b5d47bc251c4c4489508f7789e32d4fa733))



## [1.2.12](https://github.com/debba/storytel-player/compare/v1.2.11...v1.2.12) (2026-03-12)


### Features

* **client:** add logs modal and search hotkeys, increase timeouts ([cda8c45](https://github.com/debba/storytel-player/commit/cda8c45179c13622abfcd16076326fdc84ea6daf))
* **server:** add log rotation and size limit for logger ([37e75a5](https://github.com/debba/storytel-player/commit/37e75a57c1a52ed0b0606b3540a403c3bb006fcc))



## [1.2.11](https://github.com/debba/storytel-player/compare/v1.2.10...v1.2.11) (2026-02-25)


### Bug Fixes

* **tray:** set template image on macOS tray icon ([27ae4d1](https://github.com/debba/storytel-player/commit/27ae4d132de810b634064c68f57a79f50aa2fcd3))


### Features

* **tray:** add platform-specific tray icons and use nativeImage ([058087c](https://github.com/debba/storytel-player/commit/058087cf97ce1eeb20298668242b40d2429a167b))



## [1.2.10](https://github.com/debba/storytel-player/compare/v1.2.9...v1.2.10) (2026-02-23)


### Bug Fixes

* **core:** improve 401 handling and error propagation across IPC ([006fa5b](https://github.com/debba/storytel-player/commit/006fa5bfcbf83b43779483f87ae3d97098c4d146))


### Features

* add session expiration handling across client and server ([09c12ca](https://github.com/debba/storytel-player/commit/09c12ca90800803907e56f4738c94645e085715b))



## [1.2.9](https://github.com/debba/storytel-player/compare/v1.2.8...v1.2.9) (2026-02-22)


### Bug Fixes

* **server:** remove duplicate Italian translation import and response ([f5981f5](https://github.com/debba/storytel-player/commit/f5981f54c1138feeb3ef8a25f621ec4c143977ab))


### Features

* **core:** add action logging and multi-language support ([8cdfdbf](https://github.com/debba/storytel-player/commit/8cdfdbfd5cda1837d3248090a7dae88b7f0b68ca))



## [1.2.8](https://github.com/debba/storytel-player/compare/v1.2.7...v1.2.8) (2026-02-17)


### Features

* **settings-modal:** add toggle for always-on-top window setting ([0bf0c31](https://github.com/debba/storytel-player/commit/0bf0c3133b9f69e7d5dbb964652660f8857ea1b7))



