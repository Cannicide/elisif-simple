// Elisif-Simple Events - Persistent Events and Scheduled Functions

const scheduler = require('node-schedule');
const { ElisifMap } = require("elisif/util/CollectionUtility");

//evolved version of Interpreter that saves event name, listener name, and function strings to db
module.exports = class Events {

    #scheduled = new ElisifMap();
    #persisted = new ElisifMap();

    constructor(client) {
        this.client = client;
    }

    /**
     * Creates a new persistent event. Persistent events are event listeners that persist between restarts.
     * These event listeners are saved in storage and restored when the bot is restarted. Can be used to create persistent event handlers for, for example, specific buttons and reactions until some condition is met.
     * This Events object is inserted as the first argument of persistent listeners. [ex: client.on("message", (events, message) => { ... })]
     * @param {String} eventName - The name of the event to handle.
     * @param {String} listenerName - A custom, unique name that can be used to identify this specific listener. [ex: "messageListener1"]
     * @param {Function} func - The listener function to be called when the event is triggered. The first argument of the listener must be the 'events' object. [ex: (events, message) => { ... }]
     */
    persist(eventName, listenerName, func) {
  
        const functionString = func.toString();

        const persistentEvent = {
            event: eventName,
            name: listenerName + "#p",
            listener: functionString
        };

        const persistentEvents = this.client.setting("persistentEvents") || [];
        persistentEvents.push(persistentEvent);
        this.client.setting("persistentEvents", persistentEvents);

        this.handlers.onPersist(persistentEvent);
    
    }

    /**
     * Creates a new scheduled function. Scheduled functions are functions that are called at a specific time.
     * These functions are saved in storage and called when the specified datetime is reached. If the datetime is missed due to the bot being offline, the function is immediately called when the bot comes back online.
     * After the function is called, the function is removed from storage and is unscheduled.
     * @param {String} listenerName - A custom, unique name that can be used to identify this specific function. [ex: "coolFunction1"]
     * @param {Date} date - A Date object representing the exact datetime when the function should be called.
     * @param {Function} func - The function to schedule, which will be called at the specified datetime. [ex: (client, data) => { ... }]
     * @param {Object} [data] - An optional object literal containing data to pass to the scheduled function. (This is often necessary, as variables outside of the scheduled function -- which usually contain such data -- cannot be properly referenced within the isolated scheduled function).
     */
    schedule(listenerName, date, func, data) {

        const functionString = func.toString();

        const scheduledEvent = {
            date: date.toString(),
            name: listenerName + "#s",
            listener: functionString,
            data
        };

        const scheduledEvents = this.client.setting("scheduledEvents") || [];
        scheduledEvents.push(scheduledEvent);
        this.client.setting("scheduledEvents", scheduledEvents);

        this.handlers.onSchedule(scheduledEvent);

    }

    /**
     * Removes a persistent event or unschedules a scheduled function, based on the provided unique listenerName.
     * Note that scheduled functions automatically call this method once they have successfully executed.
     * @param {String} listenerName - The unique name of the persistent listener or scheduled function to remove.
     */
    desist(listenerName) {

        const persistentEvents = this.client.setting("persistentEvents") || [];
        const scheduledEvents = this.client.setting("scheduledEvents") || [];

        if ((!persistentEvents && !scheduledEvents) || (persistentEvents.length < 1 && scheduledEvents.length < 1)) return false;

        const persistent = persistentEvents.find(p => p.name === listenerName + "#p");
        const scheduled = scheduledEvents.find(s => s.name === listenerName + "#s");

        if (persistent) {
            const index = persistentEvents.indexOf(persistent);
            persistentEvents.splice(index, 1);
            this.client.setting("persistentEvents", persistentEvents);

            if (this.#persisted.has(persistent.name)) {
                this.#persisted.delete(persistent.name);
            }

            return true;
        }

        if (scheduled) {
            const index = scheduledEvents.indexOf(scheduled);
            scheduledEvents.splice(index, 1);
            this.client.setting("scheduledEvents", scheduledEvents);

            if (this.#scheduled.has(scheduled.name)) {
                this.#scheduled.get(scheduled.name).cancel();
                this.#scheduled.delete(scheduled.name);
            }

            return true;
        }

        return false;

    }

    handlers = {
        onPersist: ({ event, name, listener }) => {

            this.#persisted.set(name, true);
            this.client.on(event, (...args) => {
                if (!this.#persisted.has(name)) return;
                new Function("return " + listener)()(this, ...args);
            });

        },
        onSchedule: ({ date, name, listener, data }) => {

            if (new Date(date) < new Date()) {
                this.client.debug(`Scheduled event <${name}> is beyond its scheduled date-time. Executing it now...`);
                this.desist(name.split("#")[0]);
                new Function("return " + listener)()(this.client, data);
                return;
            }

            const job = scheduler.scheduleJob(new Date(date), () => {
                this.desist(name.split("#")[0]);
                new Function("return " + listener)()(this.client, data);
            });
            this.#scheduled.set(name, job);

        }
    }

    /**
     * Hooks are dynamic event handlers that only trigger for specific targets.
     * Hook event callbacks are only run if specific ID strings are found somewhere in the structure of the event data.
     * 
     * For example, if "123456789012345678" is specified as an ID, a hook message event will trigger if any of the following are true:
     * - message.id == "123456789012345678"
     * - message.channel.id == "123456789012345678"
     * - message.guild.id == "123456789012345678"
     * - etc.
     * 
     * Multiple IDs can be specified, and these IDs can represent the ID of any structure (messages, guilds, buttons, etc).
     * If multiple IDs are specified, all specified IDs must be found in the structure of the event data in order for the event callback to run.
     * 
     * Note that ID-checking is based on arguments passed to the callback.
     * - Ex: For "messageDelete", IDs are checked in oldMessage, newMessage, and all of their properties
     * - Ex: For "buttonClick", IDs are checked in button, and all of its properties
     * 
     * Additionally, note that the namespace (unique name of the handler, e.g. "reactionroles") is passed to the callback as an extra argument.
     * This does not interfere or cause issues with vanilla discord.js code, and allows you to double-check the namespace in your code.
     * The IDs that were found in the event data are also passed to the callback as the final argument.
     * Namespaces must be unique. For example, two "message" hooks cannot have the same namespace specified.
     * 
     * Hooks are saved in storage and are automatically loaded when the bot is restarted.
     */
    hooks = {
        /**
         * Creates a new dynamic event ("hook"). Hooks are dynamic event handlers that only trigger if specific IDs are found in event data.
         * Runs the specified callback if all IDs specified by hooks#add() for this namespace are found in the structure of the event data.
         * @param {String} event - The event to listen for and handle.
         * @param {String} namespace - A unique identifier representing the name and/or purpose of this specific handler.
         * @param {Function} callback - A callback function that will be called if the event is triggered, and if ID conditions are met.
         */
        on: (event, namespace, callback) => {
            this.client.on(event, this.hooks.run.bind(null, true, namespace, callback));
        },
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
        off: (removalEvent, namespace, callback) => {
            this.client.on(removalEvent, this.hooks.run.bind(null, false, namespace, (...args) => {
                this.hooks.remove(namespace, args[args.length - 1]?.[1]);
                callback(...args.slice(0, args.length - 1), args[args.length - 1]?.[0]);
            }));
        },
        /**
         * Sets the IDs that will trigger the hooks#on() callback for a given namespace.
         * Overrides any existing IDs set for this namespace.
         * 
         * IDs provided normally as a String, Number, or any other data type will be required to trigger the event hook.
         * However, you can use special syntax to make certain IDs linked to each other. Only one of such linked IDs are required to be present.
         * For example, if the IDs passed in are "a", "b", and ["c","d"], then the hook will trigger if all of the following are true:
         * - id of "a" is present
         * - id of "b" is present
         * - id of "c" OR "d" is present
         * 
         * Any number of IDs can be linked to each other, and any number of IDs can be provided to this method.
         * IDs can be linked by passing in an array containing the IDs that are linked to each other, like so:
         * - In "a", "b", ["c","d"] -> "c" and "d" are linked
         * Alternatively, IDs can be linked by separating them with a double-colon in a single string, like so:
         * - In "a", "b", "c::d::e" -> "c", "d", and "e" are linked
         * 
         * @param {String} namespace - The namespace of the hook event handler to set the IDs of.
         * @param {...String} ids - The IDs to add for this namespace.
         */
        add: (namespace, ...ids) => {
            namespace = namespace.replace(/\./g, "_");
            
            let currentIds = this.client.setting(`hookEvents.${namespace}`) || {};
            let newIds = ids.map(id => Array.isArray(id) ? id.join("::") : id).join(",");
            if (!Object.keys(currentIds).some(idSet => idSet == newIds)) currentIds[newIds] = newIds;

            this.client.setting(`hookEvents.${namespace}`, currentIds);
            this.client.debug(`Added hook event for <${namespace}>`);
        },
        /**
         * Clears the IDs that will trigger the hooks#on() callback for a given namespace.
         * Once cleared, the hooks#on() callback will not be triggered (until hooks#add() is called again for this namespace).
         * @param {String} namespace - The namespace of the hook event handler to remove the IDs of.
         * @param {String[]} ids - A set of IDs to remove for this namespace.
         */
        remove: (namespace, ...ids) => {
            namespace = namespace.replace(/\./g, "_");

            for (let id of ids) {
                if (!id) continue;
                this.client.settings.Global().remove(`hookEvents.${namespace}.${id}`);
            }

            this.client.debug(`Removed hook event for <${namespace}>`);
        },
        /**
         * Runs the specified callback if all IDs specified by hooks#add() for this namespace are found in the structure of the event data.
         * This method is designed for internal use by hooks#on() and hooks#off(), though it could potentially be used or overridden by other code.
         * @param {Boolean} triggerLogs - Whether or not to trigger the debug logs for this method. True for hooks#on() and false for hooks#off().
         * @param {String} namespace - The namespace of the hook event handler, whose IDs will be searched for in the event data.
         * @param {Function} callback - The callback to run if ID conditions are met.
         * @param {...*} args - The arguments passed to the callback, representing the event data.
         */
        run: (triggerLogs, namespace, callback, ...args) => {
            const ids = this.hooks.getIDs(namespace);
            if (!ids) return;

            let idsFound = this.hooks.findIDs(ids, args);
            if (!idsFound) return;

            let [ foundIds ] = idsFound;

            if (triggerLogs) this.client.debug(`Running event hook for <${namespace}>...`);
            callback(...args, namespace, triggerLogs ? foundIds : idsFound);
        },
        /**
         * Gets the IDs that will trigger the hooks#on() callback for a given namespace.
         * Used mostly internally by hooks#run().
         * @param {String} namespace - The namespace of the hook event handler to get the IDs of.
         * @returns {String[]|null} An array of any number of IDs linked to the hooks#on() callback's event data for this namespace.
         */
        getIDs: (namespace) => {
            namespace = namespace.replace(/\./g, "_");

            let hooks = this.client.setting(`hookEvents.${namespace}`);
            if (!hooks) return null;
            
            return Object.keys(hooks).map(idSet => idSet.split(","));
        },
        /**
         * Finds whether the provided IDs exist anywhere within the provided arguments.
         * Used mostly internally by hooks#run().
         * @param {String[]} idSets - The sets of IDs to search for in the event data.
         * @param {...*} args - The arguments passed to the callback, representing the event data.
         */
        findIDs: (idSets, ...args) => {
            let foundIds = null;
            let foundIdSet = null

            for (let ids of idSets) {
                let idsFound = 0;
                let allIds = [];

                ids.forEach(id => {
                    if (id.match("::")) allIds = allIds.concat(id.split("::"));
                    else allIds.push(id);
                });

                allIds.forEach(id => {
                    let reg = new RegExp(`".*[iI][d]":("|)${id}("|)`, "gm");
                    let found = args.map(arg => JSON.stringify(arg)).some(arg => arg.match(reg));
                    if (found) idsFound++;
                });

                if (idsFound == ids.length) {
                    foundIds = allIds;
                    foundIdSet = ids.join(",");
                    break;
                }
            }

            return foundIds ? [foundIds, foundIdSet] : null;
        }
    }

    initialize() {

        const persistentEvents = this.client.setting("persistentEvents") || [];
        const scheduledEvents = this.client.setting("scheduledEvents") || [];

        // Initialize persistent events
        persistentEvents.forEach(p => {
            this.handlers.onPersist(p);
            this.client.debug(`Persistent listener <${p.name}> on event <${p.event}> has been initialized.`);
        });

        // Initialize scheduled events
        scheduledEvents.forEach(s => {
            this.handlers.onSchedule(s);
        });

        // No initialization needed for event hooks!

    }
}