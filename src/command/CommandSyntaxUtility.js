const { ElisifSet, ElisifMap } = require("elisif/util/CollectionUtility");
const { Discord } = require("elisif");
const { Permissions } = Discord;

const TYPES = {
    PROGRAM: -1,
    COMMAND: 0,
    SUBGROUP: 1,
    SUBCOMMAND: 2
};

function dearg(arg) {
    let deargRegex = /(<|\[|\()|(>|\]|\))/gm;
    let dearged = arg.replace(deargRegex, "").replace(/\+/g, " ");
    let res = dearged.split("; ");
    
    if (res.length == 1) res.push(" "); //Blank description if no description is provided
    if (res.length == 2) res.push(undefined); //If no choices provided, set to undefined
    else res[2] = res[2].split("|"); //Otherwise, split choices into array

    //Old syntax for adding choices:
    // if (dearged.match("::")) {
    //     res.push(dearged.split("::")[1].split(","));
    //     let index = [0, 1].find(v => res[v].match("::"));
    //     res[index] = res[index].split("::")[0];
    // }
    // else res.push(undefined);
    
    return res;
}

function decommand(cmd) {
    let res = cmd.replace(/\+/g, " ").split("; ");
    if (res.length == 1) res.push(" "); //Blank description if no description is provided
    return res;
}

class SyntaxParser {
    
    static parse(components, str) {
        components = (typeof components === "string" ? SyntaxParser.components(components) : components).map((comp, index) => {comp.index = index; return comp;});
        let values = SyntaxParser.argumentValues(components, str);
        let [ args, flags ] = new ElisifSet(...values).partition(comp => comp.type != "flag");

        return {
            syntaxParsed: true,
            components,
            values: {
                args,
                flags
            }
        };
    }
    
