const { Client, SlashCommand } = require("elisif");
const { ElisifMap } = require("elisif/util/CollectionUtility");
const Events = require("../systems/events");

class SimpleClient extends Client {

    clones = new ElisifMap();
    cloneParent = null;
    events;
    #config; #base; #customEmitter = new (require("events"))();

    constructor(config, base) {
        super(config);
        base.setClient(this);

        this.#config = config;
        this.#base = base;
        this.events = new Events(this);

        //Setup persistent and scheduled events
        this.events.initialize();

        //Set debug mode
        this.setting("debug_mode", config.debug);

        //Enable @error custom event if in debug mode
        if (config.debug && config.uncaughtErrors) process.on('uncaughtException', (err) => {
            this.emit("@error", err);
            throw new Error(err);
        });

        //Autoinitialization functionality:
        this.on("ready", () => {

            SlashCommand.setupAll(this);

        });
    }

    /**
     * Registers a new event listener for the specified event. Extends the default discord.js event emitter.
     * Automatically replaces "message" event with "messageCreate" in order to avoid the deprecation warning.
     * Also supports the following unique event prefixes:
     * - \# >> Makes the event listener clonable. Cloned clients will inherit the listener. (ex: "#message" triggers on "message" event)
     * - @ >> Custom event listeners that do not interfere with discord.js events. (ex: "@message" will not trigger on "message" event)
     * - No prefix >> Default discord.js event listener behavior. (ex: "message" triggers on "message" event)
     * 
     * Includes built-in custom "@error" event that triggers on error if config.uncaughtErrors is enabled.
     * 
     * @param {"String"} eventName - The event to register the listener for.
     * @param {Function} listener - The listener function to handle the specified event.
     * @returns {this} SimpleClient
     */
    on(eventName, listener) {
        //Override on() to support cloning

        //Support custom event listeners:
        if (eventName.startsWith("@")) {
            return this.#customEmitter.on(eventName, listener);
        }

        //Prevent deprecation errors for `message` event:
        if (eventName == "message" || eventName.slice(1) == "message") eventName += "Create";

        //Support clonable event listeners:
        if (eventName.startsWith("#")) {
            super.on(eventName, listener);
            return super.on(eventName.slice(1), super.emit.bind(this, eventName));
        }

        //Support regular event listeners:
        return super.on(eventName, listener);
    }

    /**
     * Emits an event with the specified name and args. Extends the default discord.js event emitter.
     * Supports all of the custom prefixes supported by SimpleClient#on().
     * 
     * @param {String} eventName - The event to emit.
     * @param {...*} [args] - The arguments to pass to the event listener.
     */
    emit(eventName, ...args) {
        //Override emit() to support safe custom events

        //Support custom event listeners:
        if (eventName.startsWith("@")) {
            return this.#customEmitter.emit(eventName, ...args);
        }

        //Prevent deprecation errors for `message` event:
        // if (eventName == "message" || eventName.slice(1) == "message") eventName += "Create";

        //Support regular event listeners:
        return super.emit(eventName, ...args);
    }

    /**
     * Clones this SimpleClient, allowing another client to run the same commands and clonable event listeners.
     * 
     * @param {String} token - The token of the second client.
     * @param {Config} config - The configuration of the second client. Uses the config of the parent client if unspecified.
     * @returns {SimpleClient} The second (clone) client instance.
     */
    clone(token, config) {
        //Support for multiple clients running same event listeners and commands, and optionally having same config

        let clone = new SimpleClient(config?.data || Object.assign({}, this.#config), this.#base);
        clone.cloneParent = this;

        this.eventNames().forEach(eventName => {
            if (!eventName.startsWith("#")) return;
            this.listeners(eventName).forEach(listener => {
                clone.on(eventName, listener);
            });
        });

        clone.login(token);
        this.clones.set(token, clone);

        return clone;

    }

    /**
     * Recursively loads all commands in all JS files within the specified directory, including within child directories.
     * @param {String} dir - The directory to recursively load commands from.
     * @returns {this} SimpleClient
     */
    loadCommands(dir) {
        //Recursively load all commands in all JS files within the given directory, including within child directories

        let files = require("fs").readdirSync(dir);

        files.forEach(file => {
            let path = dir + "/" + file;
            if (require("fs").lstatSync(path).isDirectory()) {
                return this.loadCommands(path);
            } else if (path.endsWith(".js")) {
                this.debug("Loaded Command File:", file);
                return require(path);
            }
        });

        return this;

    }

    /**
     * Retrieves the specified value from this client's Elisif-Simple configuration.
     * The Config is read-only, and cannot be modified after the Client has been constructed.
     * @param {String} key - The name of the Config property to retrieve the value of.
     * @returns {*} The value of the specified Config property.
     */
    config(key) {
        return this.#config[key];
    }

}

module.exports = SimpleClient;