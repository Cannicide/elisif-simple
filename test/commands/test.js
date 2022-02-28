// console.log("A test message from test.js!");
const { command, contextmenu, toolkit } = require("../../src/index");

command("testy", "A test command")
.guild("668485643487412234")
.subcommand("add", "Adds a value to db.")
.subcommand("delete")
.argument("add <required: string>", "Value to add to db.", async (arg) => {
    const db = [ "toast", "revenant", "designer", "bicycle" ];
    return toolkit.sortedSimilar(db, arg.value, "dynamic", 0.9);
})
.argument("add [optional]", "Object to add to db.", ["Choice A", "Choice B", "Choice C", "Choice D"])
.argument("delete [optional: user]", "Object to delete from db.")
.requires(["ADMINISTRATOR", "@Bot"])
.action((slash, args) => {

    const { subcommand, required, /*optional,*/ flags } = args;

    if (subcommand == "add") {
        if (args.get("optional")) slash.reply(`You added **${args.optional}**! Value of added choice: ${required}`);
        else slash.reply(`You did not select a choice to add!`);
    }
    else {
        if (args.optional) slash.reply(`You deleted **${args.get("optional")}**!`);
        else slash.reply(`You did not select a choice to delete!`);
    }
});


command("anotha", "Another test command")
.guild("668485643487412234")
.argument("<req: num>", "Obligatoire", null, { min: 5, max: 10 })
.argument("[opt]", "Optionnel", arg => ["Choice A", "Choice B", "Choice C"], { default: "DefaultValue" })
.argument("(-f flag)", "Flag")
.action((slash, { req, opt, flags }) => {
    slash.reply(`req: ${req}, opt: ${opt}, flags: ${flags.get("flag")}`);
});


contextmenu("Test Contxt")
.type("message")
.guild("668485643487412234")
.action((slash, { message, id }) => {
    slash.reply(`You clicked on the context menu on message of ID: ${id}!`);
    message.react("☝️");
}); 