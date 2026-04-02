import { AccentuationPatternDef, AnyDefinition, Definition, DefinitionType, definitionTypes, styleNames } from "./Header"
import { AccentuationPattern, AnyInstruction, InstructionType, instructionTypes, mapNames, Rubato, Style } from "./Dated"
import { Document, Metadata, Scope } from "./Document"

/**
 * Represents an MPM encoding and exposes some methods for
 * easily working with it.
 */
export class MPM {
    doc: Document

    constructor() {
        this.doc = {
            type: 'mpm',
            metadata: [],
            performance: {
                type: 'performance',
                name: 'unknown',
                parts: new Map()
            }
        }
    }

    clone() {
        const newMPM = new MPM()
        newMPM.doc = this.doc
        return newMPM
    }

    /**
     * Returns the instructions at a given date.
     * @param date 
     * @param part If not specified, all parts are considered
     * @todo
     */
    instructionsEffectiveAtDate<T extends AnyInstruction>(date: number, type?: InstructionType, scope?: Scope): T[] {
        const parts: Scope[] = scope !== undefined ? [scope] : [...this.doc.performance.parts.keys()]
        const instructionTypesToGet = type ? [type] : instructionTypes

        const result: T[] = []

        for (const instructionType of instructionTypesToGet) {
            for (const part of parts) {
                const instructions = this.getInstructions<T>(type, part)

                const found = instructions.filter(instruction => (instruction as any).date === date)
                if (found.length) {
                    result.push(...found)
                }

                const ongoingInstruction =
                    instructions.slice().reverse().find(instruction => (instruction as any).date <= date)

                if (!ongoingInstruction) continue

                if (instructionType === 'tempo' || instructionType === 'dynamics' || instructionType === 'movement') {
                    result.push(ongoingInstruction)
                }
                else if (instructionType === 'rubato') {
                    const rubato = ongoingInstruction as T as Rubato
                    if (rubato.loop) result.push(ongoingInstruction)
                    if (date < (rubato.date + rubato.frameLength)) {
                        result.push(ongoingInstruction)
                    }
                }
                else if (instructionType === 'accentuationPattern') {
                    const pattern = ongoingInstruction as T as AccentuationPattern
                    const nameRef = pattern['name.ref']
                    if (nameRef) {
                        const patternDef = this.getDefinition('accentuationPatternDef', nameRef) as AccentuationPatternDef
                        if (patternDef) {
                            const length = (patternDef.length * 720 * 4) / 4
                            if (date < (pattern.date + length)) {
                                result.push(ongoingInstruction)
                            }
                        }
                    }
                }
            }
        }
        return result
    }

    /**
     * Returns the instructions effective in a given range.
     * @param date 
     * @param part If not specified, all parts are considered
     * @todo
     */
    instructionEffectiveInRange<T extends AnyInstruction>(from: number, to: number, type?: InstructionType, part?: Scope): T[] {
        const parts: Scope[] = part !== undefined ? [part] : [...this.doc.performance.parts.keys()]
        const instructionTypesToGet = type ? [type] : instructionTypes

        const result: T[] = []

        for (const instructionType of instructionTypesToGet) {
            for (const part of parts) {
                const instructions = this.getInstructions<T>(type, part)

                const found = instructions.filter(instruction => {
                    const date = (instruction as any).date
                    return date >= from && date < to
                })
                if (found) {
                    result.push(...found)
                }

                const earlierInstruction =
                    instructions.slice().reverse().find((i: any) => i.date < from)

                if (!earlierInstruction) continue

                if (instructionType === 'tempo') {
                    const exactMatch = instructions.find((i: any) => i.date === from)
                    if (!exactMatch) result.push(earlierInstruction)
                }
                else if (instructionType === 'rubato') {
                    const rubato = earlierInstruction as T as Rubato
                    if (rubato.loop) result.push(earlierInstruction)
                    if (from < (rubato.date + rubato.frameLength)) {
                        result.push(earlierInstruction)
                    }
                }
            }
        }
        return result.sort((a, b) => a.date - b.date)
    }

    /**
     * Inserts a definion into its corresponding styles environment
     * in the header of the given part.
     * 
     * @param definition 
     * @param part 
     * @returns name of definition
     */
    insertDefinition(definition: AnyDefinition, scope: Scope): string {
        if (!this.doc.performance.parts.has(scope)) {
            this.doc.performance.parts.set(scope, {
                type: 'part',
                dated: {
                    type: 'dated'
                },
                header: {
                    type: 'header'
                }
            })
        }

        const part = this.doc.performance.parts.get(scope)
        const styleName = styleNames[definition.type]
        if (!styleName) {
            console.log('No style found for', definition.type)
            return
        }

        if (!part.header[styleName]) {
            part.header[styleName] = {
                type: 'styleDef',
                name: 'performance_style',
                defs: []
            }
        }

        const defs = part.header[styleName].defs as (typeof definition)[]
        defs.push(definition)
    }

    /**
     * Calls `insertDefinition` for each element in the given array.
     * @param definitions 
     * @param part 
     */
    insertDefinitions(definitions: AnyDefinition[], scope: Scope) {
        definitions.forEach(definition => {
            this.insertDefinition(definition, scope)
        })
    }

    getAnyDefinition(name: string): AnyDefinition | null {
        for (const [, part] of this.doc.performance.parts.entries()) {
            for (const style of Object.values(styleNames)) {
                if (!part.header[style]) continue

                const defs = part.header[style].defs
                const found = defs.find(d => d.name === name)
                if (found) return found as AnyDefinition
            }
        }
    }

