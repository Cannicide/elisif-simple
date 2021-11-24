const { util } = require("elisif");
const defaults = require("./config_defaults");

class ElisifConfig {

    /**
     * The data associated with this config.
     * Mostly used for internal purposes.
     * @private
     */
    data = Object.assign({}, defaults);

    constructor(data) {
        if (data) this.data = data;
    }

    /**
     * Clears this config's data.
     * Can be used to reuse the same Config instance for two different clients.
     * @returns {this} ElisifConfig
     */
    clear() {
        this.data = Object.assign({}, defaults);
        return this;
    }

    /**
     * Sets the name of your bot.
     * @param {String} name 
     * @returns {this} ElisifConfig
     */
    name(name) {
        this.data.name = name;
        return this;
    }

    /**
     * Sets the intents of your bot. One intent or an array of intents can be provided.
     * Can be called multiple times, if necessary.
     * @param {String|Number|String[]|Number[]} intentOrArray - The intents to set. Intents can be in String, Number, or Enum form (all of the above are internally converted into the proper Enum types).
     * @returns {this} ElisifConfig
     */
    intents(intentOrArray) {
        if (!Array.isArray(intentOrArray)) {
            intentOrArray = [intentOrArray];
        }

        const rawIntents = util.intentsToEnums(intentOrArray);
        const intents = rawIntents.map((intent, index) => intent ? intent : intentOrArray[index]);

        this.data.intents = this.data.intents.concat(intents);
        return this;
    }

    /**
     * Sets the presence activities of your bot. If multiple activities are provided, they will be cycled through in order and for the specified duration.
     * Can be called multiple times, if necessary.
     * @param {String|String[]} presenceOrArray - The activity or activities to set, in String form.
     * @param {Number} [duration] - The duration of each presence activity before cycling to the next, in minutes. Defaults to 10 minutes.
     * @returns {this} ElisifConfig
     */
    presences(presenceOrArray, duration = this.data.duration) {
        if (!Array.isArray(presenceOrArray)) {
            presenceOrArray = [presenceOrArray];
        }

        this.data.presences = this.data.presences.concat(presenceOrArray);
        this.data.presenceDuration = duration;
        return this;
    }

    /**
     * Sets the twitch URL of your bot's presence.
     * @param {String} twitchURL - Your twitch URL. Defaults to Cannicide's twitch URL (Cannicide does not stream).
     * @returns {this} ElisifConfig
     */
    twitch(twitchURL) {
        this.data.twitch = twitchURL;
        return this;
    }

    // Prefix option currently disabled due to Elisif-Simple only fully supporting slash commands.
    // /**
    //  * Sets the command prefix of your bot.
    //  * @param {String} prefix - The prefix to set. Defaults to "/".
    //  * @returns {this} ElisifConfig
    //  */
    // prefix(prefix) {
    //     this.data.prefix = prefix;
    //     return this;
    // }

    /**
     * Sets the port to run your bot's webserver on.
     * @param {Number} port - The port to run your bot's webserver on. Defaults to 8080.
     * @returns {this} ElisifConfig
     */
    port(port) {
        this.data.port = port;
        return this;
    }

    /**
     * Adds an author of your bot to the config. Can be called multiple times to add multiple authors.
     * @param {String} username - The username of the author to add.
     * @param {String} [id] - The optional user ID of the author to add. Can be used internally to, for example, set access to the eval command.
     * @returns {this} ElisifConfig
     */
    author(username, id) {
        this.data.authors.push({username, id});
        return this;
    }

    /**
     * Set a description for your bot. Can be used internally for a few purposes.
     * @param {String} description - The description to set.
     * @returns {this} ElisifConfig
     */
    description(description) {
        this.data.description = description;
        return this;
    }

    /**
     * Enables the specified Node-Elisif expansion. Can be called multiple times to enable multiple expansions.
     * Expansions allow you to effortlessly add pre-made commands and features to your bot.
     * @param {String} name - The name of the expansion to enable.
     * @param {Object} [options] - The optional options/settings for the expansion.
     * @returns {this} ElisifConfig
     */
    expansion(name, options) {
        this.data.expansions.enable.push(name);
        this.data.expansions[name] = options;
    }

    /**
     * Sets a guild channel to log certain error messages in. This will presumably be a channel in your bot's dev/testing/support server.
     * If this method is not used, the few error messages that would usually be sent to this log channel will be sent in the Console instead.
     * 
     * @param {String} guildID - The ID of the guild to log errors in.
     * @param {String} channelName - The name of the channel to log errors in.
     * @returns {this} ElisifConfig
     */
    logger(guildID, channelName) {
        this.data.logs = {
            guildID,
            channelName
        };
        return this;
    }

    /**
     * Sets a discord.js-specific Client option. Such options would usually be configured within discord.js' default Client constructor, but are moved to the ElisifConfig in Elisif-Simple.
     * @param {String} option - The name of the option to set.
     * @param {String} value - The value to set for the option.
     * @returns {this} ElisifConfig
     */
    djsOption(option = "UNKNOWN", value = "UNKNOWN") {

        this.data.djsOptions[option] = value;
        return this;

    }

    /**
     * Sets a node-elisif-specific Client option. Such options would usually be configured within node-elisif's default Client constructor, but are moved to the ElisifConfig in Elisif-Simple.
     * Most Node-Elisif options have unique methods in the ElisifConfig, but this method can be used to configure those that don't.
     * @param {String} customOption - The name of the option to set.
     * @param {String} value - The value to set for the option.
     * @returns {this} ElisifConfig
     */
    custom(customOption = "UNKNOWN", value = "UNKNOWN") {
        
        this.data[customOption] = value;
        return this;

    }

    /**
     * Sets the type of storage to use for all Elisif-Simple data. This includes persistent Client and Guild settings, persistent events, scheduled functions, and any data you want to persistently store for your bot.
     * @param {"json"|"database"|"db"} type - The type of EvG storage to use. Can be an SQLITE database or JSON file. Defaults to JSON.
     * @returns {this} ElisifConfig
     */
    storage(type = "json") {
        this.data.storage = type;
        return this;
    }

    /**
     * Enables debug mode. This will enable certain additional Node-Elisif and Elisif-Simple logging, which were made to easily debug issues in this package.
     * Running this method enables debug mode. The 'catchErrors' option does not need to be true in order to enable debug mode.
     * You can also create logs that are only sent when debug mode is enabled, using `client.debug(...messages)`. This makes it easy to quickly switch between debugging and production-ready code.
     * @param {Boolean} [catchErrors] - Whether or not to catch and log uncaught errors. Defaults to false. If true, uncaught errors will be logged to the console and will trigger the '@error' custom event before ending the process (allowing you to create custom error handling/messages).
     * @returns {this} ElisifConfig
     */
    debug(catchErrors = false) {
        this.data.debug = true;
        this.data.uncaughtErrors = catchErrors;

        return this;
    }

}

module.exports = ElisifConfig;