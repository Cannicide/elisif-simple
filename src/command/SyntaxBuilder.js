const { ElisifSet, ElisifMap } = require("elisif/util/CollectionUtility");
const { Discord, util } = require("elisif");
const { Permissions } = Discord;
const { boa } = require("../systems/toolkit");


function dearg(arg) {
    let deargRegex = /(<|\[|\()|(>|\]|\))/gm;
    let dearged = arg.replace(deargRegex, "").replace(/\+/g, " ");
    let split = dearged.split(": ");
    
    return {
        name: split[0],
        type: split[1] ?? "string" //String type if no type is provided
    };
}

class SyntaxParser {
    
    static components(syntax) {
        let comps = [];
        let matcher = (" " + syntax).match(/((<|\[|\()([^[<(]+)(>|\]|\)))|( [^[<( ]+)/gm);

        if (matcher && Array.isArray(matcher)) {
            matcher.forEach((arg, index) => {
            
                let builtArg = SyntaxParser.buildArgument(arg, index);
                comps.push(builtArg);
        
            });
        }
        
        return comps;
    }

    static buildArgument(arg, index) {
        let builtArg = {};
                
        if (arg.startsWith("<")) {
            //Mandatory arg
            builtArg.type = "arg";
            builtArg.optional = false;
            builtArg.name = dearg(arg).name;
            builtArg.datatype = dearg(arg).type;
        }
        else if (arg.startsWith("[")) {
            //Optional arg
            builtArg.type = "arg";
            builtArg.optional = true;
            builtArg.name = dearg(arg).name;
            builtArg.datatype = dearg(arg).type;
        }
        else if (arg.startsWith("(-")) {
            //Optional flag
            builtArg.type = "flag";
            builtArg.optional = true;
            builtArg.name = dearg(arg).name.split(" ")[0];
            builtArg.flag = dearg(arg).name.split(" ").slice(1).join(" ");
            builtArg.datatype = "string";
        }
        else {
            //Subgroup or subcommand or command (staticArg not supported via command syntax)

            if (index > 1) throw new Error("Subgroups and subcommands can only be used as the first two arguments of a command.");

            builtArg.type = "command";
            builtArg.name = arg.slice(1);
        }

        return builtArg;
    }
    
    /**
     * Returns an array of syntax arguments with their values derived from the given command interaction.
     * @param {Object[]} syntaxArgs - An array of template arguments derived from the command syntax.
     * @param {import("elisif/util/SlashUtility")} interaction - The command interaction to parse for the value of the arguments.
     */
    static argumentValues(syntaxArgs, interaction) {

        const mapper = arg => {
            if (!arg.flag && !interaction.mappedArgs.has(arg.name)) return { ...arg, value: undefined };

            if (arg.flag) {
                arg.value = interaction.mappedArgs.has(arg.name) ? interaction.mappedArgs.get(arg.name) : undefined;
                return arg;
            }
            else {
                arg.value = interaction.mappedArgs.get(arg.name);
                return arg;
            }
        };

        let rawArgs = syntaxArgs.map(arg => {

            if (arg.type == "command") return arg.subarguments.map(mapper);
            return mapper(arg);
            
        }).flat(2).filter(arg => arg);

        let [ args, flags ] = new ElisifSet(...rawArgs).partition(comp => comp.type != "flag");
        /** @type {String} */
        let subcommand = syntaxArgs.find(arg => arg.type == "command" && arg.name == interaction.subcommand)?.name;

        return {
            args,
            flags,
            subcommand
        };
    }

}


module.exports = class SyntaxBuilder {

    static autocompleteMap = new Map();

    data = {
        command: null,
        description: null,
        arguments: [],
        type: null,
        autocomplete: new ElisifMap(),
        choices: new ElisifMap(),
        defaults: new ElisifMap(),
        requires: new ElisifSet(),
        channels: new ElisifSet(),
        guilds: new ElisifSet(),
        action: () => {}
    }

    constructor(commandName, description) {
        this.setCommand(commandName, description);
    }

    /**
     * @deprecated
     */
    getFillerDescription() {
        console.warn(`
            WARNING: A filler description was used by an elisif-simple command. This is not recommended.
            Filler descriptions are used when descriptions are not provided for commands, subcommands, or arguments.
            The Discord API requires descriptions to be provided for these entities. Fillers are used to avoid errors.
            If you are seeing this message, you did not set a description on one of your commands, subcommands, or arguments.
            Please correct this issue ASAP. Fillers are deprecated and may be removed in a future elisif-simple release.
        `);
        return "No description provided.";
    }

    setCommand(commandName, description = false) {
        if (this.data.command) throw new Error("Command already set.");
        this.data.command = commandName;
        this.setDescription(description);
    }

    setDescription(description = this.getFillerDescription()) {
        if (!description) return;
        if (this.data.description) throw new Error("Error: Command already has a description set.");

        this.data.description = description;
    }

    addSubcommand(subcommandName, description = this.getFillerDescription()) {
        if (!this.data.command) throw new Error("Error: Cannot add a subcommand before command is set.");
        this.data.arguments.push({
            type: "command",
            name: subcommandName,
            description,
            subarguments: []
        });
    }

    addArgument(argName, description = this.getFillerDescription(), autoCompleteOrChoices, opts = {}) {
        if (!this.data.command) throw new Error("Error: Cannot add an argument before command is set.");

        const {default:defaults = false, max, min} = opts;
        let args = SyntaxParser.components(argName);
        let parsedArg = null;
        let subcommandIndex = -1;
        let parsedSubcommand = null;

        for (let arg of args) {
            if (arg.type == "command") {
                subcommandIndex = this.data.arguments.findIndex(a => a.type == "command" && a.name == arg.name);
                if (subcommandIndex < 0) {
                    this.addSubcommand(arg.name);
                    subcommandIndex = this.data.arguments.length - 1;
                }

                parsedSubcommand = arg;

                continue;
            }

            parsedArg = {
                type: arg.type,
                datatype: arg.datatype,
                optional: arg.optional,
                name: arg.name,
                description,
                flag: arg.flag ?? false,
                max,
                min
            };

            if (subcommandIndex > -1) this.data.arguments[subcommandIndex].subarguments.push(parsedArg);
            else this.data.arguments.push(parsedArg);
        }

        if ((max || min) && !["num", "number", "float", "int", "intg", "integer"].includes(parsedArg.datatype.toLowerCase())) throw new Error(`Error: Cannot set max/min on argument ${parsedArg.name} because it is not a number.`);

        const autoComplete = typeof autoCompleteOrChoices === 'function' ? autoCompleteOrChoices : null;
        const choices = autoComplete ? null : (parsedArg.flag ? [ parsedArg.flag ] : autoCompleteOrChoices);

        if (autoComplete) this.data.autocomplete.set((parsedSubcommand ? `${parsedSubcommand.name}:` : "") + parsedArg.name, autoComplete);
        if (choices) this.data.choices.set((parsedSubcommand ? `${parsedSubcommand.name}:` : "") + parsedArg.name, choices);
        if (defaults && parsedArg.optional) this.data.defaults.set((parsedSubcommand ? `${parsedSubcommand.name}:` : "") + parsedArg.name, defaults);
    }

    addRequire(permOrRoleName) {
        if (!this.data.command) throw new Error("Error: Cannot add a require before command is set.");

        const perms = Object.keys(Permissions.FLAGS);
        let value = {
            value: permOrRoleName.replace("@", "")
        };

        if (perms.includes(permOrRoleName.toUpperCase()) && !permOrRoleName.startsWith("@")) value.perm = true;
        else value.role = true;

        this.data.requires.add(value);
    }

    addChannel(channel) {
        if (!this.data.command) throw new Error("Error: Cannot add a channel before command is set.");

        this.data.channels.add(channel);
    }

    addGuild(guild) {
        if (!this.data.command) throw new Error("Error: Cannot add a guild before command is set.");

        this.data.guilds.add(guild);
    }

    setAction(method) {
        if (!this.data.command) throw new Error("Error: Cannot set action before command is set.");

        this.data.action = method;
    }

    setType(type = "CHAT_INPUT") {
        this.data.type = type;
    }

    build() {
        this.data.type = this.data.type || "CHAT_INPUT"; // CHAT_INPUT = slash commands
        const data = this.data;
        data.callAction = (type, interaction, suppliedValues) => {

            if (type == SyntaxBuilder.TYPES.COMMAND) var { args, flags, subcommand } = SyntaxParser.argumentValues(data.arguments, interaction);
            else var { args, flags, subcommand } = suppliedValues;

            args = args.toArray();
            flags = flags.toArray();
            const syntax = { args, flags, subcommand };

            const argList = args.reduce((acc, curr) => (acc[curr.name] = curr.value ?? data.defaults.get((subcommand ? `${subcommand}:` : "") + curr.name), acc), {});
            const flagObject = flags.reduce((acc, curr) => ({
                ...acc,
                [curr.name]: true,
                [curr.value]: true
            }), {});
            argList.flags = boa.dict(flagObject);
            argList.subcommand = subcommand;

            return data.action(interaction, boa.dict(argList), syntax);
        }

        if (data.autocomplete.size > 0) SyntaxBuilder.autocompleteMap.set(data.command, data.autocomplete);

        return data;
    }

    static initializeAutocomplete(client) {

        client.on("autoComplete", async interaction => {
            let command = interaction.commandName;
            let autocompletes = SyntaxBuilder.autocompleteMap.get(command);
            if (!autocompletes) return;

            let sub = interaction.options.data.find(arg => arg.type == "SUB_COMMAND") ? interaction.options.getSubcommand() : null;
            let arg = interaction.options.data.find(arg => sub ? arg.options.find(arg => autocompletes.has(`${sub}:` + arg.name)) : autocompletes.has(arg.name));

            if (sub) arg = arg.options.find(arg => autocompletes.has(`${sub}:` + arg.name));

            if (arg) {
                let result = await autocompletes.get((sub ? `${sub}:` : "") + arg.name)(arg, interaction);
                if (!result || !Array.isArray(result)) interaction.respond([]);
                else interaction.respond(result.map(key => ({name: key, value: key})));
            }
        });
    }

    static TYPES = {
        COMMAND: Symbol("COMMAND"),
        CONTEXT: Symbol("CONTEXT")
    }

}