// Represents a command that can easily be defined via command syntax (supports both text and slash commands)
// Partially inspired by the syntax of the `commander` npm module for cli

const SyntaxBuilder = require("./SyntaxBuilder");
const { ElisifSet } = require("elisif/util/CollectionUtility");
const { SlashCommand } = require("elisif");

class FinalizedSyntaxCommand {

    constructor(providedBuilder) {
        this.builder = providedBuilder;
        this.built = providedBuilder.build();

        this.toSlashCommand();
    }

    /**
     * Builds and returns a SlashCommand based on the built syntax of this SyntaxCommand.
     * @returns SlashCommand
     */
    toSlashCommand() {

        const factory = new SlashCommand.SlashCommandBuilder();

        let args = this.built.arguments;
        let [ perms, roles ] = this.built.requires.partition(req => req.perm);

        factory.setName(this.built.command)
        .setDescription(this.built.description)
        .setGuilds(this.built.guilds.toArray())
        .setChannels(this.built.channels.size > 0 ? this.built.channels.toArray() : undefined)
        .setPerms(perms.map(perm => perm.value))
        .setRoles(roles.size > 0 ? roles.map(role => role.value) : undefined)
        .setMethod(interaction => this.built.callAction(SyntaxBuilder.TYPES.COMMAND, interaction));

        const argumentHandler = (arg, origplant) => {
            let type;
            let plant = origplant ?? factory;
            
            if (arg.type == "command") type = factory.addSubCommand.bind(factory);
            else if (arg.datatype.toLowerCase() == "channel") type = plant.addChannelArg.bind(plant);
            else if (arg.datatype.toLowerCase() == "user") type = plant.addUserArg.bind(plant);
            else if (["boolean", "bool"].includes(arg.datatype.toLowerCase())) type = plant.addBooleanArg.bind(plant);
            else if (arg.datatype == "role") type = plant.addRoleArg.bind(plant);
            else if (arg.datatype == "mention" || arg.datatype == "mentionable") type = plant.addMentionArg.bind(plant);
            else if (["num", "number", "float"].includes(arg.datatype)) type = plant.addFloatArg.bind(plant);
            else if (["int", "integer", "intg"].includes(arg.datatype)) type = plant.addIntegerArg.bind(plant);
            else type = plant.addStringArg.bind(plant);

            type(argument => {
                argument.setName(arg.name)
                .setDescription(arg.description);

                if (arg.type != "command") argument.setOptional(arg.optional);
                else {
                    arg.subarguments.forEach(item => argumentHandler(item, argument));
                    return argument;
                }

                if (arg.min) argument.minValue = arg.min;
                if (arg.max) argument.maxValue = arg.max;

                if (this.built.choices.has((origplant ? `${plant.name}:` : "") + arg.name)) argument.addChoices(this.built.choices.get((origplant ? `${plant.name}:` : "") + arg.name));
                if (this.built.autocomplete.has((origplant ? `${plant.name}:` : "") + arg.name)) argument.autocomplete = true;
                return argument;
            });

        };

        args.forEach(item => argumentHandler(item, null));

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
        return this.built.callAction(SyntaxBuilder.TYPES.CONTEXT, interaction, this.parseValues(interaction));
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

    constructor(name, description) {
        this.builder = new SyntaxBuilder(name, description);
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
     * Adds a subcommand to this command.
     * Allows pre-defining a subcommand and setting its description.
     * Arguments that reference nonexistent subcommands will automatically create new subcommands using this method.
     * @param {String} name - The name of the subcommand to add to the command.
     * @param {String} description - The description of the subcommand.
     * @returns 
     */
    subcommand(name, description) {
        this.builder.addSubcommand(name, description);
        return this;
    }

    /**
     * Adds multiple subcommands to the command being built.
     * Subcommand descriptions and properties cannot be provided when using this method.
     * @param {String[]} subNames - The names of the subcommands to add to the command.
     * @returns 
     */
     subcommands(subNames) {
        subNames.forEach(subName => this.subcommand(subName));
        return this;
    }

    /**
     * Adds an argument to the command being built.
     * @param {String} argName - The name of the argument to add to the command.
     * @param {String} [description] - The description of the argument.
     * @param {String[]|(arg:SlashCommandArg, ac:AutocompleteInteraction) => String[]} [choicesOrAutocompleteCallback] - A set of choices for the value of the argument OR a function that will return autocomplete results for this argument.
     * @param {{default?:String,max?:Number,min?:Number}} [opts] - Additional options for the argument, including a default value and more.
     * @returns 
     */
    argument(argName, description, choicesOrAutocompleteCallback, opts) {
        let autoComplete = null, choices = null;

        if (Array.isArray(choicesOrAutocompleteCallback)) choices = choicesOrAutocompleteCallback;
        else autoComplete = choicesOrAutocompleteCallback;

        if (typeof description !== 'string') description = undefined;

        this.builder.addArgument(argName, description, choices ?? autoComplete, opts);
        return this;
    }

    /**
     * Adds multiple arguments to the command, subcommandgroup, or subcommand being built.
     * Argument descriptions and properties cannot be provided when using this method.
     * Argument types can be provided when using this method.
     * @param {String[]} argNames - The names of the arguments to add to the command.
     * @returns 
     */
    arguments(argNames) {
        argNames.forEach(argName => this.argument(argName));
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
     * @param {(interaction, { subcommand, ...args, flags }, syntax) => void} method - The method to execute when the command is executed.
    */
    action(method) {
        this.builder.setAction(method);
        return this.#build();
    }

}

class SyntaxContextMenu extends SyntaxCommand {

    constructor(...args) {
        super(...args);
    }

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
     * Defines a method to execute when the command is executed.
     * The callback method accepts parameters for each individual argument, plus a final flags parameter (in object literal form).
     * @param {(interaction, ...args, flags) => void} method - The method to execute when the command is executed.
    */
    action(method) {
        this.builder.setAction(method);
        return this.#build();
    }

}

SyntaxContextMenu.prototype.description = undefined;
SyntaxContextMenu.prototype.argument = undefined;
SyntaxContextMenu.prototype.arguments = undefined;

class SyntaxProgram {

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
        return new SyntaxCommand(commandName, description);
    }

    /**
     * Creates a new context menu command.
     * @param {String} commandName - The name of the context menu command to add.
     * @returns {SyntaxContextMenu}
     */
    contextmenu(commandName) {
        return new SyntaxContextMenu(commandName, null);
    }

}

module.exports = {
    SyntaxProgram,
    SyntaxCommand
}