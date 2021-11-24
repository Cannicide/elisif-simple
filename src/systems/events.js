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

    initialize() {

        const persistentEvents = this.client.setting("persistentEvents") || [];
        const scheduledEvents = this.client.setting("scheduledEvents") || [];

        persistentEvents.forEach(p => {
            this.handlers.onPersist(p);
            this.client.debug(`Persistent listener <${p.name}> on event <${p.event}> has been initialized.`);
        });

        scheduledEvents.forEach(s => {
            this.handlers.onSchedule(s);
        });

    }
}