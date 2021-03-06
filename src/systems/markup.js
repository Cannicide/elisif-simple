//Elisif-Simple MarkUP - Enable using *some* markup (HTML) in bot messages as opposed to the usual markdown
//                       Allows for adding complex UI elements such as buttons, as easily as **bold** text. 

const { Discord, util } = require("elisif");
const { ButtonUtility } = require("elisif/util/ComponentUtility");
const MarkupConstants = require("./constants");
const toolkit = require("./toolkit");

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

    constructor(syntax, isExtended = false, parent, parentChildren) {
        this.syntax_ = syntax;
        this.parent = parent ?? null;
        this.parentIndex = [].concat(parentChildren?.get(this.name) ?? []).length || 0;
        this.extended = isExtended;
        this.customCallback = () => {};
    }

    get syntax() {
        return this.syntax_;
    }

    set syntax(value) {
        let oldSyntax = new RegExp(this.syntax_, 'ms');
        let i = 0;
        this.syntax_ = value;
        
        if (this.parent && !this.extended) this.parent.syntax = this.parent.syntax.replace(oldSyntax, m => {
            if (i++ == this.parentIndex) return this.syntax_;
            return m;
        });
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
        let reg = new RegExp(`<${this.name}(| .*?)>(.*?)<\\/${this.name}>`, "ms");
        let children = this.syntax.match(reg)?.[2];
        let map = new Map();

        if (!children) return map;
        let allChildren = [];
        allChildren = allChildren.concat(children.trim().match(/<([^<>]*?) \/>/g));
        allChildren = allChildren.concat(children.trim().match(/<([^ ]*?)(| .*?)>(.*?)<\/(\1)>/gms));

        allChildren = allChildren.filter(child => child);

        for (const child of allChildren) {
            let elem = new MarkupElement(child, this.extended, this, map);
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
        return this.type == "parent" ? this.syntax.match(/<([^ ]*?)(| .*?)>(.*?)<\/(\1)>/ms)?.[3] : "";
    }

    /**
     * Returns the "innerText" of this element.
     * Includes only text within this element, if this is a parent element.
     * If marked exclusive, any child elements, including child elements' innertext, will be entirely ignored.
     * If this is a non-parent element, an empty string will be returned.
     * @param {Boolean} [exclusive] - Whether to exclude the innertext of child elements.
     * @returns {String}
     */
    text(exclusive = false) {
        let html = this.html();
        let text = exclusive ? html.replace(/<([^ ]*?)(| .*?)>(.*?)<\/(\1)>|<([^ ]*?)(.*?) \/>/gms, "") : [].concat(html.match(/[^<>]+(?![^<]*[>])/gms) ?? "").join(" ");

        return text.trim().replace(/ +/gm, " ");
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

        if (this.type == "parent") reg = new RegExp(`<${this.name}(| .*?)>(.*?)<\\/${this.name}>`, "gms");
        else if (this.type == "normal") reg = new RegExp(`<${this.name}(| .*?) \\/>`, "g");
        else throw new Error("Invalid Markup Element Type: Javascript itself has broken and the world is doomed!");

        return markupParser.content = await replaceAsync(markupParser.content, reg, async (match) => {
            return await this.customCallback(new MarkupElement(match), markupParser, args) ?? "";
        });
    }

}

class MarkupParser {

    static customElements = new Set();
    static cache = new Map();
    presendCallback = () => null;

    constructor(message) {
        this.content = message;
        this.orig_content = message;
        this.options = {
            files: [],
            embeds: [],
            components: []
        };

        this.components = new ComponentRowHandler();
        this.handlers = new Map();
        this.constants = new MarkupConstants();
        this.handlersEnabled = false;
        this.prevArgs = null;
        this.message = null;
    }

