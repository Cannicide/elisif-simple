const { bot, config, elisif, info, markup, toolkit } = require("../src/index");

config.name("Katalina")
.author("Cannicide")
.description("A test client for the Katalina bot, made with elisif-simple.")
.intents(elisif.util.getAllIntentsAsArray())
.presences(["Test 1", "Test 2", "Test 3", "Test 4"])
.storage("json")
.debug();

const client = bot();

//Test setting Constants:
client.constants.load(__dirname + "/../package.json");

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
// client.schedule("test2", new Date("11/12/2021 7:21 PM"), () => {
//     console.log("Testing scheduled message", new Date().toString());
// });

// Testing ION events (formerly event hooks):
// client.ion("message", "suggestions", m => {
//     if (m.content.startsWith("Sugg:")) {
//         m.reply("Nice sugg " + m.author.username + "!");
//     }
// });

// client.ion.off("messageDelete", "suggestions", m => {
//     console.log("Removed " + m.channel.id);
// });

// setTimeout(() => client.ion.add("suggestions", "668485643487412234", ["780521092506845194", "792459835148337153"]), 5000);
// setTimeout(() => client.ion.add("suggestions", "668485643487412234", "813446542753136711"), 5000);

//Test markup extending:
markup(`<input value="" type="">
    <subinput value="r" />
    <subinput value="i" />
    <subinput value="p" />
</input>`).extend((elem, _, args) => {
    let value = elem.attr("value");
    let type = elem.attr("type");

    let sub2Value = elem.child("subinput")[1].attr("value");

    console.log("Parsed", value, type);
    console.log("And with args:", args.input);

    return new Promise(function(resolve, reject) {
        setTimeout(() => resolve(sub2Value), 3000);
    });
});

//Markup testing:
const msg = markup(`<b>Test this</b> way of having bold text, and this <i>italic</i> text.<br /><a href="https://github.com/">Test this link</a> as well. Basic test.
<embed>
    <title href="https://github.com/">Test embed</title>
    <description>This is a test embed.</description>
    <footer>Footer text</footer>
</embed>
<input value="test" type="password">
    <subinput value="retina display" />
    <subinput value="iris display" />
    <subinput value="pupil display" />
</input>
<timestamp value="2/3/2022 8:00 AM" style="F" />
<timestamp />
<timestamp style="R" />
<button text="Test button" id="TESTBTN1" href="https://github.com/" />
<button text="Second button" id="TESTBTN2" onclick="secondButton" authors="*" clicks="2" />
<button text="Third button" id="TESTBTN3" row="2" onclick="testBtnThree" authors="274639466294149122" clicks="3" />
<button text="Fourth button" id="TESTBTN4" color="green" />
<select text="First Menu" id="TESTMENU1" onselect="firstMenu" authors="*" max="1" min="1">
    <option value="secretvalue" emoji="👃" description="Nose">Option 1</option>
    <option description="Nose">💯 Option 2</option>
</select>
`);

// <select text="A placeholder" id="TESTSELECT" min="2">
//     <option description="The first option.">First opt</option>
//     <option description="The second option." emoji="🇧">Second opt</option>
// </select>

client.on("ready", async () => {
    const markupChannel = client.guilds.cache.get("668485643487412234")?.channels.cache.get("883731756438671391");
    if (markupChannel) {
        // await msg.send(markupChannel, {
        //     secondButton(btn) {
        //         btn.reply("CLICKED");
        //     },

        //     testBtnThree(btn) {
        //         btn.reply("ANOTHA ONE CLICKED");
        //     },

        //     input: "test arg for input",

        //     firstMenu(menu, value) {
        //         menu.reply("SELECTED " + value);
        //     }
        // });

        // setTimeout(async () => {
        //     console.log(await msg.dom.child("a").attr("href"));
        //     // await msg.dom.child("a").attr("target", "__blank");
        //     // await msg.dom.child("a").html("Test THAT link");
        //     // msg.dom.update();
        // }, 1000);
    }
});

//Testing function-only event handlers:
// client.on(function message(m) {
//     if (m.author.bot) return;
//     if (toolkit.emotes(m.content)) m.reply("Emotes were found! " + toolkit.emotes(m.content).join(", "));
// });

//Test toolkit's Boa utilities
// toolkit.boa.use(async () => {
//     print("Testing boa!");
//     await wait(2000);
//     print("Continuing to test boa!");
//     print(tuple("a", "b", "c"));
// });

//Test EvG storage size toolkit utility
// console.log("Storage Size:", toolkit.storageSize(client));

//Test getting, setting, and dynamic Constants:
console.log("Test Constant:", client.constants.version);
console.log("Test Constant MK2:", client.constants.get("version"));
client.constants.testThis = 420;
console.log("Test Constant MK3:", client.constants.get("testThis"));


//Print version of node-elisif
// console.log("Started node-elisif v" + elisif.version);
//Print version of elisif-simple
// console.log("Started elisif-simple v" + info.version);

//Only login when actually testing
if (require("fs").existsSync(__dirname + "/token.json")) client.login(require("./token.json").token);
else process.exit();