    getDefinition(definitionType: DefinitionType, name: string): AnyDefinition | null {
        for (const [, part] of this.doc.performance.parts.entries()) {
            const style = styleNames[definitionType]
            if (!part.header[style]) continue

            const defs = part.header[style].defs as (Definition<typeof definitionType>)[]
            const found = defs.find(d => d.name === name)
            if (found) return found as AnyDefinition
        }
        return null
    }

    getDefinitions<T extends AnyDefinition>(type: DefinitionType, scope?: Scope): T[] {
        const result = []
        const parts: Scope[] = scope !== undefined ? [scope] : [...this.doc.performance.parts.keys()]
        const defTypeToGet = type ? [type] : definitionTypes

        for (const part of parts) {
            for (const defType of defTypeToGet) {
                if (!this.doc.performance.parts.has(part)) return

                const styleName = styleNames[defType]
                const style = this.doc.performance.parts.get(part).header[styleName]
                if (!style) continue

                const defs = style.defs as T[]
                result.push(...defs)
            }
        }
        return result
    }

    removeDefinition(definition: AnyDefinition) {
        for (const [, part] of this.doc.performance.parts.entries()) {
            const style = styleNames[definition.type]
            if (!part.header[style]) continue

            const defs = part.header[style].defs as (typeof definition)[]
            const index = defs.indexOf(definition)
            if (index !== -1) {
                defs.splice(index, 1)
                return
            }
        }
    }

    /**
     * Based on the given instructions type, this method will
     * insert them into their corresponding map, e.g. <dynamics>
     * elements will be inserted to <dynamicsMap>. After inserting
     * the map will sorted by `date`.
     * 
     * @param instruction 
     * @param part a part number or 'global'
     */
    insertInstructions(instructions: AnyInstruction[], scope: Scope, overwrite = false) {
        for (const instruction of instructions) {
            this.insertInstruction(instruction, scope, overwrite)
        }
    }

    insertInstruction(instruction: AnyInstruction, scope: Scope, overwrite = false) {
        const map = this.insertMap(instruction.type, scope) as (typeof instruction)[]

        const existing = map.find(i => (
            i.date === instruction.date && i.noteid === instruction.noteid
        ))

        if (existing) {
            for (const [k, v] of Object.entries(instruction)) {
                if (!overwrite && existing[k]) continue
                else existing[k] = v;
            }
        }
        else {
            const index = map.findIndex(i => i.date > instruction.date)
            if (index === -1) map.push(instruction)
            else map.splice(index, 0, instruction)
        }
    }

    private insertPart(scope: Scope) {
        if (!this.doc.performance.parts.has(scope)) {
            this.doc.performance.parts.set(scope, {
                type: 'part',
                dated: {
                    type: 'dated'
                },
                header: {
                    type: 'header'
                }
            })
        }

        return this.doc.performance.parts.get(scope)
    }

    private insertMap(instructionType: InstructionType, scope: Scope) {
        const part = this.insertPart(scope)
        const mapName = mapNames[instructionType]
        if (!part.dated[mapName]) {
            part.dated[mapName] = []
        }
        return part.dated[mapName]
    }

    /**
     * Will remove the contents of a given map type.
     */
    removeInstructions(instructionType: InstructionType, scope: Scope) {
        if (!this.doc.performance.parts.has(scope)) return

        const part = this.doc.performance.parts.get(scope)
        const mapName = mapNames[instructionType]
        part.dated[mapName] = []
    }

    /**
     * Removes a specified instruction
     */
    removeInstruction(instruction: AnyInstruction) {
        const parts = this.doc.performance.parts.keys()

        for (const part of parts) {
            const dated = this.doc.performance.parts.get(part).dated
            const mapName = mapNames[instruction.type]
            const map = dated[mapName] as (typeof instruction)[] | undefined
            if (!map) continue

            const index = map.indexOf(instruction)
            if (index !== -1) {
                map.splice(index, 1)
                return
            }
        }
    }

    /**
     * Gets all instructions inside a given map type.
     * @param part If not specified, both, global as well as all local maps will be considered.
     * @param instructionType The instruction type to filter for. If not specified, 
     * all instruction types will be considered.
     * @returns 
     */
    getInstructions<T extends AnyInstruction>(type?: InstructionType, scope?: Scope): T[] {
        // if the user asks for a specific scope 
        // which is not given, we return an empty array
        if (scope !== undefined && !this.doc.performance.parts.has(scope)) {
            return []
        }

        const result = []
        const parts: Scope[] = scope !== undefined ? [scope] : [...this.doc.performance.parts.keys()]
        const instructionTypesToGet = type ? [type] : instructionTypes

        for (const part of parts) {
            for (const instructionType of instructionTypesToGet) {
                const mapName = mapNames[instructionType]

                const partElement = this.doc.performance.parts.get(part)
                if (!partElement) continue

                const map = partElement.dated[mapName]
                if (!map) continue

                result.push(...(map.filter(i => i.type !== 'style') as T[]))
            }
        }
        return result
    }

    insertStyle(style: Style, instructionType: InstructionType, scope: Scope) {
        const map = this.insertMap(instructionType, scope)
        map.push(style)
    }

    getStyles(instructionType: InstructionType, scope: Scope): Style[] {
        const part = this.doc.performance.parts.get(scope)
        const mapName = mapNames[instructionType]
        if (!part.dated[mapName]) return []
        return part.dated[mapName].filter(i => i.type === 'style')
    }

    setPerformanceName(performanceName: string) {
        this.doc.performance.name = performanceName
    }

    setMetadata(metadata: Metadata) {
        this.doc.metadata = metadata
    }
}