    /**
     * Replace all markup in this.content with markdown
     */
    async parse(args = {}) {

        //Set prevArgs
        this.prevArgs = args;

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
        await new MarkupElement(`<button text="label" href="url" emoji="?" color="blue" id="cId" disableonend="true" disabled="true" row="1" onclick="f" authors="" clicks="" />`).replace(this, elem => {
            let component = {
                elisifComponentType: "button",
                label: toolkit.nonemote(elem.attr("text") ?? "[No label set]", 0),
                customId: elem.attr("href") ? null : elem.attr("id"),
                style: ButtonUtility.convertColor(elem.attr("href") ? "url" : elem.attr("color") ?? "PRIMARY"),
                emoji: elem.attr("emoji") ?? toolkit.emote(elem.attr("text") ?? "", 0)?.replace(/<a?:.+?:|>/g, "") ?? null,
                url: elem.attr("href"),
                disabled: elem.attr("disabled")
            };

            let onclick = elem.attr("href") ? null : elem.attr("onclick");
            let handlerAuthors = onclick ? elem.attr("authors")?.toString().split(",") : null;
            let handlerClicks = onclick ? elem.attr("clicks") ?? 0 : null;
            let row = elem.attr("row") ? elem.attr("row") - 1 : null;
            const disableOnEnd = elem.attr("disableonend") ?? true;

            this.components.add(component, row);
            if (onclick) {

                this.handlers.set(elem.attr("id"), (messageOrInteraction, id) => {
                    const handlerSettings = {
                        ids: [id],
                        authors: handlerAuthors,
                        maxClicks: handlerClicks,
                        allUsersCanClick: !handlerAuthors || handlerAuthors[0] === "*" ? true : false,
                        disableOnEnd
                    };
        
                    messageOrInteraction.util.buttonHandler(handlerSettings, button => {
                        if (onclick in args) args[onclick](button);
                    });
                });

            }

        });

        // Replace all <select> tags with a selectmenu component
        await new MarkupElement(`
            <select text="label" id="cId" row="1" onselect="f" authors="" max="1" min="1" disableonend="true" disabled="false">
                <option value="value" emoji="?" description="" selected="true">Option 1</option>
            </select>
        `).replace(this, elem => {
            let component = {
                elisifComponentType: "selectMenu",
                placeholder: elem.attr("text") ?? "[No label set]",
                customId: elem.attr("id"),
                minValues: elem.attr("min") ?? 1,
                maxValues: elem.attr("max") ?? 1,
                options: [].concat(elem.child("option") ?? []).map(option => {
                    let parsedEmoji = option.attr("emoji") ?? toolkit.emote(option.html() ?? '', 0)?.replace(/<a?:.+?:|>/g, "") ?? null;
                    return {
                        label: toolkit.nonemote(option.html() ?? "[No label set]", 0),
                        value: option.attr("value") ?? option.html() ?? "[No label set]",
                        emoji: parsedEmoji ? (isNaN(parsedEmoji) ? {name: parsedEmoji} : {id: parsedEmoji}) : null,
                        description: option.attr("description"),
                        default: option.attr("selected")
                    };   
                }),
                disabled: elem.attr("disabled")
            };            

            let onselect = elem.attr("onselect");
            let handlerAuthors = onselect ? elem.attr("authors")?.toString().split(",") : null;
            let row = elem.attr("row") ? elem.attr("row") - 1 : null;
            const disableOnEnd = elem.attr("disableonend") ?? true;

            this.components.add(component, row);
            if (onselect) {

                this.handlers.set(elem.attr("id"), (messageOrInteraction, id) => {
                    const handlerSettings = {
                        ids: [id],
                        authors: handlerAuthors,
                        allUsersCanSelect: !handlerAuthors || handlerAuthors[0] === "*" ? true : false,
                        disableOnEnd
                    };
        
                    messageOrInteraction.util.menuHandler(handlerSettings, menu => {
                        if (onselect in args) args[onselect](menu, menu.util.selected);
                    });
                });

            }

        });

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
     * Calls any methods saved in the MarkupParser.handlers map, with the message and ID of the handler as arguments.
     * These handler methods need to operate on the message object after it has been sent, and this method makes that possible.
     * @param message The message to call the handler with.
     */
    enableHandlers(message) {
        if (this.handlersEnabled) return;

        util.Message(message);

        this.handlers.forEach((handler, id) => {
            handler(message, id);
        });

        this.handlersEnabled = true;
        this.message = message;
    }

    /**
     * Allows modification of the raw message object just before it is sent.
     * @param {(message:APIMessage) => void} f The callback with one parameter: the message object to modify before sending.
     * @returns {MarkupParser} The MarkupParser object, for chaining.
     */
    prepare(f) {
        this.presendCallback = f;
        return this;
    }

    /**
     * Gets the initial markup parser that sent the message of this ID.
     * @param {string} id The ID of the message to get the initial markup parser for.
     * @returns {MarkupParser} The initial markup parser that sent the message of this ID.
     */
    get(id) {
        return MarkupParser.cache.get(id);
    }

    /**
     * Parses and sends this markup message to the specified channel.
     * @param {import("discord.js").TextChannel} channel - The channel object to send this markup message to.
     */
    async send(channel, args) {
        let parsed = await this.parse(args);
        await this.presendCallback(parsed);

        let res = await channel.send(parsed);
        this.enableHandlers(res);

        MarkupParser.cache.set(res.id, this);
        return res;
    }

    /**
     * Parses and sends this markup message as a reply to the specified message or interaction.
     * @param {import("discord.js").Message | import("discord.js").Interaction} messageOrInteraction - The message/interaction to reply to.
     * @returns 
     */
    async reply(messageOrInteraction, args) {
        let parsed = await this.parse(args);
        await this.presendCallback(parsed);

        let res = await messageOrInteraction.reply(parsed);
        this.enableHandlers(res);

        MarkupParser.cache.set(res.id, this);
        return res;
    }

    /**
     * Parses the provided markup message and edits this markup parser's sent message with the newly parsed content.
     * Completely overrides this markup parser's content and orig_content with the newly provided content.
     * @param {String} mkup - Parsable markup message content.
     */
    async edit(mkup, args) {
        //Init:
        const prev_options = Object.assign({}, this.options);
        this.options = {
            files: [],
            embeds: [],
            components: []
        };
        this.components = new ComponentRowHandler();
        this.content = mkup;
        this.orig_content = mkup;

        //Parse:
        let parsed = await this.parse(args ?? this.prevArgs);
        parsed.content = parsed.content.replace("<html>", "").replace("</html>", "").trim();
        await this.presendCallback(parsed);

        //Account for duplicate properties:
        for (let key in parsed) {
            if (prev_options[key] == parsed[key]) delete parsed[key];
        }

        //Edit:
        let res = await this.message?.edit(parsed);
        // Handlers should already be enabled, ignore enableHandlers()
        // MarkupParser cache should already be set, ignore MarkupParser.cache.set()

        return res;
    }

    /**
     * Allows the modification and manipulation of specific element contents of this markup parser.
     */
    get dom() {
        if (!this.domProps) {
            var parser = {content:`<html>${this.orig_content}</html>`};
            var content = parser.content;
            var elem = new MarkupElement(content);
            var update = (args) => this.edit(elem.syntax, args);

            this.domProps = {
                parser, content, elem, update
            };
        }
        else {
            var { parser, content, elem, update } = this.domProps;
        }

        /**
         * @param {MarkupElement} e 
         */
        const domify = (e) => ({
            child(name) {
                let child = e.child(name);
                if (!child) return null;
                return domify(child);
            },
            attr(name, value) {
                if (value === undefined) return e.attr(name);

                if (e.attr(name) !== undefined) return e.replace(parser, _ => {
                    return e.syntax = e.syntax.replace(new RegExp(`${name}="(.*?)"`, "g"), `${name}="${value}"`);
                });

                return e.replace(parser, _ => {
                    return e.syntax = e.syntax.replace(/<([^ ]*?)(.*?)>(.*?)<\/(\1)>/ms, `<$1$2 ${name}="${value}">$3</$1>`);
                });
            },
            html(value) {
                if (value === undefined) return e.html();

                return e.replace(parser, _ => {
                    return e.syntax = e.syntax.replace(/<([^ ]*?)(.*?)>(.*?)<\/(\1)>/ms, `<$1$2>${value}</$1>`);
                });
            },
            text(b) {
                return e.text(b);
            },
            update
        });

        return domify(elem);
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

            let elem = new MarkupElement(customElement, true);
            elem.setCallback(callback);
            MarkupParser.customElements.add(elem);

        }
        else throw new Error("The provided customElement syntax is invalid, and does not match the known supported syntax types.");

    }
}

module.exports = MarkupParser;