//Elisif-Simple MarkUP - Enable using *some* markup (HTML) in bot messages as opposed to the usual markdown
//                       Allows for adding complex UI elements such as buttons, as easily as **bold** text. 

const { Discord, util } = require("elisif");
const { ButtonUtility } = require("elisif/util/ComponentUtility");

class ComponentRowHandler {

    components = [
        [],
        [],
        [],
        [],
        []
    ];
    row = 0;

    add(component, providedRow) {
        let row = providedRow ?? this.row;

        if (this.components[row].length >= 5) row = this.components.findIndex(r => r.length < 5);
        if (component.elisifComponentType == "selectMenu" && this.components[row].length != 0) row = this.components.findIndex(r => r.length == 0);

        if (row < 0 || row > 4) return false;
        this.components[row].push(component);

        if (component.elisifComponentType == "selectMenu") this.row++;
        if (!providedRow) this.row = row;
        return true;
    }

    build() {
        let output = [];

        for (const row of this.components) {
            if (row.length == 0) continue;

            let actionRow = new Discord.MessageActionRow();
            actionRow.addComponents(row.map(component => {
                if (component.elisifComponentType == "button") return new Discord.MessageButton(component);
                else if (component.elisifComponentType == "selectMenu") return new Discord.MessageSelectMenu(component);
            }));
            output.push(actionRow);
        }

        return output;
    }
}

class MarkupParser {
    constructor(message) {
        this.content = message;
        this.options = {
            files: [],
            embeds: [],
            components: []
        };

        this.components = new ComponentRowHandler();
        this.handlers = new Map();
    }

