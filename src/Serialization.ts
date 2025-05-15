import { v4 } from "uuid"
import { MPM } from "."
import { Articulation, Asynchrony, Dated, Dynamics, Movement, Ornament, Rubato, Tempo } from "./Dated"
import { Scope, Performance, Part, Document } from "./Document"
import { AnyDefinition, Header, OrnamentDef, StyleDef } from "./Header"
import { XMLBuilder } from "fast-xml-parser"

type AnyNode = Performance | Part | Document | Dated | Header | StyleDef<AnyDefinition>

const handleHeader = (header: Header) => {
    return {
        header: Object
            .entries(header)
            .filter(([k,]) => k !== 'type')
            .map(([k, v]) => {
                const obj = {}
                obj[k] = [handleNode(v)]
                return obj
            })
    }
}

const handleDated = (dated: Dated) => {
    return {
        dated: Object
            .entries(dated)
            .filter(([k,]) => k !== 'type')
            .map(([k, v]) => {
                const arr = []
                if (Array.isArray(v)) {
                    for (const instruction of v) {
                        arr.push(handleNode(instruction))
                    }
                }

                const obj = {}
                obj[k] = arr

                return obj
            })
    }
}

const handleStyleDef = (styleDef: StyleDef<AnyDefinition>) => {
    return {
        styleDef: styleDef.defs.map(def => handleNode(def)),
        ':@': {
            '@_name': styleDef.name
        }
    }
}

const handlePerformance = (p: Performance) => {
    return {
        performance: [...p.parts].map(([scope, part]) => {
            if (scope === 'global') {
                return {
                    global: [
                        handleNode(part.header),
                        handleNode(part.dated)
                    ]
                }
            }

            return {
                part: [
                    handleNode(part.header),
                    handleNode(part.dated)
                ],
                ':@': {
                    '@_midi.port': 0,
                    '@_midi.channel': scope,
                    '@_number': scope + 1,
                    '@_name': `part_${scope}`
                }
            }
        }),
        ':@': {
            '@_name': p.name,
            '@_pulsesPerQuarter': 720
        }
    }
}

const handlers: { [K in AnyNode['type']]?: (node: AnyNode) => object } = {
    performance: handlePerformance,
    styleDef: handleStyleDef,
    dated: handleDated,
    header: handleHeader
}

export const handleNode = <T extends { type: string }>(node: T) => {
    if (!handlers[node.type]) {
        // use default
        const children = []
        const attrs = {}
        Object.entries(node as object).forEach(([k, v]) => {
            if (v === undefined) return

            if (k === 'type') return
            else if (k === 'type_') k = 'type'
            else if (k === 'text' && typeof v === 'string') {
                children.push({
                    '#text': v
                })
                return
            }
            else if (k === 'cdata') {
                children.push({
                    '__cdata': [
                        {
                            '#text': v
                        }
                    ]
                })
                return
            }

            if (typeof v === 'number' || typeof v === 'string') {
                attrs[`@_${k}`] = v
            }
            else if (typeof v === 'boolean') {
                attrs[`@_${k}`] = v ? 'true' : 'false'
            }
            else if (Array.isArray(v)) {
                if (k === 'children') {
                    children.push(...v.map(node => handleNode(node)))
                }
                else {
                    const obj = {}
                    obj[k] = v.map(node => handleNode(node))
                    children.push(obj)
                }
            }
            else {
                children.push(handleNode(v))
            }
        })

        const obj = {}
        obj[node.type] = children
        obj[':@'] = attrs
        return obj
    }
    else {
        return handlers[node.type](node)
    }
}

export const exportMPM = (mpm: MPM): string => {
    const root = handleNode(mpm.doc)

    const builder = new XMLBuilder({
        preserveOrder: true,
        ignoreAttributes: false,
        format: true,
        cdataPropName: '__cdata'
    })

    return builder.build([root])
}

