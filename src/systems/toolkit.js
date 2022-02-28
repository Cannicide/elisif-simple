// Elisif-Simple Toolkit - A set of convenient utilities

const { fetch } = require("elisif");

const vm = require("vm");
class BoaFileReader extends Set {

    #lines;
    #i = 0;

    constructor(lines) {
        super(lines);
        this.#lines = lines;
    }

    read(chars = this.#lines.join("\n").length) {
        return this.#lines.join("\n").slice(0, chars);
    }

    readline() {
        return this.#lines[this.#i++];
    }

    readlines(num = this.#lines.length) {
        let lines = [];
        for (let i = 0; i < num; i++) {
            lines.push(this.readline());
        }
        return lines;
    }

}

const boaTypes = {

    str: class BoaString extends String {
        reverse() {
            return new BoaString(this.split("").reverse().join(""));
        }
        upper() {
            return new BoaString(this.toUpperCase());
        }
        lower() {
            return new BoaString(this.toLowerCase());
        }
        capitalize() {
            return new BoaString(this.slice(0, 1).toUpperCase() + this.slice(1));
        }
        title() {
            return new BoaString(this.split(" ").map(w => new BoaString(w).capitalize()).join(" "));
        }
        splitlines() {
            return this.split("\n").map(l => new BoaString(l));
        }
    },
  
    list: class BoaList extends Set {
  
        static NULL_ITEM = Symbol("boalist_nullitem");
        static APPEND_ITEM = "[::]";
        static REGEX_APPEND = "\\[::\\]";
        
        constructor(...items) {
            super(...items);
    
            let getIndex = (i) => {
            return [...this.values()][i] ?? undefined;
            }
    
            let setIndex = (i, v) => {
            let arr = [...this.values()];
            this.clear();
            if (v != BoaList.NULL_ITEM) arr[i] = v;
            else arr.splice(i, 1);
            for (let e of arr) this.add(e);
    
            return true;
            }
    
            this.proxy = new Proxy(this, {
            get(target, prop, receiver) {
                if (prop === Symbol.iterator) return function* () {
                for (let e of this.values()) yield e;
                }.bind(target);
                if (!isNaN(prop)) return getIndex(Number(prop));
                return Reflect.get(target, prop, receiver).bind(target);
            },
            set(target, prop, value, receiver) {
                if (!isNaN(prop)) return setIndex(Number(prop), value);
                return Reflect.get(target, prop, value, receiver).bind(target);
            }
            });
    
            return this.proxy;
        }
    
        static parseElement(e) {
            let res = e;
            try {
            res = JSON.parse(e);
            }
            catch {
            if (!isNaN(res)) res = Number(res);
            else if (e == "[undefined]") res = undefined;
            else if (e == "[null]") res = null;
            else if (e == "true" || e == "false") res = Boolean(e);
            }
    
            return res;
        }
    
        values() {
            return [...super.values()].map(e => typeof e == "string" ? e?.replace(new RegExp(BoaList.REGEX_APPEND, "gm"), "") : e).map(BoaList.parseElement);
        }
    
        add(item = "[undefined]") {
            if (item === null) item = "[null]";
            if (typeof item !== "string") item = JSON.stringify(item);
            while (this.has(item)) item += BoaList.APPEND_ITEM;
            return super.add(item);
        }
    
        toArray() {
            return [...this.values()];
        }
    
        append(item) {
            this.add(item);
            return this;
        }
    
        clear() {
            super.clear();
            return this;
        }
    
        copy() {
            return new BoaList(...this.values());
        }
    
        count(v) {
            return this.toArray().filter(e => e == v).length;
        }
    
        extend(iterable) {
            for (let e of iterable) {
            this.add(e);
            }
    
            return this;
        }
    
        index(v) {
            return this.toArray().findIndex(e => e == v);
        }
    
        insert(i, v) {
            let arr = this.toArray();
            arr.splice(i, 0, v)
            this.clear();
            return this.extend(arr);
        }
    
        pop(i) {
            let e = this.proxy[i];
            this.proxy[i] = BoaList.NULL_ITEM;
            return e;
        }
    
        remove(v) {
            let i = this.index(v);
            let e = undefined;
            if (i >= 0) e = this.pop(i);
            return e;
        }
    
        reverse() {
            let arr = this.toArray().reverse();
            this.clear();
            return this.extend(arr);
        }
    
        sort({ reverse = false, key = (e) => e }) {
            let arr = this.toArray().sort((a, b) => ("" + key(a)).localeCompare("" + key(b)));
            if (reverse) arr = arr.reverse();
            this.clear();
            return this.extend(arr);
        }
    
        toString() {
            return `[${this.toArray().map(e => e === undefined ? "None" : (e === true ? "True" : (e === false ? "False" : JSON.stringify(e)))).join(", ")}]`;
        }
    }   
}

