import { Typed, UnionToIntersection } from "./utils"

interface WithXmlId {
    'xml:id': string
}

export interface Style extends WithXmlId, Typed<'style'> {
    date: number
    'name.ref': string 
    defaultArticulation?: string
}

export interface DatedInstruction<T extends string> extends Typed<T> {
    date: number

    // optionally, a particular note can be specified
    noteid?: string

    // all instructions can be referencing a definition
    'name.ref'?: string
}

/**
 * Maps the <dynamics> element of MPM
 */
export interface Dynamics extends DatedInstruction<'dynamics'>, WithXmlId {
    'volume': number | string
    'transition.to'?: number
    'protraction'?: number
    'curvature'?: number
}

/**
 * Maps the <movement> element of MPM
 */
export interface Movement extends DatedInstruction<'movement'>, WithXmlId {
    'position': number
    'controller': 'sustain' | 'soft'
    'transition.to'?: number
    'protraction'?: number
    'curvature'?: number
}

/**
 * Maps the <tempo> element of MPM
 */
export interface Tempo extends DatedInstruction<'tempo'>, WithXmlId {
    'bpm': number
    'beatLength': number
    'transition.to'?: number
    'meanTempoAt'?: number
}

/**
 * Maps the <asynchrony> element of MPM
 */
export interface Asynchrony extends DatedInstruction<'asynchrony'>, WithXmlId {
    'milliseconds.offset': number
}

/**
 * Maps the <articulation> element of MPM
 */
export interface Articulation extends DatedInstruction<'articulation'>, WithXmlId {
    relativeDuration?: number
    relativeVelocity?: number
    absoluteDuration?: number
    absoluteDurationChange?: number
}

export type NoteOffShift = boolean | 'monophonic'

/**
 * Maps the <ornament> element of MPM
 */
export interface Ornament extends DatedInstruction<'ornament'>, WithXmlId {
    'name.ref': string
    'note.order'?: string
    'frameLength'?: number
    'frame.start'?: number
    'noteoff.shift'?: NoteOffShift,
    'intensity'?: number
    'transition.from'?: number
    'transition.to'?: number
    'time.unit'?: 'ticks' | 'milliseconds'
    'scale'?: number
}

/**
 * Maps the <rubato> element of MPM
 */
export interface Rubato extends DatedInstruction<'rubato'>, WithXmlId {
    frameLength: number
    loop?: boolean
    intensity?: number
    lateStart?: number 
    earlyEnd?: number
}

/**
 * Maps the <accentuationPattern> element of MPM
 */
export interface AccentuationPattern extends DatedInstruction<'accentuationPattern'>, WithXmlId {
    'name.ref': string
    loop: boolean
    scale: number
}

export type AnyInstruction =
    | Articulation
    | Asynchrony
    | Dynamics
    | Movement
    | Ornament
    | Rubato
    | Tempo
    | AccentuationPattern

export const instructionTypes =
    [
        'articulation',
        'asynchrony',
        'dynamics',
        'movement',
        'ornament',
        'rubato',
        'tempo',
        'accentuationPattern'
    ] as const

export type InstructionType = typeof instructionTypes[number]

export const mapNames = {
    'articulation': 'articulationMap',
    'asynchrony': 'asynchronyMap',
    'dynamics': 'dynamicsMap',
    'movement': 'movementMap',
    'ornament': 'ornamentationMap',
    'rubato': 'rubatoMap',
    'tempo': 'tempoMap',
    'accentuationPattern': 'metricalAccentuationMap'
} as const

// Utility type to map instruction types to their respective array types using infer
export type WithMapsFor<T> = T extends DatedInstruction<infer U>
    ? { [K in typeof mapNames[U & keyof typeof mapNames]]?: (T | Style)[] }
    : never;

export type Dated =
    & UnionToIntersection<WithMapsFor<AnyInstruction>>
    & Typed<'dated'>
