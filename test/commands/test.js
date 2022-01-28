// console.log("A test message from test.js!");
const { command, contextmenu } = require("../../src/index");

command("testy", "A test command")
.guild("668485643487412234")
.argument("<subcmd>", "Select a command.", ["add", "delete"])
.argument("<required>", "A required argument.")
.argument("[optional; Noob; Choice A|Choice B|Choice C|Choice D]")
.requires(["ADMINISTRATOR", "@Bot"])
.action((slash, { subcmd, required, optional }, flags) => {
    if (subcmd == "add") {
        if (optional) slash.reply(`You added **${optional}**! Value of added choice: ${required}`);
        else slash.reply(`You did not select a choice to add!`);
    }
    else {
        if (optional) slash.reply(`You deleted **${optional}**! Value to replace deleted choice: ${required}`);
        else slash.reply(`You did not select a choice to delete and replace!`);
    }
});

command("anotha;+Another+test+command <req; An argumente obligatoire.> [optione; Optionale choix; Choix A|Choix B]")
.guild("668485643487412234")
.action((slash, { req, optione }) => {
    slash.reply(`You added **${optione}**! Value of added choice: ${req}`);
});

contextmenu("Test Contxt")
.type("message")
.guild("668485643487412234")
.action((slash, { message, id }) => {
    slash.reply(`You clicked on the context menu on message of ID: ${id}!`);
    message.react("☝️");
}); 