class ElisifToolkit {

    constructor() {}

    /**
     * Asynchronous method to translate text into a given language.
     * Requires third-party package 'cheerio'.
     * @param {String} text - The text to translate.
     * @param {String} lang - The language to translate to.
     * @param {import("cheerio")} cheerio - A reference to the 'cheerio' module.
     * @returns Text translated to lang
     */
    translate(text, lang, cheerio) {

        return fetch(`https://www.google.com/search?q=translate+${text.replace(/ /g, "+")}+to+${lang.replace(/ /g, "+")}`)
        .then(res => res.text())
        .then(body => {
            let $ = cheerio.load(body);
            let translation = $(".MUxGbd.u31kKd.gsrt.lyLwlc").text();
            return translation;
        });

    }

    /**
     * Asynchronous method to convert a time between timezones.
     * Requires third-party package 'cheerio'.
     * @param {String} time - The time to convert.
     * @param {String} zoneA - The timezone to convert from (3-4 letter sequence - e.g. 'EST').
     * @param {String} zoneB - The timezone to convert to (3-4 letter sequence - e.g. 'CST').
     * @param {import("cheerio")} cheerio - A reference to the 'cheerio' module.
     * @returns Converted time in zoneB || "Google was unable to convert to that timezone."
     */
    timezone(time, zoneA, zoneB, cheerio) {

        return fetch(`https://google.com/search?q=convert+${time}+${zoneA}+to+${zoneB}`)
        .then(res => res.text())
        .then(body => {
            let $ = cheerio.load(body);
            let time = $(".BNeawe.iBp4i.AP7Wnd > div > .BNeawe.iBp4i.AP7Wnd").text().replace(/\s\w+,/g, "");

            if (time == "") time = "Google was unable to convert to that timezone.";
            return time;
        });

    }

