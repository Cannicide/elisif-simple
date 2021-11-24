// Elisif-Simple Toolkit - A set of convenient utilities

const { fetch } = require("elisif");

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

}

module.exports = ElisifToolkit;