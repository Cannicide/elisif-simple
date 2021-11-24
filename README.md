# elisif-simple
The power of node-elisif, made simple.\
[![Node Package](https://github.com/Cannicide/elisif-simple/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/Cannicide/elisif-simple/actions/workflows/npm-publish.yml) [![NPM Version](https://img.shields.io/npm/v/elisif-simple?maxAge=2400)](https://www.npmjs.com/package/elisif-simple) [![NPM Downloads](https://img.shields.io/npm/dt/elisif-simple?maxAge=2400)](https://www.npmjs.com/package/elisif-simple)

[![NPM Badge](https://nodei.co/npm/elisif-simple.png?downloads=true&stars=true)](https://nodei.co/npm/elisif-simple)


## Installation
Easily install this package with the following command:

```
npm install elisif-simple
```

Optionally, to specify a specific version of the package to use, update your `package.json` like so:

```json
"dependencies": {
    "elisif-simple": "1.0.0"
}
```

## Usage
This package utilizes `node-elisif` under the covers, simplifying and abstracting away much of its functionality to make it much simpler to get a high-quality bot running quickly. Elisif Simple additionally does not fully expose any of the utility, interface, or interpreter classes of Node Elisif, encouraging you to learn and use more of the default Discord.js functionality instead.

*Note: Elisif Simple is currently utilizing the latest dev version of Node-Elisif instead of the latest stable version. This is because the older stable version is built on discord.js v12, whereas the dev version has been rewritten to work with discord.js v13. Most bugs in the dev version have been ironed out, but some bugs may still remain due to reliance on this not-quite-release-ready version of Node-Elisif. If you discover an issue in either package, please open an Issue on either repository.*

Further usage and documentation will be coming soon. Most of the properties and methods, however, are already partly documented in-code via jsdoc, which you can utilize in place of proper documentation for now.

## Improvements
If you have suggestions for further improvements or find issues in this package, feel free to open an Issue on the Github repository. I will address Issues as quickly as I can. Feel free to fork the package and/or create pull requests if you have an excellent idea for a new feature, or have a fix for any existing bug. If you make a notable contribution via pull request, I will add you to the Contributors list in the Credits section of this README.

## Privacy
Unlike some other packages, Elisif Simple and Node-Elisif never directly interact with or request your Discord bot's token. Client authentication is entirely handled by Discord.js. This package also never requests your Discord credentials (i.e. email or password), nor needs any such credentials. You can choose to provide your username and Discord ID, however, in the client config. This information is solely used for ensuring that the authors of your bot (e.g. you) are the only users authorized to utilize high-security features, such as an `eval` command. This package does not need your username or ID to run, but you may not be able to use some developer-only features if you do not provide both.

All of the code for Elisif Simple is open-source. If at any time you have concerns regarding privacy based on any features found in the code of this package, feel free to open an Issue on the Github repository.

## Credits

**Created by Cannicide#2753**

Dependencies: node-elisif, node-schedule
Node Elisif Dependencies: discord.js, express, node-fetch, evg-storage
EvG Storage Dependencies: quick.db, lson-archived (merged), basecacti (merged)

Contributors:
- Cannicide#2753
