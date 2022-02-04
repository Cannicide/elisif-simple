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

}

module.exports = ElisifToolkit;