// Represents a command that can easily be defined via command syntax (supports both text and slash commands)
// Partially inspired by the syntax of the `commander` npm module for cli

const { parser, builder, TYPES } = require("./CommandSyntaxUtility");
const { ElisifSet } = require("elisif/util/CollectionUtility");
const { SlashCommand } = require("elisif");

class FinalizedSyntaxCommand {

    constructor(providedBuilder) {
        this.builder = providedBuilder;
        this.built = providedBuilder.build();

        this.toSlashCommand();
    }

    /**
     * Parses the values of all command arguments, given the syntax of the command and the specified command usage string.
     * @param {String} str - The full command that has been used. Argument values are parsed from this string.
     * @returns {{args: ElisifSet, flags: ElisifSet}} The parsed values of the command arguments and flags.
     */
    parseValues(str) {
        if (Array.isArray(str)) str = str.join(" ");
        return parser.parse(this.toSyntax(), str).values;
    }

    /**
     * Parses argument and flag values from the given command usage string, and calls the command's associated action with these values.
     * @param {String} str - The full command that has been used. Argument values are parsed from this string. 
     * @param {*} interaction - The modified CommandInteraction object (Node-Elisif's utilities modify this object with custom properties).
     * @returns The result of the command's action.
     */
    parse(str, interaction) {
        return this.built.callAction(this.parseValues(str), interaction);
    }

    /**
     * Returns the built syntax string of this SyntaxCommand.
     */
    toSyntax() {
        return this.built.syntax;
    }

    /**
     * Alias of the toSyntax() method, overriding the default toString() method.
     */
    toString() {
        return this.toSyntax();
    }

    /**
     * Builds and returns a SlashCommand based on the built syntax of this SyntaxCommand.
     * @returns SlashCommand
     */
    toSlashCommand() {

        const factory = new SlashCommand.SlashCommandBuilder();

        const components = parser.components(this.toSyntax());
        let args = new ElisifSet(...components).filter(comp => comp.type != "flag").toArray();
        let [ perms, roles ] = this.built.requires.partition(req => req.perm);

        factory.setName(args[0].name)
        .setDescription(args[0].desc)
        .setGuilds(this.built.guilds.toArray())
        .setChannels(this.built.channels.size > 0 ? this.built.channels.toArray() : undefined)
        .setPerms(perms.map(perm => perm.value))
        .setRoles(roles.size > 0 ? roles.map(role => role.value) : undefined)
        .setMethod(interaction => this.parse(`“${interaction.label}” ` + interaction.flatArgs.map(arg => `“${arg}”`).join(" "), interaction));

        let currentSubCommand = undefined;

        args.shift();
        args.forEach(arg => {
            let type;
            let plant = currentSubCommand ?? factory;
            
            if (arg.type == "command") type = factory.addSubCommand.bind(factory);
            else if (arg.name == "channel") type = plant.addChannelArg.bind(plant);
            else if (arg.name == "user") type = plant.addUserArg.bind(plant);
            else if (["boolean", "bool", "true", "false"].includes(arg.name)) type = plant.addBooleanArg.bind(plant);
            else if (arg.name == "role") type = plant.addRoleArg.bind(plant);
            else if (arg.name == "mention" || arg.name == "mentionable") type = plant.addMentionArg.bind(plant);
            else if (["num", "number", "float"].includes(arg.name)) type = plant.addFloatArg.bind(plant);
            else if (["int", "integer", "intg"].includes(arg.name)) type = plant.addIntegerArg.bind(plant);
            else type = plant.addStringArg.bind(plant);

            type(argument => {
                argument.setName(arg.name)
                .setDescription(arg.desc);

                if (arg.type != "command") argument.setOptional(arg.optional);
                else currentSubCommand = argument;

                if (this.built.choices.has(arg.name)) argument.addChoices(this.built.choices.get(arg.name));
                if (arg.choices && Array.isArray(arg.choices)) argument.addChoices(arg.choices);
                return argument;
            });

        });

        return factory.build();

    }

}

class FinalizedSyntaxContextMenu extends FinalizedSyntaxCommand {

    /**
     * Parses the target of the context menu command and returns them as if they were parsed "arguments" of a SlashCommand.
     * @param {*} interaction - The modified ContextMenuInteraction object (Node-Elisif's utilities modify this object with custom properties).
     * @returns {{args: ElisifSet, flags: ElisifSet}} The parsed values of the command arguments and flags.
     */
     parseValues(interaction) {
        return {
            args: new ElisifSet(...Object.keys(interaction.target).filter(key => key != "null").map(key => ({ name: key, value: interaction.target[key] }))),
            flags: new ElisifSet()
        };
    }

