const { Client, SlashCommand } = require("elisif");
const { ElisifMap } = require("elisif/util/CollectionUtility");
const Events = require("../systems/events");
const Constants = require("../systems/constants");
const { builder } = require("../command/CommandSyntaxUtility");
const { boa } = require("../systems/toolkit");

class SimpleClient extends Client {

    clones = new ElisifMap();
    cloneParent = null;
    #events = new Events(this);
    #config; #base; #customEmitter = new (require("events"))();

    constructor(config, base) {
        super(config);
        base.setClient(this);

        this.#config = config;
        this.#base = base;
        this.constants = boa.dict(new Constants());

        //Setup persistent, scheduled, and ION events
        this.#events.initialize();

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
            builder.initializeAutocomplete(this);

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

        if (typeof eventName === 'function') [eventName, listener] = [eventName.name, eventName];

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
                let cmd = require(path);
                if ("init" in cmd) cmd.init(this);
                return cmd;
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

    /**
     * @callback IonOff
     * @param {String} removalEvent - When this event is triggered, the hook will be removed if ID conditions are met for removalEvent data.
     * @param {String} namespace - The namespace of the original hook event handler, i.e. the handler to remove.
     * @param {Function} callback - A callback function that will be called if and after the original hook event handler has been removed.
     */

    /**
     * @callback IonAdd
     * @param {String} namespace - The namespace of the hook event handler to set the IDs of.
     * @param {...String} ids - The IDs to add for this namespace.
     */

    /**
     * @callback IonRemove
     * @param {String} namespace - The namespace of the hook event handler to remove the IDs of.
     * @param {String[]} ids - A set of IDs to remove for this namespace.
     */

    /**
     * @typedef {object} ION
     * @property {IonOff} off 
     * Removes the found set of a dynamic ion event handler's IDs when the specified removalEvent is called,
     * if all IDs specified by any single call of ion.add() for this namespace are found in the structure of the removalEvent data.
     * 
     * Removes only the IDs specified by ion.add() for this namespace that are found in the structure of the removalEvent data.
     * 
     * The purpose of this method is to deal with issues that arise in, for example, button/reaction handlers when their message is deleted.
     * This method provides a way to automatically remove an event handler when an associated event containing the same IDs is triggered.
     * @property {IonAdd} add
     * Sets the IDs that will trigger the ion() callback for a given namespace.
     * Adds onto any existing IDs set for this namespace.
     * 
     * IDs provided normally as a String, Number, or any other data type will be required to trigger the ion event.
     * However, you can use special syntax to make certain IDs linked to each other. Only one of such linked IDs are required to be present.
     * For example, if the IDs passed in are "a", "b", and ["c","d"], then the ion event will trigger if all of the following are true:
     * - id of "a" is present
     * - id of "b" is present
     * - id of "c" OR "d" is present
     * 
     * Any number of IDs can be linked to each other, and any number of IDs can be provided to this method.
     * IDs can be linked by passing in an array containing the IDs that are linked to each other, like so:
     * - In "a", "b", ["c","d"] -> "c" and "d" are linked
     * Alternatively, IDs can be linked by separating them with a double-colon in a single string, like so:
     * - In "a", "b", "c::d::e" -> "c", "d", and "e" are linked
     * @property {IonRemove} remove
     * Clears the IDs that will trigger the ion() callback for a given namespace.
     * Once cleared, the ion() callback will not be triggered (until ion.add() is called again for this namespace).
     */

    /**
     * Creates a new dynamic "ION" event handler. ION events are dynamic event handlers that only trigger if specific IDs are found in event data.
     * Runs the specified callback if all IDs specified by ion.add() for this namespace are found in the structure of the event data.
     * @param {String} event - The event to listen for and handle.
     * @param {String} namespace - A unique identifier representing the name and/or purpose of this specific handler.
     * @param {Function} callback - A callback function that will be called if the event is triggered, and if ID conditions are met.
     * @returns {ION} The ION event handler.
     */
    get ion() {
        const ion = (event, namespace, callback) => this.#events.hooks.on(event, namespace, callback);
        /**
         
         */
         ion.off = this.#events.hooks.off.bind(this.#events.hooks);
         ion.add = this.#events.hooks.add.bind(this.#events.hooks);
         ion.remove = this.#events.hooks.remove.bind(this.#events.hooks);

         return ion;
    }

    /**
     * Removes a dynamic event ("hook") when the specified removalEvent is called,
     * if all IDs specified by hooks#add() for this namespace are found in the structure of the removalEvent data.
     * 
     * Clears all IDs specified by hooks#add() for this namespace and prevents further triggers of the hooks#on() callback,
     * until more IDs are added by hooks#add() for this namespace.
     * 
     * The purpose of this method is to deal with issues that arise in, for example, button/reaction handlers when their message is deleted.
     * This method provides a way to automatically remove an event handler when an associated event containing the same IDs is triggered.
     * @param {String} removalEvent - When this event is triggered, the hook will be removed if ID conditions are met for removalEvent data.
     * @param {String} namespace - The namespace of the original hook event handler, i.e. the handler to remove.
     * @param {Function} callback - A callback function that will be called if and after the original hook event handler has been removed.
     */
    #ionOff() {}

    schedule() {
        this.#events.schedule();
        this.ion
    }

}

module.exports = SimpleClient;