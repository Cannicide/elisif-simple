//Elisif-Simple MarkUP - Enable using *some* markup (HTML) in bot messages as opposed to the usual markdown
//                       Allows for adding complex UI elements such as buttons, as easily as **bold** text. 

const { Discord, util } = require("elisif");
const { ButtonUtility } = require("elisif/util/ComponentUtility");
const MarkupConstants = require("./constants");

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

async function replaceAsync(str, regex, asyncFn) {
    const promises = [];
    str.replace(regex, (match) => {
        const promise = asyncFn(match);
        promises.push(promise);
    });
    const data = await Promise.all(promises);
    return str.replace(regex, () => data.shift());
}

class MarkupElement {

    constructor(syntax) {
        this.syntax = syntax;
        this.customCallback = () => {};
    }

    /**
     * Gets the tagname of this element.
     */
    get name() {
        return this.syntax.match(/<([^ />]+)(( [^"]+="(.*?)")*)( \/|)>/)?.[1];
    }

    /**
     * Gets the type of this element.
     * @returns {"parent"|"normal"}
     */
    get type() {
        return this.syntax.match(/<(.*?)>(.*?)<\/(.*?)>/ms) ? "parent" : "normal";
    }

    /**
     * Gets all attributes of this element.
     * @returns {Map<String, String>}
     */
    get attributes() {
        let attrs = this.syntax.match(/<([^ />]+)(( [^"]+="(.*?)")*)( \/|)>/)?.[2];
        let map = new Map();

        if (!attrs) return map;
        attrs = attrs.trim().match(/[a-zA-Z]+="[^"]*"/g);
        
        if (!attrs) return map;
        for (const attr of attrs) {
            let [key, value] = attr.split("=");
            map.set(key, value.slice(1, -1));
        }

        return map;
    }

    /**
     * Gets an attribute value of this element, by name.
     * @param {String} name 
     * @returns {String|Number|Boolean}
     */
    attr(name) {

        let attr = this.attributes.get(name);

        if (["true", "false"].includes(attr?.toLowerCase())) return Boolean(attr);
        else if (!isNaN(attr) && attr.length < 16) return Number(attr);
        return attr;
    }

    /**
     * Gets all child elements of this element.
     * @returns {Map<String, MarkupElement>}
     */
    get children() {
        let reg = new RegExp(`<${this.name}(.*?)>(.*?)<\\/${this.name}>`, "ms");
        let children = this.syntax.match(reg)?.[2];
        let map = new Map();

        if (!children) return map;
        let allChildren = [];
        allChildren = allChildren.concat(children.trim().match(/<(.*?) \/>/g));
        allChildren = allChildren.concat(children.trim().match(/<(.*?)>(.*?)<\/(.*?)>/g));

        allChildren = allChildren.filter(child => child);

        for (const child of allChildren) {
            let elem = new MarkupElement(child);
            if (!map.has(elem.name)) map.set(elem.name, elem);
            else map.set(elem.name, [].concat(map.get(elem.name)).concat(elem));
        }

        return map;
    }

    /**
     * Gets a child element of this element, by name.
     * If multiple children of the same name exist, all of them are returned in an array.
     * @param {String} name 
     * @returns {MarkupElement}
     */
    child(name) {
        return this.children.get(name);
    }

    /**
     * Returns the "innerHTML" of this element.
     * Includes any text or child elements within this element, if this is a parent element.
     * If this is a non-parent element, an empty string will be returned.
     * @returns {String}
     */
    html() {
        return this.type == "parent" ? this.syntax.match(/<(.*?)>(.*?)<\/(.*?)>/ms)?.[2] : "";
    }

    setCallback(callback) {
        this.customCallback = callback;
        return this;
    }

    /**
     * 
     * @param {MarkupParser} markupParser 
     * @param {(elem:MarkupElement, parser:MarkupParser, args:Object) => *} callback 
     * @returns 
     */
    async replace(markupParser, callback, args) {
        let reg;
        if (callback) this.setCallback(callback);

        if (this.type == "parent") reg = new RegExp(`<${this.name}(.*?)>(.*?)<\\/${this.name}>`, "gms");
        else if (this.type == "normal") reg = new RegExp(`<${this.name}(.*?) \\/>`, "g");
        else throw new Error("Invalid Markup Element Type: Javascript itself has broken and the world is doomed!");

        return markupParser.content = await replaceAsync(markupParser.content, reg, async (match) => {
            return await this.customCallback(new MarkupElement(match), markupParser, args) ?? "";
        });
    }

}

class MarkupParser {

    static customElements = new Set();

    constructor(message) {
        this.content = message;
        this.options = {
            files: [],
            embeds: [],
            components: []
        };

        this.components = new ComponentRowHandler();
        this.handlers = new Map();
        this.constants = new MarkupConstants();
    }

    /**
     * Replace all markup in this.content with markdown
     */
    async parse(args = {}) {

        //Replace all custom tags and call their custom callbacks
        for (let elem of MarkupParser.customElements) {
            await elem.replace(this, null, args);
        }

        // Replace all <b> tags with bold text
        await new MarkupElement("<b>Text</b>").replace(this, elem => {
            return `**${elem.html()}**`;
        });

        // Replace all <i> tags with italic text
        await new MarkupElement("<i>Text</i>").replace(this, elem => {
            return `*${elem.html()}*`;
        });

        // Replace all <u> tags with underlined text
        await new MarkupElement("<u>Text</u>").replace(this, elem => {
            return `__${elem.html()}__`;
        });

        // Replace all <s> tags with strikethrough text
        await new MarkupElement("<s>Text</s>").replace(this, elem => {
            return `~~${elem.html()}~~`;
        });

        // Replace all <code> tags with code text
        await new MarkupElement('<code lang="js">Text</code>').replace(this, elem => {
            return `\`\`\`${elem.attr("lang") ?? ""}\n${elem.html()}\n\`\`\``;
        });

        // Replace all <a> tags with a link
        await new MarkupElement(`<a href="https://example.com" escape="true">Text</a>`).replace(this, elem => {
            return elem.attr("escape") || !elem.attr("href").startsWith("http") ? `<${elem.attr("href")}>` : `[${elem.html()}](${elem.attr("href")})`;
        });

        // Replace all <img> tags with an image
        await new MarkupElement(`<img src="https://example.com/image.png" />`).replace(this, elem => {
            let url = elem.attr("src");
            this.options.files.push(url);
        });

        // <ephemeral /> tags make replies ephemeral
        await new MarkupElement("<ephemeral />").replace(this, elem => {
            this.options.ephemeral = true;
        });

        // Replace all <br> tags with a newline
        await new MarkupElement("<br />").replace(this, elem => {
            return "\n";
        });

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
         await new MarkupElement(`<embed>
            <title href="optional url">Optional Title</title>
            <description>Optional description</description>
            <image src="Optional image URL" />
            <color>Optional custom color</color>
            <footer src="optional icon URL">Optional footer text</footer>
            <thumbnail src="Optional thumbnail URL" />
            <author href="optional author URL" src="optional icon URL">Optional author name</author>
            <field name="Field title" inline="true">Field value</field>
        </embed>`).replace(this, elem => {
            let embed = new Discord.MessageEmbed();
            let title = elem.child("title");
            let description = elem.child("description");
            let image = elem.child("image");
            let color = elem.child("color");
            let footer = elem.child("footer");
            let thumbnail = elem.child("thumbnail");
            let author = elem.child("author");
            let fields = elem.child("field");

            if (title) {
                embed.setTitle(title.html());
                embed.setURL(title.attr("href"));
            }

            if (description) embed.setDescription(description.html());

            if (image) embed.setImage(image.attr("src"));

            if (color) embed.setColor(color.html());

            if (footer) {
                embed.setFooter({
                    text: footer.html(),
                    iconURL: footer.attr("src")
                });
            }

            if (thumbnail) embed.setThumbnail(thumbnail.attr("src"));

            if (author) {
                embed.setAuthor({
                    name: author.html(),
                    url: author.attr("href"),
                    iconURL: author.attr("src")
                });
            }

            [].concat(fields ?? []).forEach(field => {
                embed.addField(field.attr("name"), field.html(), field.attr("inline"));
            });

            this.options.embeds.push(embed);
        });

        // Replace all <button> tags with a button component
        await new MarkupElement(`<button text="label" href="url" color="blue" id="cId" emoji="emote" disabled="true" row="1" onclick="f" authors="" clicks="" />`).replace(this, elem => {
            let component = {
                elisifComponentType: "button",
                label: elem.attr("text") ?? "[No label set]",
                customId: elem.attr("href") ? null : elem.attr("id"),
                style: ButtonUtility.convertColor(elem.attr("href") ? "url" : elem.attr("color") ?? "PRIMARY"),
                emoji: elem.attr("emoji"),
                url: elem.attr("href"),
                disabled: elem.attr("disabled")
            };

            let onclick = elem.attr("href") ? null : elem.attr("onclick");
            let handlerAuthors = onclick ? elem.attr("authors")?.toString().split(",") : null;
            let handlerClicks = onclick ? elem.attr("clicks") ?? 0 : null;
            let row = elem.attr("row") ? elem.attr("row") - 1 : null;

            this.components.add(component, row);
            if (onclick) {

                this.handlers.set(elem.attr("id"), (messageOrInteraction, id) => {
                    const handlerSettings = {
                        ids: [id],
                        authors: handlerAuthors,
                        maxClicks: handlerClicks,
                        allUsersCanClick: handlerAuthors[0] === "*" ? true : false
                    };
        
                    messageOrInteraction.util.buttonHandler(handlerSettings, button => {
                        if (onclick in args) args[onclick](button);
                    });
                });

            }

        });

        // Replace all <select> tags with a selectmenu component
        ////// NOTE: SELECT MENUS ARE CURRENTLY UNTESTED AND HAVE NOT BEEN ADDED TO MARKUP YET \\\\\\
        // this.content = this.content.replace(/<select(.*?)>(.*?)<\/select>/gms, (match, menuStuff, optionStuff) => {
        //     let component = {
        //         elisifComponentType: "selectMenu",
        //         placeholder: null,
        //         customId: null,
        //         minValues: null,
        //         maxValues: null,
        //         options: null,
        //         disabled: null
        //     };

        //     let text = menuStuff.match(/text="(.*?)"/)?.[1] ?? "[No label set]";
        //     let id = menuStuff.match(/id="(.*?)"/)?.[1];
        //     let min = menuStuff.match(/min="(.*?)"/)?.[1];
        //     let max = menuStuff.match(/max="(.*?)"/)?.[1];
        //     let disabled = menuStuff.match(/disabled="true"/)?.[1] ?? false;

        //     if (!id) throw new Error("When creating a selectmenu via markup, an ID for the selectmenu MUST be specified.");

        //     let options = [];
        //     optionStuff = optionStuff.replace(/<option(.*?)>(.*?)<\/option>/gms, (match, optionValues, optionText) => {

        //         let parsedEmoji = optionValues.match(/emoji="(.*?)"/)?.[1];

        //         let option = {
        //             label: optionText ?? "[No label set]",
        //             value: optionValues.match(/value="(.*?)"/)?.[1] ?? optionText ?? "no value",
        //             description: optionValues.match(/description="(.*?)"/)?.[1],
        //             emoji: parsedEmoji ? (isNaN(parsedEmoji) ? {name: parsedEmoji} : {id: parsedEmoji}) : null,
        //             default: optionValues.match(/default="(.*?)"/)?.[1] ?? false
        //         }

        //         options.push(option);
        //         return "";
        //     });

        //     component.placeholder = text;
        //     component.customId = id;
        //     component.minValues = min;
        //     component.maxValues = max;
        //     component.options = options;
        //     component.disabled = disabled;

        //     this.components.add(component);
        //     return "";
        // });

        // Replace all <timestamp> tags with an Unix timestamp
        await new MarkupElement(`<timestamp value="" style="" />`).replace(this, elem => {
            let value = elem.attr("value") ?? new Date().toString();
            let style = elem.attr("style") ?? "f";
            let unix = new Date(value).getTime() / 1000;
        
            return `<t:${unix}:${style}>`;
        });



        // Build message options:
        this.options.content = this.content;
        this.options.components = this.components.build();

        return this.options;
    }

    /**
     * Calls any methods saved in the MarkupParser.handlers map, with the message/interaction and ID of the handler as arguments.
     * These handler methods need to operate on the message/interaction object after it has been sent, and this method makes that possible.
     * @param messageOrInteraction The message or interaction to call the handler with.
     */
    enableHandlers(messageOrInteraction) {

        util.Message(messageOrInteraction);

        this.handlers.forEach((handler, id) => {
            handler(messageOrInteraction, id);
        });
    }

    /**
     * Parses and sends this markup message to the specified channel.
     * @param {import("discord.js").TextChannel} channel - The channel object to send this markup message to.
     */
    async send(channel, args) {
        let res = await channel.send(await this.parse(args));
        this.enableHandlers(res);
        return res;
    }

    /**
     * Parses and sends this markup message as a reply to the specified message or interaction.
     * @param {import("discord.js").Message | import("discord.js").Interaction} messageOrInteraction - The message/interaction to reply to.
     * @returns 
     */
    async reply(messageOrInteraction, args) {
        let res = await messageOrInteraction.reply(await this.parse(args));
        this.enableHandlers(res);
        return res;
    }

    /**
     * Allows the addition of custom elements to be parsed by markup, with custom functionality.
     * If this method is being used, the custom element's syntax should be provided as the argument to the markup() method.
     * @param {(elem:MarkupElement, markupParser:MarkupParser, args:Object) => *} callback - The callback to be called when this custom element is parsed.
     */
    extend(callback) {

        let customElement = this.content;

        if (customElement.match(/<(.*?)>(.*?)<\/(.*?)>/ms) || customElement.match(/<(.*?)\/>/ms)) {
            //Element with or without children

            let elem = new MarkupElement(customElement);
            elem.setCallback(callback);
            MarkupParser.customElements.add(elem);

        }
        else throw new Error("The provided customElement syntax is invalid, and does not match the known supported syntax types.");

    }
}

module.exports = MarkupParser;