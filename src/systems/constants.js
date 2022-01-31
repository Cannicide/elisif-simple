// Elisif-Simple Constants System - Easily keep track of, get, and set constants for your bot!

class Constants extends Map {

    constructor() {
        super();
    }

    /**
     * Set a Constant of the specified key to the specified value.
     * Constant keys cannot have the same name as any properties of Maps (get, set, etc.), and cannot be named "constructor" or "prototype"
     * @param {String} key - The key (name) of the Constant to set. Must be a String.
     * @param {*} value - The value of the Constant to set. Can be any datatype.
     */
    set(key, value) {

        if (typeof key !== "string") throw new Error("Constants key must be a string!");
        if (typeof value === "undefined") throw new Error("Constants value must be defined!");

        //Prevent key from being the name of any property of Map:
        if (key.toLowerCase() === "set") throw new Error("Constants key cannot be named \"set\"!");
        if (key.toLowerCase() === "get") throw new Error("Constants key cannot be named \"get\"!");
        if (key.toLowerCase() === "has") throw new Error("Constants key cannot be named \"has\"!");
        if (key.toLowerCase() === "delete") throw new Error("Constants key cannot be named \"delete\"!");
        if (key.toLowerCase() === "clear") throw new Error("Constants key cannot be named \"clear\"!");
        if (key.toLowerCase() === "size") throw new Error("Constants key cannot be named \"size\"!");
        if (key.toLowerCase() === "keys") throw new Error("Constants key cannot be named \"keys\"!");
        if (key.toLowerCase() === "values") throw new Error("Constants key cannot be named \"values\"!");
        if (key.toLowerCase() === "entries") throw new Error("Constants key cannot be named \"entries\"!");
        if (key.toLowerCase() === "forEach") throw new Error("Constants key cannot be named \"forEach\"!");
        if (key.toLowerCase() === "constructor") throw new Error("Constants key cannot be named \"constructor\"!");
        if (key.toLowerCase() === "prototype") throw new Error("Constants key cannot be named \"prototype\"!");

        super.set(key, value);
        this[key] = value;

        return this;

    }

    /**
     * Load the provided JSON data (or path to JSON data) into this Constants Map.
     * @param {String|Object} dataOrPath - The JSON data (or path to a JSON file) to load into this Constants Map.
     */
    load(dataOrPath) {

        if (typeof dataOrPath === "string") {
            dataOrPath = require("fs").readFileSync(dataOrPath);
        }

        let data = JSON.parse(dataOrPath);
        for (let key in data) {
            this.set(key, data[key]);
        }

    }

}


module.exports = Constants