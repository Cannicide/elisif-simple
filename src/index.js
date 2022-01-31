const ElisifConfig = require('./client/config');
const SimpleClient = require('./client/client');
const { SyntaxProgram } = require('./command/SyntaxCommand');
const ElisifMarkup = require('./systems/markup');
const ElisifToolkit = require('./systems/toolkit');
const { ElisifMap, ElisifSet } = require("elisif/util/CollectionUtility");

class ElisifSimple {

    static #cachedConfig = new ElisifConfig();

    /**
     * Creates, caches, and returns a new ElisifConfig.
     * ElisifConfigs are used to configure Elisif-Simple and Node-Elisif features.
     */
    static get config() { 
        ElisifSimple.#cachedConfig = new ElisifConfig();
        return ElisifSimple.#cachedConfig;
    }

    static #setStorageType = false;

    /**
     * Constructs a new Elisif-Simple client.
     * @param {Config} [conf] - Optional ElisifConfig to use when constructing the client. Uses the latest cached configuration if not provided.
     * @returns 
     */
    static bot(conf) {
        let data = (conf || ElisifSimple.#cachedConfig).data;

        //Set dynamic storage type - can only be set by config of first bot initialized in package
        if (!ElisifSimple.#setStorageType) require("elisif").evg.use(data.storage);
        ElisifSimple.#setStorageType = true;

        return new SimpleClient(data, ElisifSimple.base);
    }

    /**
     * Returns the base SyntaxProgram.
     * Used internally by the Elisif-Simple client to set the client's slash commands.
     */
    static base = new SyntaxProgram();

    /**
     * Creates a new slash command with the given name and description.
     * @param {String} name - The name of the command.
     * @param {String} desc - The description of the command.
     * @returns SyntaxCommand
     */
    static command(name, desc) {
        return ElisifSimple.base.command(name, desc);
    }

    /**
     * Creates a new context menu command with the given name.
     * @param {String} name - The name of the context menu command.
     * @returns SyntaxContextMenu
     */
    static contextmenu(name) {
        return ElisifSimple.base.contextmenu(name);
    }

    /**
     * Returns the Node-Elisif module.
     */
    static elisif = require("elisif");
    static Set = ElisifSet;
    static Map = ElisifMap;

    /**
     * Returns the Node-Elisif website handler (an ExpressJS instance).
     */
    static website = require("elisif").express;

    /**
     * Returns an object containing various information about this package, including:
     * - version
     * - author
     * - dependencies
     * - website
     */
    static info = {
        version: require("../package.json").version,
        author: "Cannicide#2753",
        dependencies: Object.keys(require("../package.json").dependencies),
        website: require("../package.json").homepage
    }

    /**
     * Returns the ElisifMarkup system.
     * Can be used to convert text in markup-like syntax into markdown and message options, and then send them as full messages.
     * This feature makes it possible to create messages with markdown, embeds, images, and message components all with a single String!
     * 
     * @param {String} text - The text to convert.
     * @returns ElisifMarkup
     */
    static markup(text) {
        return new ElisifMarkup(text);
    }

    /**
     * Returns the ElisifToolkit system.
     * Contains various utility methods, including:
     * - text translator
     * - timezone converter
     * - random number generator
     * - debug tool
     * - built-in storage (evg) size measurer
     * - general filesize measurer
     * 
     * @returns ElisifToolkit
     */
    static toolkit = new ElisifToolkit();

}

module.exports = ElisifSimple;