    static components(syntax, isNotCommand) {
        let comps = [];
        let matcher = (" " + syntax.split(" ").join(" ")).match(/((<|\[|\()([^[<(]+)(>|\]|\)))|( [^[<( ]+)/gm);

        if (matcher && Array.isArray(matcher)) {
            matcher.forEach((arg, index) => {
            
                let builtArg = SyntaxParser.buildArgument(arg, index, isNotCommand);
                comps.push(builtArg);
        
            });
        }
        
        return comps;
    }

    static buildArgument(arg, index, isNotCommand) {
        let builtArg = {};
                
        if (arg.startsWith("<")) {
            //Mandatory arg
            builtArg.type = "arg";
            builtArg.optional = false;
            builtArg.name = dearg(arg)[0];
            builtArg.desc = dearg(arg)[1];
            builtArg.choices = dearg(arg)[2];
            if (arg.endsWith("...>")) builtArg.variadic = true;
        }
        else if (arg.startsWith("[")) {
            //Optional arg
            builtArg.type = "arg";
            builtArg.optional = true;
            builtArg.name = dearg(arg)[0];
            builtArg.desc = dearg(arg)[1];
            builtArg.choices = dearg(arg)[2];
            if (arg.endsWith("...]")) builtArg.variadic = true;
        }
        else if (arg.startsWith("(-")) {
            //Optional flag
            builtArg.type = "flag";
            builtArg.optional = true;
            builtArg.name = dearg(arg)[0].split(" ").slice(1).join(" ");
            builtArg.flag = dearg(arg)[0].split(" ")[0];
            builtArg.desc = dearg(arg)[1];
            builtArg.choices = dearg(arg)[2];
        }
        else {
            //Subgroup or subcommand or command (staticArg not supported via command syntax)

            // if (!isNotCommand && index > 2) throw new Error("Subgroups and subcommands can only be used as the first two arguments of a command.");

            builtArg.type = "command";
            builtArg.command = index == 0 ? "command" : (index == 1 ? "subGroup" : "subCommand");
            builtArg.name = decommand(arg.slice(1))[0];
            builtArg.desc = decommand(arg.slice(1))[1];
        }

        return builtArg;
    }

    /**
     * Gets all arguments of a specified command string. Values within quotation marks are considered 1 argument.
     * @param {String} str The command string to parse for arguments.
    */
    static stringArguments(str) {
        return str.match(/(“[^“”]+”)|([^ ]+)/gim);
    }

    static stripBorderQuotes(str) {
        return str.replace(/^“(.*)”$/g, "$1");
    }
    
    /**
     * Returns an array of syntax arguments with their values derived from the specified command string.
     * @param {Object[]} components - An array of components derived from the command syntax.
     * @param {String} str - The command string to parse for the value of the arguments.
     */
    static argumentValues(components, str) {
        let strArgs = SyntaxParser.stringArguments(str);

        if (!strArgs) return [];
        else if (!Array.isArray(strArgs)) strArgs = [strArgs];
        strArgs = strArgs.map(SyntaxParser.stripBorderQuotes);

        return components.map(arg => {
            if (arg.variadic) {
                arg.value = SyntaxParser.variadicValue(arg, strArgs);
                return arg;
            }
            else if (arg.flag) {
                arg.value = SyntaxParser.flagValue(arg, strArgs);
                return arg;
            }
            else if (arg.command) {
                arg.value = arg.name;
                return arg;
            }
            else {
                arg.value = strArgs.length >= arg.index ? strArgs[arg.index] : undefined;
                return arg;
            }
        });
    }
    
    /**
     * Returns the value of a variadic argument (derived from the command string).
     * @param {*} arg - The variadic argument to get the value of.
     * @param {*} strArgs - The arguments of the command string.
     */
    static variadicValue(arg, strArgs) {
        return strArgs.length >= arg.index ? strArgs.slice(arg.index) : [];
    }
    
    /**
     * Returns the value of a flag argument (derived from the command string).
     * @param {*} arg - The flag argument to get the value of.
     * @param {*} strArgs - The arguments of the command string.
     */
    static flagValue(arg, strArgs) {
        return strArgs.length >= arg.index + 1 ? strArgs[arg.index + 1] : undefined;
    }

}


class SyntaxBuilder {

    data = {
        command: null,
        components: [],
        parsers: new ElisifMap(),
        choices: new ElisifMap(),
        defaults: new ElisifMap(),
        requires: new ElisifSet(),
        channels: new ElisifSet(),
        guilds: new ElisifSet(),
        action: () => {}
    }

    setCommand(commandName, description = false) {
        if (this.data.components.length >= 1 || this.data.command) throw new Error("Command already set.");

        const value = commandName.match(" ") ? commandName : commandName + (description ? ";+" + description.replace(/ /g, "+") : "");
        this.data.command = commandName;
        this.data.components.push(value);
    }

    setDescription(description = false) {
        if (!description) return;

        if (this.data.components.length >= 1 && !this.data.components[0].match(" ") && !this.data.components[0].match(";")) this.data.components[0] += ";+" + description.replace(/ /g, "+");
        else if (this.data.components.length >= 1 && this.data.components[0].match(" ") && !this.data.components[0].match(";")) {
            const comps = this.data.components[0].split(" ");
            comps[0] = comps[0] + ";+" + description.replace(/ /g, "+");
            this.data.components[0] = comps.join(" ");
        }
        else throw new Error("Error: Command already has a description set.");
    }

    addArgument(argName, description, choices = false, customParser, defaults = false) {
        if (this.data.components.length < 1) throw new Error("Error: Cannot add an argument before command is set.");

        //builder.buildArgument(argName, components.length, true);
        
        const value = (description ? argName.slice(0, argName.length - 1) + ";+" + description.replace(/ /g, "+") + argName.slice(argName.length - 1) : argName);
        this.data.components.push(value);

        const parsedArgName = dearg(argName)[0];

        if (customParser) this.data.parsers.set(parsedArgName, customParser);
        if (choices) this.data.choices.set(parsedArgName, choices);
        if (defaults) this.data.defaults.set(parsedArgName, defaults);
    }

    addRequire(permOrRoleName) {
        if (this.data.components.length < 1) throw new Error("Error: Cannot add a require before command is set.");

        const perms = Object.keys(Permissions.FLAGS);
        let value = {
            value: permOrRoleName.replace("@", "")
        };

        if (perms.includes(permOrRoleName.toUpperCase()) && !permOrRoleName.startsWith("@")) value.perm = true;
        else value.role = true;

        this.data.requires.add(value);
    }

    addChannel(channel) {
        if (this.data.components.length < 1) throw new Error("Error: Cannot add a channel before command is set.");

        this.data.channels.add(channel);
    }

    addGuild(guild) {
        if (this.data.components.length < 1) throw new Error("Error: Cannot add a guild before command is set.");

        this.data.guilds.add(guild);
    }

    setAction(method) {
        if (this.data.components.length < 1) throw new Error("Error: Cannot set action before command is set.");

        this.data.action = method;
    }

    build() {
        const data = this.data;
        data.syntax = data.components.join(" ");
        data.callAction = ({ args, flags }, interaction) => {

            args = args.toArray();
            flags = flags.toArray();

            args.shift(); //Remove command from arguments
            const argList = args.reduce((acc, curr) => (acc[curr.name] = curr.value, acc), {});
            const flagObject = flags.reduce((acc, curr) => (acc[curr.name] = curr.value, acc), {});
            const standardValues = { args, flags }

            return data.action(interaction, argList, flagObject, standardValues);
        }

        return data;
    }

}

module.exports = class SyntaxUtility {

    static parser = SyntaxParser;
    
    static builder = SyntaxBuilder;

    static get TYPES() { return TYPES };
    
}