    /**
     * Replace all markup in this.content with markdown
     */
    parse(args = {}) {

        // Replace all <b> tags with bold text
        this.content = this.content.replace(/<b>/gm, "**");
        this.content = this.content.replace(/<\/b>/gm, "**");

        // Replace all <i> tags with italic text
        this.content = this.content.replace(/<i>/gm, "*");
        this.content = this.content.replace(/<\/i>/gm, "*");

        // Replace all <u> tags with underlined text
        this.content = this.content.replace(/<u>/gm, "__");
        this.content = this.content.replace(/<\/u>/gm, "__");

        // Replace all <s> tags with strikethrough text
        this.content = this.content.replace(/<s>/gm, "~~");
        this.content = this.content.replace(/<\/s>/gm, "~~");

        // Replace all <code> tags with code text
        this.content = this.content.replace(/<code>/gm, "```");
        this.content = this.content.replace(/<\/code>/gm, "```");

        // Replace all <a> tags with a link
        this.content = this.content.replace(/<a href="(.*?)">(.*?)<\/a>/gms, "[$2]($1)");

        // Replace all <img> tags with an image
        // this.content = this.content.replace(/<img src="(.*?)">/g, "![]($1)");
        this.content.replace(/<img src="(.*?)">/gms, (match, url) => {
            this.options.files.push(url);
            return "";
        });

        // <ephemeral /> tags make replies ephemeral
        this.content.replace(/<ephemeral \/>/gms, () => {
            this.options.ephemeral = true;
            return "";
        });

        // Replace all <br> tags with a newline
        this.content = this.content.replace(/<br>/gm, "\n");

        /**
         * Replace all <embed> tags with an embed
         * 
         * Example syntax:
         * <embed>
         *  [<title [href="optional url"]>Optional Title</title>]
         *  [<description>Optional description</description>]
         *  [<image src="Optional image URL" />]
         *  [<color>Optional custom color</color>]
         *  [<footer [src="optional icon URL"]>Optional footer text</footer>]
         *  [<thumbnail src="Optional thumbnail URL" />]
         *  [<author [href="optional author URL"] [src="optional icon URL"]>Optional author name</author>]
         *  [<field name="Field title">Field value</field>...]
         * </embed>
         */
        this.content = this.content.replace(/<embed>(.*?)<\/embed>/gms, (match, contents) => {
            
            let embed = new Discord.MessageEmbed();

            // Parse title
            contents = contents.replace(/<title href="(.*?)">(.*?)<\/title>|<title>(.*?)<\/title>/gms, (match, url, urlTitle, title) => {
                if (!title) title = urlTitle;

                embed.setTitle(title);
                embed.setURL(url);
                return "";
            });

            // Parse description
            contents = contents.replace(/<description>(.*?)<\/description>/gms, (match, description) => {
                embed.setDescription(description);
                return "";
            });

            // Parse image
            contents = contents.replace(/<image src="(.*?)" \/>/gms, (match, url) => {
                embed.setImage(url);
                return "";
            });

            // Parse color
            contents = contents.replace(/<color>(.*?)<\/color>/gms, (match, color) => {
                embed.setColor(color);
                return "";
            });

            // Parse footer
            contents = contents.replace(/<footer src="(.*?)">(.*?)<\/footer>|<footer>(.*?)<\/footer>/gms, (match, url, urlText, text) => {
                if (!text) text = urlText;
                embed.setFooter(text, url);
                return "";
            });

            // Parse thumbnail
            contents = contents.replace(/<thumbnail src="(.*?)" \/>/gms, (match, url) => {
                embed.setThumbnail(url);
                return "";
            });

            // Parse author
            contents = contents.replace(/<author(.*?)<\/author>/gms, (match, authorStuff) => {
                let href = authorStuff.match(/href="(.*?)"/)?.[1];
                let src = authorStuff.match(/src="(.*?)"/)?.[1];
                let text = !href && !src ? authorStuff.split(">").slice(1).join(">") : authorStuff.split('">').slice(1).join('">');

                embed.setAuthor(text, src, href);
                return "";
            });

            // Parse fields
            contents = contents.replace(/<field name="(.*?)">(.*?)<\/field>/gms, (match, name, value) => {
                embed.addField(name, value);
                return "";
            });

            this.options.embeds.push(embed);
            return "";
        });

        // Replace all <button> tags with a button component
        this.content = this.content.replace(/<button(.*?)\/>/gms, (match, buttonStuff) => {
            let component = {
                elisifComponentType: "button",
                label: null,
                customId: null,
                style: null,
                emoji: null,
                url: null,
                disabled: null
            };

            let text = buttonStuff.match(/text="(.*?)"/)?.[1] ?? "[No label set]";
            let url = buttonStuff.match(/href="(.*?)"/)?.[1];
            let color = url ? "url" : (buttonStuff.match(/color="(.*?)"/)?.[1] ?? "PRIMARY");
            let id = url ? null : buttonStuff.match(/id="(.*?)"/)?.[1];
            let emoji = buttonStuff.match(/emoji="(.*?)"/)?.[1];
            let disabled = buttonStuff.match(/disabled="true"/)?.[1] ?? false;
            let row = buttonStuff.match(/row="(.*?)"/)?.[1];
            let onclick = url ? null : buttonStuff.match(/onclick="(.*?)"/)?.[1];
            let handlerAuthors = url ? null : buttonStuff.match(/authors="(.*?)"/)?.[1];
            let handlerClicks = url ? null : buttonStuff.match(/clicks="(.*?)"/)?.[1];

            if (!id && !url) throw new Error("When creating a button via markup, an ID for the button MUST be specified.");

            component.label = text;
            component.customId = id;
            component.style = ButtonUtility.convertColor(color);
            component.emoji = emoji;
            component.url = url;
            component.disabled = disabled;
            if (row) row = row - 1;

            this.components.add(component, row);
            if (onclick) this.handlers.set(id, [args[onclick] ?? new Function(), handlerAuthors?.split(",") ?? [], handlerClicks ?? 0]);

            return "";
        });

        // Replace all <select> tags with a selectmenu component
        this.content = this.content.replace(/<select(.*?)>(.*?)<\/select>/gms, (match, menuStuff, optionStuff) => {
            let component = {
                elisifComponentType: "selectMenu",
                placeholder: null,
                customId: null,
                minValues: null,
                maxValues: null,
                options: null,
                disabled: null
            };

            let text = menuStuff.match(/text="(.*?)"/)?.[1] ?? "[No label set]";
            let id = menuStuff.match(/id="(.*?)"/)?.[1];
            let min = menuStuff.match(/min="(.*?)"/)?.[1];
            let max = menuStuff.match(/max="(.*?)"/)?.[1];
            let disabled = menuStuff.match(/disabled="true"/)?.[1] ?? false;

            if (!id) throw new Error("When creating a selectmenu via markup, an ID for the selectmenu MUST be specified.");

            let options = [];
            optionStuff = optionStuff.replace(/<option(.*?)>(.*?)<\/option>/gms, (match, optionValues, optionText) => {

                let parsedEmoji = optionValues.match(/emoji="(.*?)"/)?.[1];

                let option = {
                    label: optionText ?? "[No label set]",
                    value: optionValues.match(/value="(.*?)"/)?.[1] ?? optionText ?? "no value",
                    description: optionValues.match(/description="(.*?)"/)?.[1],
                    emoji: parsedEmoji ? (isNaN(parsedEmoji) ? {name: parsedEmoji} : {id: parsedEmoji}) : null,
                    default: optionValues.match(/default="(.*?)"/)?.[1] ?? false
                }

                options.push(option);
                return "";
            });

            component.placeholder = text;
            component.customId = id;
            component.minValues = min;
            component.maxValues = max;
            component.options = options;
            component.disabled = disabled;

            this.components.add(component);
            return "";
        });




        // Build message options:
        this.options.content = this.content;
        this.options.components = this.components.build();

        return this.options;
    }

    enableHandlers(messageOrInteraction) {

        util.Message(messageOrInteraction);

        this.handlers.forEach((handlerAndData, id) => {
            let [ handler, authors, maxClicks ] = handlerAndData;
            
            const handlerSettings = {
                ids: [id],
                authors,
                maxClicks,
                allUsersCanClick: authors[0] === "*" ? true : false
            };

            messageOrInteraction.util.buttonHandler(handlerSettings, button => {
                handler(button);
            });
        });
    }

    /**
     * Parses and sends this markup message to the specified channel.
     * @param {import("discord.js").TextChannel} channel - The channel object to send this markup message to.
     */
    async send(channel, args) {
        let res = await channel.send(this.parse(args));
        this.enableHandlers(res);
        return res;
    }

    /**
     * Parses and sends this markup message as a reply to the specified message or interaction.
     * @param {import("discord.js").Message | import("discord.js").Interaction} messageOrInteraction - The message/interaction to reply to.
     * @returns 
     */
    async reply(messageOrInteraction, args) {
        let res = await messageOrInteraction.reply(this.parse(args));
        this.enableHandlers(res);
        return res;
    }
}

module.exports = MarkupParser;