import { XMLParser } from "fast-xml-parser";
import { MPM } from ".";

export const importMPM = (xml: string): MPM => {
    const parser = new XMLParser({
        preserveOrder: true,
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        cdataPropName: "__cdata"
    });

    const parsed = parser.parse(xml) as any;

    const rootNode = parsed.find((node: any) => typeof node === 'object');
    if (!rootNode) throw new Error("Invalid XML: no root element");

    const mpm = new MPM();
    mpm.doc = parseNode(rootNode)
    return mpm;
}

const parseNode = (node: any): any => {
    const tag = Object.keys(node).find(k => k !== ':@');
    const attrs = node[':@'] || {}

    for (const [key, value] of Object.entries(attrs)) {
        if (key.startsWith('@_')) {
            attrs[key.slice(2)] = value;
            delete attrs[key];
        }
    }

    for (const [key, value] of Object.entries(attrs)) {
        if (typeof value === 'string' && !isNaN(Number(value))) {
            attrs[key] = Number(value);
        }
    }

    if (tag === 'mpm') {
        return {
            type: 'mpm',
            performance: parseNode(node[tag].find(obj => 'performance' in obj)),
            metadata: parseNode(node[tag].find(obj => 'metadata' in obj)),
        }
    }
    else if (tag === 'performance') {
        return {
            type: 'performance',
            name: attrs.name,
            parts: new Map(
                node[tag]
                    .filter(obj => ('part' in obj) || ('global' in obj))
                    .map(obj => parseNode(obj))
            ),
        }
    }
    else if (tag === 'part' || tag === 'global') {
        return [
            tag === 'global' ? 'global' : attrs.number,
            {
                type: 'part',
                ...attrs,
                header: parseNode(node[tag].find(obj => 'header' in obj)),
                dated: parseNode(node[tag].find(obj => 'dated' in obj)),
            }
        ]
    }
    else if (tag === 'dated') {
        const result = {
            type: tag,
            ...attrs
        }

        for (const datedNode of node[tag]) {
            const datedTag = Object.keys(datedNode).find(k => k !== ':@');
            if (datedTag) {
                result[datedTag] = datedNode[datedTag].map(parseNode);
            }
        }

        return result;
    }
    else if (tag === 'header') {
        const result = {
            type: tag,
            ...attrs
        }

        for (const styleNode of node[tag]) {
            const styleTag = Object.keys(styleNode).find(k => k !== ':@');
            if (styleTag
                && Array.isArray(styleNode[styleTag])
                && styleNode[styleTag].length > 0
            ) {
                result[styleTag] = parseNode(styleNode[styleTag][0]);
            }
        }

        return result;
    }
    else if (tag === 'styleDef') {
        return {
            type: 'styleDef',
            ...attrs,
            defs: node[tag].map(obj => parseNode(obj))
        }
    }
    else if (tag === 'metadata') {
        return node[tag].map(obj => parseNode(obj));
    }

    if (Array.isArray(node[tag])) {
        const textNode = node[tag].find(obj => '#text' in obj);
        if (textNode) {
            attrs.text = textNode['#text'];
        }

        const cdataNode = node[tag].find(obj => '__cdata' in obj);
        if (cdataNode
            && Array.isArray(cdataNode['__cdata'])
            && cdataNode['__cdata'].length > 0
            && cdataNode['__cdata'][0]['#text']
        ) {
            attrs.cdata = cdataNode['__cdata'][0]['#text'];
        }
    }

    return {
        'type': tag,
        ...attrs,
        children:
            Array.isArray(node[tag])
                ? node[tag].map(obj => {
                    return parseNode(obj)
                })
                : []
    }
}
