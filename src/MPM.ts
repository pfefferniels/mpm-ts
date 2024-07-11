import { AnyDefinition, Definition, DefinitionType, definitionTypes, styleNames } from "./Header"
import { AnyInstruction, InstructionType, instructionTypes, mapNames, Rubato } from "./Dated"
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
            metadata: {
                type: 'metadata',
                authors: [],
                comments: [],
                relatedResources: []
            },
            performance: {
                type: 'performance',
                name: '',
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
        const parts: Scope[] = scope ? [scope] : [...this.doc.performance.parts.keys()]
        const instructionTypesToGet = type ? [type] : instructionTypes

        const result: T[] = []

        for (const instructionType of instructionTypesToGet) {
            for (const part of parts) {
                const instructions = this.getInstructions<T>(type, part)

                const found = instructions.find(instruction => (instruction as any).date === date)
                if (found) {
                    result.push(found)
                }
                else {
                    const ongoingInstruction =
                        instructions.slice().reverse().find(instruction => (instruction as any).date <= date)

                    if (!ongoingInstruction) continue

                    if (instructionType === 'tempo') {
                        result.push(ongoingInstruction)
                    }
                    else if (instructionType === 'rubato') {
                        const rubato = ongoingInstruction as T as Rubato
                        if (rubato.loop) result.push(ongoingInstruction)
                        if (date < (rubato.date + rubato.frameLength)) {
                            result.push(ongoingInstruction)
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
        const parts: Scope[] = part ? [part] : [...this.doc.performance.parts.keys()]
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
            part.header[styleName] = []
        }

        const style = part.header[styleName] as (typeof definition)[]
        style.push(definition)
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

    getDefinition(definitionType: DefinitionType, name: string): AnyDefinition | null {
        for (const [, part] of this.doc.performance.parts.entries()) {
            const style = styleNames[definitionType]
            const defs = part.header[style] as (Definition<typeof definitionType>)[]
            const found = defs.find(d => d.name === name)
            if (found) return found as AnyDefinition
        }
        return null
    }

    getDefinitions<T extends AnyDefinition>(type: DefinitionType, scope?: Scope): T[] {
        const result = []
        const parts: Scope[] = scope ? [scope] : [...this.doc.performance.parts.keys()]
        const defTypeToGet = type ? [type] : definitionTypes

        for (const part of parts) {
            for (const defType of defTypeToGet) {
                const mapName = styleNames[defType]
                const map = this.doc.performance.parts.get(part).header[mapName] as T[]
                result.push(...map)
            }
        }
        return result
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
        const mapName = mapNames[instruction.type]

        if (!part.dated[mapName]) {
            part.dated[mapName] = []
        }
        const map = part.dated[mapName] as (typeof instruction)[]

        const existing = map.find(i => i.date === instruction.date)
        if (existing && overwrite) {
            // TODO
        }
        else {
            map.push(instruction)
        }
    }

    /**
     * Will remove the contents of a given map type.
     */
    removeInstructions(instructionType: InstructionType, scope: Scope) {
        const part = this.doc.performance.parts.get(scope)
        const mapName = mapNames[instructionType]
        part.dated[mapName] = []
    }

    /**
     * Gets all instructions inside a given map type.
     * @param part If not specified, both, global as well as all local maps will be considered.
     * @param instructionType The instruction type to filter for. If not specified, 
     * all instruction types will be considered.
     * @returns 
     */
    getInstructions<T>(type?: InstructionType, scope?: Scope): T[] {
        // if the user asks for a specific scope 
        // which is not given, we return an empty array
        if (scope !== undefined && !this.doc.performance.parts.has(scope)) {
            return []
        }

        const result = []
        const parts: Scope[] = scope ? [scope] : [...this.doc.performance.parts.keys()]
        const instructionTypesToGet = type ? [type] : instructionTypes

        for (const part of parts) {
            for (const instructionType of instructionTypesToGet) {
                const mapName = mapNames[instructionType]
                const map = this.doc.performance.parts.get(part).dated[mapName] as T[] | undefined
                if (!map) continue

                result.push(...map)
            }
        }
        return result
    }

    setPerformanceName(performanceName: string) {
        this.doc.performance.name = performanceName
    }

    setMetadata(metadata: Metadata) {
        this.doc.metadata = metadata
    }
}