const parsePart = (scope: Scope, element: Element, mpm: MPM) => {
    const ornamentDefs = [...element.querySelectorAll('ornamentDef')].map(el => {
        const name = el.getAttribute('name')
        const temporalSpread = el.querySelector('temporalSpread')
        const dynamicsGradient = el.querySelector('dynamicsGradient')
        return {
            'name': name,
            'frame.start': +temporalSpread?.getAttribute('frame.start'),
            'frameLength': +temporalSpread?.getAttribute('frameLength'),
            'noteoff.shift': temporalSpread?.getAttribute('noteoff.shift'),
            'time.unit': temporalSpread?.getAttribute('time.unit') as 'ticks' | 'milliseconds',
            'transition.from': +dynamicsGradient?.getAttribute('transition.from'),
            'transition.to': +dynamicsGradient?.getAttribute('transition.to'),
            'type': 'ornamentDef'
        } as OrnamentDef
    })

    const dynamics = [...element.querySelectorAll('dynamics')].map(el => {
        const result: Dynamics = {
            type: 'dynamics',
            date: +(el.getAttribute('date') || 0),
            volume: +(el.getAttribute('volume') || 0),
            'xml:id': el.getAttribute('xml:id') || `ornament_${v4()}`,
            'transition.to': (+el.getAttribute('transition.to')) || undefined,
            protraction: (+el.getAttribute('protraction')) || undefined,
            noteid: el.getAttribute('noteid') || undefined
        }
        return result
    })

    const movements = [...element.querySelectorAll('movement')].map(el => {
        const result: Movement = {
            type: 'movement',
            date: +(el.getAttribute('date') || 0),
            position: +(el.getAttribute('position') || 0),
            controller: el.getAttribute('controller') as 'sustain' | 'soft',
            'xml:id': el.getAttribute('xml:id') || `movement_${v4()}`,
            'transition.to': (+el.getAttribute('transition.to')) || undefined,
            protraction: (+el.getAttribute('protraction')) || undefined,
        }
        return result
    })

    const ornaments = [...element.querySelectorAll('ornament')].map(el => {
        const result: Ornament = {
            type: 'ornament' as 'ornament',
            date: +(el.getAttribute('date') || 0),
            "name.ref": el.getAttribute('name.ref') || '',
            'note.order': el.getAttribute('note.order') || '',
            scale: +(el.getAttribute('scale') || ''),
            'xml:id': el.getAttribute('xml:id') || `ornament_${v4()}`
        }

        const noteId = el.getAttribute('noteid')
        if (noteId) result.noteid = noteId
        return result
    })

    const tempos = [...element.querySelectorAll('tempo')].map(el => {
        const result: Tempo = {
            type: 'tempo' as 'tempo',
            date: +(el.getAttribute('date') || 0),
            bpm: +(el.getAttribute('bpm') || ''),
            beatLength: +(el.getAttribute('beatLength') || ''),
            'xml:id': el.getAttribute('xml:id') || `tempo_${v4()}`
        }

        const meanTempoAt = el.getAttribute('meanTempoAt')
        if (meanTempoAt) {
            result.meanTempoAt = +meanTempoAt
        }

        const transitionTo = el.getAttribute('transition.to')
        if (transitionTo) {
            result["transition.to"] = +transitionTo
        }


        const noteId = el.getAttribute('noteid')
        if (noteId) result.noteid = noteId
        return result
    })

    const articulations = [...element.querySelectorAll('articulation')].map(el => {
        const result: Articulation = {
            type: 'articulation' as 'articulation',
            date: +(el.getAttribute('date') || 0),
            relativeDuration: +(el.getAttribute('relativeDuration') || ''),
            relativeVelocity: +(el.getAttribute('relativeVelocity') || ''),
            'xml:id': el.getAttribute('xml:id') || `articulation_${v4()}`
        }

        const noteId = el.getAttribute('noteid')
        if (noteId) result.noteid = noteId
        return result
    })

    const asynchronies = [...element.querySelectorAll('asynchrony')].map(el => {
        const result: Asynchrony = {
            type: 'asynchrony' as 'asynchrony',
            date: +(el.getAttribute('date') || 0),
            'milliseconds.offset': +(el.getAttribute('milliseconds.offset') || ''),
            'xml:id': el.getAttribute('xml:id') || `asynchrony_${v4()}`
        }

        const noteId = el.getAttribute('noteid')
        if (noteId) result.noteid = noteId
        return result
    })

    const rubatos = [...element.querySelectorAll('rubato')].map(el => {
        const result: Rubato = {
            type: 'rubato' as 'rubato',
            date: +(el.getAttribute('date') || 0),
            frameLength: +(el.getAttribute('frameLength') || ''),
            loop: el.getAttribute('loop') === 'true',
            intensity: +(el.getAttribute('intensity') || ''),
            'xml:id': el.getAttribute('xml:id') || `rubato_${v4()}`
        }
        return result
    })

    mpm.insertInstructions(dynamics, scope)
    mpm.insertInstructions(movements, scope)
    mpm.insertInstructions(ornaments, scope)
    mpm.insertInstructions(tempos, scope)
    mpm.insertInstructions(asynchronies, scope)
    mpm.insertInstructions(articulations, scope)
    mpm.insertInstructions(rubatos, scope)
    mpm.insertDefinitions(ornamentDefs, scope)
}

export const parseMPM = (xml: string) => {
    const dom = new DOMParser().parseFromString(xml, 'application/xml')
    const mpm = new MPM()

    const global = dom.querySelector('global')
    if (global) {
        parsePart('global', global, mpm)
    }

    const parts = dom.querySelectorAll('part[number]')
    for (const part of parts) {
        parsePart(+part.getAttribute('number'), part, mpm)
    }

    return mpm
} 