    /**
     * A basic random number generator that accepts a range of min-max.
     * @param {Number} min - The minimum of the range to generate a random number from, inclusive.
     * @param {Number} max - The maximum of the range to generate a random number from, inclusive.
     * @returns Generated random number between min and max, both inclusive.
     */
    random(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Parses all unicode and discord emotes from a string and returns them in an array.
     * @param {String} str - The string to parse.
     * @returns {String[]} An array of all unicode and discord emotes in the string.
     */
    emotes(str) {
        const emotes = str.match(/<a?:.+?:\d{18}>|\p{Extended_Pictographic}/gu);
        return emotes;
    }

    /**
     * Parses a string and returns the nth detected unicode or discord emote.
     * @param {String} str - The string to parse.
     * @param {Number} n - The index of the emote to return, minimum of 0.
     * @returns {String} The nth detected unicode and discord emotes in the string.
     */
    emote(str, n) {
        return this.emotes(str)?.[n];
    }

    /**
     * Parses a string and returns it without any unicode or discord emotes.
     * @param {String} str - The string to parse.
     * @returns {String} The string without any unicode or discord emotes.
     */
    nonemotes(str) {
        return str.replace(/<a?:.+?:\d{18}>|\p{Extended_Pictographic}/gu, "").trim();
    }

    /**
     * Parses a string and returns it without the nth detected emote.
     * @param {String} str - The string to parse.
     * @param {Number} n - The index of the emote to remove, minimum of 0.
     * @returns {String} The string without the nth detected emote.
     */
    nonemote(str, n) {
        if (!this.emotes(str)) return str;
        return str.replace(new RegExp(this.emotes(str)[n]), "").trim();
    }

    /**
     * A simple way to debug any method.
     * Logs messages before and after the provided method is run, identifying whether the method works and what errors it may cause.
     * @param {Function} method - The method to run and debug.
     * @param  {...any} args - The arguments to pass to the 'method' function.
     */
    debug(method, ...args) {
        const methodName = method.name ?? "<anonymousFunction>";
        console.log(`[1/2] About to execute ${methodName}()...`);

        try {
            method(...args);
        }
        catch (e) {
            throw new Error(`[2/2] Error executing ${methodName}(): ${e.message}`);
        }

        console.log(`[2/2] Successfully executed ${methodName}() with no caught errors...`);
    }

    /**
     * Check the filesize of the EvG storage for a given client.
     * @param {import("../client/client")} client - The client to check the storage size of.
     * @returns The filesize of the EvG storage for the given client, in MB.
     */
    storageSize(client) {
        if (["db", "database"].includes(client.config("storage"))) {
            //Check size of SQLITE disk file
            return this.filesize(process.cwd() + "/json.sqlite");
        }
        else {
            //Check size of JSON storage file

            const fs = require('fs');
            let path = process.cwd() + "/node_modules/elisif/systems/storage";

            return fs.readdirSync(path).reduce((prev, curr) => prev + this.filesize(path + "/" + curr), 0);
        }
    }

    /**
     * Check the filesize of the file at the specified path. Does not work on directories.
     * @param {String} path - The absolute path to the file to check the size of.
     * @returns The filesize of the file at the specified path, in MB.
     */
    filesize(path) {
        const fs = require('fs');

        if (!fs.existsSync(path) || fs.statSync(path).isDirectory()) return 0;
        let size = fs.statSync(path).size;

        if (size < 1024) return size + " B";
        if (size < 1048576) return (size / 1024).toFixed(2) + " KB";
        if (size < 1073741824) return (size / 1048576).toFixed(2) + " MB";
        if (size < 1099511627776) return (size / 1073741824).toFixed(2) + " GB";
        return (size / 1099511627776).toFixed(2) + " TB";
        
        // if (size < 1125899906842624) return (size / 1099511627776).toFixed(2) + " TB";
        // if (size < 1152921504606846976) return (size / 1125899906842624).toFixed(2) + " PB";
        // if (size < 1180591620717411303424) return (size / 1152921504606846976).toFixed(2) + " EB";
        // if (size < 1208925819614629174706176) return (size / 1180591620717411303424).toFixed(2) + " ZB";
        // if (size < 1237940039285380274899124224) return (size / 1208925819614629174706176).toFixed(2) + " YB";

    }

    /**
     * Returns percent of string similarity based on Levenshtein Distance.
     * Code taken directly from https://stackoverflow.com/a/36566052/6901876.
     * @param {String} s1 - The first string to compare.
     * @param {String} s2 - The second string to compare.
     * @returns The percent of similarity between the two strings.
     */
    similarity(s1, s2) {
        function editDistance(s1, s2) {
            s1 = s1.toLowerCase();
            s2 = s2.toLowerCase();
          
            var costs = new Array();
            for (var i = 0; i <= s1.length; i++) {
              var lastValue = i;
              for (var j = 0; j <= s2.length; j++) {
                if (i == 0)
                  costs[j] = j;
                else {
                  if (j > 0) {
                    var newValue = costs[j - 1];
                    if (s1.charAt(i - 1) != s2.charAt(j - 1))
                      newValue = Math.min(Math.min(newValue, lastValue),
                        costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                  }
                }
              }
              if (i > 0)
                costs[s2.length] = lastValue;
            }
            return costs[s2.length];
        }

        var longer = s1;
        var shorter = s2;
        if (s1.length < s2.length) {
            longer = s2;
            shorter = s1;
        }
        var longerLength = longer.length;
        if (longerLength == 0) {
            return 1.0;
        }
        return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
    }

    /**
     * Returns the provided array of Strings, sorted based on similarity to the provided string
     * @param {String[]} strs - Array of Strings to compare to cStr.
     * @param {String} cStr - The string to compare against the array of Strings.
     * @param {Number|"dynamic"} [rThreshold] - Number 0.0-1.0 percent similarity that all returned Strings must be compared to cStr. Strings below this threshold in similarity will not be returned
     * @param {Number} [sThreshold] - Number 0.0-1.0 percent similarity that guarantees only one string is returned.
     */
    sortedSimilar(strs, cStr, rThreshold = 0.0, sThreshold) {
        let res = strs.filter(s => {
            let threshold = rThreshold;
            if (rThreshold == "dynamic") threshold = cStr.length / s.length - 0.1;
            if (threshold > 1) threshold = 0.9;

            return this.similarity(s, cStr) > threshold;
        }).sort((s1, s2) => {
            return this.similarity(s1, cStr) - this.similarity(s2, cStr);
        });
        
        if (sThreshold !== null) {
            let sRes = res.filter(s => this.similarity(s, cStr) > sThreshold);
            if (sRes.length > 0) res = [sRes[0]];
        }

        return res;
    }

    /**
     * An assortment of highly simplified utilities, inspired by but not identical to python's standard methods.
     */
    get boa() {
        const GLOBALS = new Map();
        Object.keys(global).forEach(key => GLOBALS.set(key, global[key]));

        return {
            globals: GLOBALS,
            open(filePath, action = "rt", opts = null) {
                const fs = require("fs");
                if (action.match("t")) opts = "utf-8";
                
                if (action.startsWith("r")) {
                    const contents = fs.readFileSync(filePath, opts);

                    //Read file line by line
                    const gen = contents.toString().split("\n");
                    return new BoaFileReader(gen);
                }
                else if (action.startsWith("w")) {
                    return {
                        write(content) {
                            fs.writeFileSync(filePath, content, opts);
                        }
                    };
                }
                else if (action.startsWith("a")) {
                    return {
                        write(content) {
                            fs.appendFileSync(filePath, content, opts);
                        }
                    };
                }
                else if (action.startsWith("x")) {
                    fs.writeFileSync(filePath, "", opts);
                    return this.open(filePath, "a", opts);
                }
                else if (action.startsWith("d")) {
                    return {
                        remove() {
                            fs.unlinkSync(filePath);
                        }
                    };
                }
                else throw new Error("Invalid file-opening action: " + action);
            },
            async context(f, sandbox = {}) {
                for (let key of this.globals.keys()) {
                    sandbox[key] = this.globals.get(key);
                }
                
                sandbox.boa = this;
                sandbox.console = console;
                sandbox.require = require;
          
                await vm.runInNewContext(`(${f.toString()})();`, sandbox, 'boa.vm');
          
                delete sandbox.boa;
                delete sandbox.console;
                delete sandbox.require;
                Object.keys(global).forEach(key => delete sandbox[key]);
                return sandbox;
            },
            promise(f, sandbox = {}) {
                return new Promise((resolve, reject) => {
                    sandbox.resolve = resolve;
                    sandbox.reject = reject;
          
                    this.context(f, sandbox);
                });
            },
            min(...items) {
                items = items.flat(3);
                return Math.min(...items.filter(item => item !== null && !isNaN("" + item)));
            },
            max(...items) {
                items = items.flat(3);
                return Math.max(...items.filter(item => item !== null && !isNaN("" + item)));
            },
            sum(...items) {
                items = items.flat(3);
                return items.reduce((prev, curr) => prev + curr, 0);
            },
            reversed(item) {
                if (typeof item === "string") return item.split("").reverse().join("");
                if (item instanceof Set) item = [...item.values()];
                if (Array.isArray(item)) return item.slice().reverse();
                
                return item;
            },
            enumerate(item) {
                if (item instanceof Set) item = [...item.values()];
                if (typeof item === "string") item = item.split("");
                if (Array.isArray(item)) return item.map((e, i) => [i, e]);
                
                return item; 
            },
            range(start, end) {
                if (start === undefined) return [];
                if (end === undefined) {
                    end = start;
                    start = 0;
                }
                if (end < start) return [];
                return [...Array(end - start).keys()].map(i => i + start);
            },
            len(item) {
                if (item === null) return -1;
                if (typeof item === 'number') item = "" + item;
                if (item.length !== undefined) return item.length;
                if (item.size !== undefined) return item.size;

                return -1;
            },
            tuple(...items) {
                let array = items.slice();
                array.toString = () => `(${array.join(", ")})`;
                let frozenArray = Object.freeze(array);
                return frozenArray;
            },
            use(f, sandbox = {}) {
                function binder(s,x){ if (typeof s === "function")return s.bind(x);else return s; }
              
                Object.keys(this).forEach(key => sandbox[key] = binder(this[key], this));
                return this.context(f, sandbox);
            },
            wait(f, ms) {
                if (typeof f === 'number') [ms, f] = [f, ms];
                return new Promise(resolve => setTimeout(() => resolve(f?.()), ms));
            },
            repeat(f, ms) {
                if (typeof f === 'number') [ms, f] = [f, ms];
                let intv;
                return new Promise(resolve => {
                    intv = setInterval(() => f?.(intv), ms);
                    resolve(intv);
                });
            },
            queue(f) {
                return new Promise(resolve => setImmediate(() => resolve(f?.())));
            },
            print(...items) {
                return console.log(...items.map(i => i?.toString()));
            },
            input(prompt1) {
                const readline = require("readline");
                const {stdin, stdout} = require("process");
                const rl = readline.createInterface({ input:stdin, output:stdout });
          
                prompt1 += " > ";
                
                return this.promise(() => rl.question(prompt1, (answer) => { rl.close(); resolve(answer); }), { prompt1, rl });
            },
            str(any) {
                return new boaTypes.str(any);
            },
            list(...anys) {
                return new boaTypes.list(...anys);
            },
            True: true,
            False: false,
            int(any) {
                let i = Number(any);
                return Math.floor(i);
            },
            float(any) {
                return Number(any);
            },
            emitter(emitter = new (require("events"))()) {
                const f = emitter.on.bind(emitter);
                emitter.on = (eventName, listener) => {
                    if (typeof eventName === 'function') [eventName, listener] = [eventName.name, eventName];
                    return f(eventName, listener);
                };
          
                return new Proxy(emitter, {
                    get(target, prop, receiver) {
                        if (prop.startsWith("on") && !prop.endsWith("on")) return target.emit.bind(target, prop.split("on").slice(1).join(""));
                        return Reflect.get(target, prop, receiver).bind(target);
                    },
                    set(target, prop, value, receiver) {
                        if (prop.startsWith("on") && !prop.endsWith("on")) return f(prop.split("on").slice(1).join(""), value);
                        return Reflect.set(target, prop, value, receiver).bind(target);
                    }
                });
            },
            dict(obj = {}) {
                const map = obj instanceof Map ? obj : new Map(Object.keys(obj).map(k => [k, obj[k]]));
                
                return new Proxy(map, {
                    get(target, prop, receiver) {
                        if (!(prop in map)) return map.get(prop);
                        return Reflect.get(target, prop, receiver).bind(target);
                    },
                    set(target, prop, value, receiver) {
                        if (!(prop in map)) return map.set(prop, value);
                        return Reflect.set(target, prop, value, receiver).bind(target);
                    }
                });
            }
        };
    }

}

module.exports = new ElisifToolkit();