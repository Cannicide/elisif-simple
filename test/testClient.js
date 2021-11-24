const { bot, command, config, elisif, info, markup, toolkit } = require("../src/index");

config.name("Katalina")
.author("Cannicide")
.description("A test client for the Katalina bot, made with elisif-simple.")
.intents(elisif.util.getAllIntentsAsArray())
.presences(["Test 1", "Test 2", "Test 3", "Test 4"])
.storage("json")
// .debug();

const client = bot();

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



//Testing clonable events:
client.on("#ready", cl => {
    console.log(`[${cl.user.username}] is ready!`);
});

// client.on("#message", message => {
//     console.log(`[${message.client.user.username}] received a message!`);
// });

// client.on("message", message => {
//     console.log(`[${message.client.user.username}] received a message! Only katalina should receive this!`);
// })

// const clone = client.clone(require("./token.json").clone, config.clear().name("Testing Bot")
// .author("Cannicide")
// .description("A test clone of the Katalina bot, made with elisif-simple.")
// .intents(elisif.util.getAllIntentsAsArray())
// .storage("json")
// .debug());

// clone.on("message", message => {
//     console.log(`[${message.client.user.username}] received a message! Only Testing Bot should receive this!`);
// });


//Testing custom @error event:
client.on("@error", err => {
    console.log("Bot going down due to ISSUE: " + err);
});

//TESTING RECURSIVE COMMAND LOADING
client.loadCommands(__dirname + "/commands");


//Testing persistent events:
// client.events.persist("message", "test", (message) => {
//     console.log("Content:", message.content);
// });
// client.events.desist("test");

//Testing scheduled events:
// client.events.schedule("test2", new Date("11/12/2021 7:21 PM"), () => {
//     console.log("Testing scheduled message", new Date().toString());
// });


//Markup testing:
// const msg = markup(`<b>Test this</b> way of having bold text, and this <i>italic</i> text.<br><a href="https://github.com/">Test this link</a> as well. Basic test.
// <embed>
//     <title href="https://github.com/">Test embed</title>
//     <description>This is a test embed.</description>
//     <footer>Footer text</footer>
// </embed>
// <button text="Test button" id="TESTBTN1" href="https://github.com/" />
// <button text="Second button" id="TESTBTN2" />
// <button text="Third button" id="TESTBTN3" row="2" />
// <button text="Fourth button" id="TESTBTN4" color="green" />
// <select text="A placeholder" id="TESTSELECT" min="2">
//     <option description="The first option.">First opt</option>
//     <option description="The second option." emoji="🇧">Second opt</option>
// </select>
// `);

// client.on("ready", () => {
//     const markupChannel = client.guilds.cache.get("668485643487412234")?.channels.cache.get("883731756438671391");
//     if (markupChannel) msg.send(markupChannel);
// });


//Test EvG storage size toolkit utility
// console.log("Storage Size:", toolkit.storageSize(client));


//Print version of node-elisif
// console.log("Started node-elisif v" + elisif.version);
//Print version of elisif-simple
// console.log("Started elisif-simple v" + info.version);

//Only login when actually testing
if (require("fs").existsSync(__dirname + "/token.json")) client.login(require("./token.json").token);
else process.exit();