    /**
     * 
     * @param {*} interaction - The modified ContextMenuInteraction object (Node-Elisif's utilities modify this object with custom properties).
     * @returns The result of the command's action.
     */
    parse(interaction) {
        return this.built.callAction(this.parseValues(interaction), interaction);
    }

    /**
     * Returns the built syntax string of this SyntaxCommand.
     */
    toSyntax() {
        return null;
    }

    /**
     * Builds and returns a SlashCommand based on the built syntax of this SyntaxCommand.
     * @returns SlashCommand
     */
     toSlashCommand() {

        const factory = new SlashCommand.SlashCommandBuilder();
        let [ perms, roles ] = this.built.requires.partition(req => req.perm);

        factory.setName(this.built.command)
        .setType(this.built.type)
        .setGuilds(this.built.guilds.toArray())
        .setChannels(this.built.channels.size > 0 ? this.built.channels.toArray() : undefined)
        .setPerms(perms.map(perm => perm.value))
        .setRoles(roles.size > 0 ? roles.map(role => role.value) : undefined)
        .setMethod(interaction => this.parse(interaction));

        return factory.build();

    }

}

class SyntaxCommand {

    static SyntaxFullArgument = class SyntaxFullArgument {
        
        #name;
        #description;
        #parser;
        #choices = new ElisifSet();
        #defaults = new ElisifSet();
        #subcommand;

        name(name) {
            this.#name = name;
            return this;
        }

        description(description) {
            this.#description = description;
            return this;
        }

        /**
         * @param {Function} parser - A custom parser function to parse the argument before acting on it.
        */
        parser(parser) {
            this.#parser = parser;
            return this;
        }

        choice(...choices) {
            choices.forEach(choice => this.#choices.add(choice));
            return this;
        }

        default(...defaults) {
            defaults.forEach(defaultValue => this.#defaults.add(defaultValue));
            return this;
        }

        setSubcommand(subcommand) {
            this.#subcommand = subcommand;
            return this;
        }

        buildFullArgument() {
            return {
                name: this.#name,
                description: this.#description,
                parser: this.#parser,
                choices: this.#choices.toArray(),
                defaults: this.#defaults.toArray(),
                subcommand: this.#subcommand
            };
        }

    }

    constructor(builder) {
        this.builder = builder;
    }

    #build() {
        return new FinalizedSyntaxCommand(this.builder);
    }

    /**
     * Sets the description of the command being built.
     * @param {String} description - The description of the command.
     * @returns 
     */
     description(description) {
        this.builder.setDescription(description);
        return this;
    }

    /**
     * Adds a full argument, with extra customizable options such as parser and defaults, to the command being built.
     * @param {Function} method - A method, accepting SyntaxFullArgument as a parameter, that will be called to build the full argument.
     * @returns
     */
    fullArgument(method) {
        const builtArgument = method(new SyntaxCommand.SyntaxFullArgument()).buildFullArgument();
        this.builder.addArgument(builtArgument.name, builtArgument.description, builtArgument.choices, builtArgument.parser, builtArgument.defaults);
        return this;
    }

    /**
     * Adds an argument to the command being built.
     * @param {String} argName - The name of the argument to add to the command.
     * @param {String} [description] - The description of the argument.
     * @param {String[]} [choices] - A set of choices for the value of the argument.
     * @returns 
     */
    argument(argName, description, choices) {
        if (Array.isArray(description)) [description, choices] = [choices, description];
        if (typeof description !== 'string') description = undefined;

        this.builder.addArgument(argName, description, choices);
        return this;
    }

    /**
     * Adds multiple arguments to the command, subcommandgroup, or subcommand being built.
     * Either simple arg names and/or SyntaxCommand#fullArgument()-style methods can be provided.
     * Argument descriptions cannot be provided when using this method.
     * @param {String[]} argNames - The names of the arguments to add to the command.
     * @returns 
     */
    arguments(argNames) {
        argNames = argNames.map(arg => arg.split(";")[0]); //Remove attempts to add descriptions
        argNames.forEach(argName => typeof argName == "function" ? this.fullArgument(argName) : this.argument(argName));
        return this;
    }

    /**
     * Adds a required permission or role to the command.
     * Role names that conflict with permissions (i.e. "ADMINISTRATOR") can be differentiated using "@" (e.g. "@Administrator").
     * @param {String} permission - The permission or role name to add to the command.
     * @returns
     */
    require(permission) {
        this.builder.addRequire(permission);
        return this;
    }

    /**
     * Adds multiple required permission or role to the command.
     * Role names that conflict with permissions (i.e. "ADMINISTRATOR") can be differentiated using "@" (e.g. "@Administrator").
     * @param {String[]} permissions - The permissions and/or role names to add to the command.
     * @returns
     */
    requires(permissions) {
        permissions.forEach(permission => this.builder.addRequire(permission));
        return this;
    }

    /**
     * Defines a channel that the command can be used in.
     * Do not use this method if you want the command to be used in any channel.
     * @param {String} channel - The ID or name of the channel.
     * @returns
     */
    channel(channel) {
        this.builder.addChannel(channel);
        return this;
    }

    /**
     * Defines multiple channels that the command can be used in.
     * Do not use this method if you want the command to be used in any channel.
     * @param {String[]} channels - The IDs and/or names of the channels.
     * @returns
     */
    channels(channels) {
        channels.forEach(channel => this.builder.addChannel(channel));
        return this;
    }

    /**
     * Defines a guild that the command can be used in.
     * Do not use this method if you want the command to be used in any guild.
     * @param {String} guild - The ID or name of the guild.
     * @returns
     */
    guild(guild) {
        this.builder.addGuild(guild);
        return this;
    }

    /**
     * Defines multiple guilds that the command can be used in.
     * Do not use this method if you want the command to be used in any guild.
     * @param {String[]} guilds - The IDs and/or names of the guilds.
     * @returns
     */
    guilds(guilds) {
        guilds.forEach(guild => this.builder.addGuild(guild));
        return this;
    }

    /**
     * Defines a method to execute when the command is executed.
     * The callback method accepts parameters for each individual argument, plus a final flags parameter (in object literal form).
     * @param {(interaction, ...args, flags) => void} method - The method to execute when the command is executed.
    */
    action(method) {
        this.builder.setAction(method);
        return this.#build();
    }

}

class SyntaxContextMenu extends SyntaxCommand {

    #build() {
        return new FinalizedSyntaxContextMenu(this.builder);
    }

    /**
     * Sets the type of context menu this command represents.
     * @param {"user"|"message"} type - The type of context menu this command represents. Case insensitive.
     * @returns
     * @throws If the type is not "user" or "message".
     */
    type(type) {
        if (!["USER", "MESSAGE"].includes(type.toUpperCase())) throw new Error(`Invalid context menu type: ${type}. Type must be 'USER' or 'MESSAGE'.`);
        this.builder.setType(type.toUpperCase());
        return this;
    }

    /**
     * **Warning: Context Menu Commands do not support descriptions.**
     * @param {String} description - The description of the command.
     * @deprecated
     * @returns 
     */
     description(description) {
        console.warn("Context Menu Commands do not support descriptions.");
        return this;
    }

    /**
     * **Warning: Context Menu Commands do not support arguments.**
     * @param {Function} method - A method, accepting SyntaxFullArgument as a parameter, that will be called to build the full argument.
     * @deprecated
     * @returns
     */
    fullArgument(method) {
        console.warn("Context Menu Commands do not support arguments.");
        return this;
    }

    /**
     * **Warning: Context Menu Commands do not support arguments.**
     * @param {String} argName - The name of the argument to add to the command.
     * @param {String} [description] - The description of the argument.
     * @param {String[]} [choices] - A set of choices for the value of the argument.
     * @deprecated
     * @returns 
     */
    argument(argName, description, choices) {
        console.warn("Context Menu Commands do not support arguments.");
        return this;
    }

    /**
     * **Warning: Context Menu Commands do not support arguments.**
     * @param {String[]} argNames - The names of the arguments to add to the command.
     * @deprecated
     * @returns 
     */
    arguments(argNames) {
        console.warn("Context Menu Commands do not support arguments.");
        return this;
    }

    /**
     * Defines a method to execute when the command is executed.
     * The callback method accepts parameters for each individual argument, plus a final flags parameter (in object literal form).
     * @param {(interaction, ...args, flags) => void} method - The method to execute when the command is executed.
    */
     action(method) {
        this.builder.setAction(method);
        return this.#build();
    }

}

class SyntaxProgram {

    constructor() {
        this.builder = undefined;
    }

    setClient(client) {
        this.client = client;
        return this;
    }

    /**
     * Creates a new command.
     * @param {String} commandName - The name of the command to add, or the name of the command plus basic arguments specified.
     * @param {String} [description] - The optional description of the command.
     * @returns {SyntaxCommand}
     */
     command(commandName, description) {
        this.builder = new builder();
        this.builder.setCommand(commandName, description, TYPES.COMMAND);
        return new SyntaxCommand(this.builder);
    }

    /**
     * Creates a new context menu command.
     * @param {String} commandName - The name of the context menu command to add.
     * @returns {SyntaxContextMenu}
     */
    contextmenu(commandName) {
        this.builder = new builder();
        this.builder.setCommand(commandName, null, TYPES.COMMAND);
        return new SyntaxContextMenu(this.builder);
    }

}

module.exports = {
    SyntaxProgram,
    SyntaxCommand
}