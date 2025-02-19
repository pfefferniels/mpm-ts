import { NoteOffShift } from './Dated'
import { Typed, UnionToIntersection } from './utils'

export interface Definition<T extends string> extends Typed<T> {
    name: string
}

export interface DynamicsGradient extends Typed<'dynamicsGradient'> {
    'transition.from': number 
    'transition.to': number
}

export interface TemporalSpread extends Typed<'temporalSpread'> {
    'frame.start': number 
    frameLength: number 
    'time.unit': 'ticks' | 'milliseconds'
    'noteoff.shift': NoteOffShift
    intensity?: number
}

export interface OrnamentDef extends Definition<'ornamentDef'> {
    dynamicsGradient?: DynamicsGradient
    temporalSpread?: TemporalSpread
}

export interface ArticulationDef extends Definition<'articulationDef'> {
    relativeDuration?: number
    relativeVelocity?: number
}

export interface Accentuation extends Typed<'accentuation'> {
    beat: number
    value: number
    'transition.from': number
    'transition.to': number
}

export interface AccentuationPatternDef extends Definition<'accentuationPatternDef'> {
    children: Accentuation[]
    length: number
}

export type AnyDefinition =
    | OrnamentDef
    | ArticulationDef
    | AccentuationPatternDef

export const definitionTypes = ['ornamentDef', 'articulationDef', 'accentuationPatternDef'] as const
export type DefinitionType = typeof definitionTypes[number];

export const styleNames = {
    ornamentDef: 'ornamentationStyles',
    articulationDef: 'articulationStyles',
    accentuationPatternDef: 'metricalAccentuationStyles'
} as const

export const correspondingStyleNameFor = (definitionType: DefinitionType) => {
    return styleNames[definitionType]
}

export interface StyleDef<T extends AnyDefinition> extends Typed<'styleDef'> {
    name: string
    defs: T[]
}

type WithStylesFor<T extends AnyDefinition> = T extends Definition<infer U>
    ? { [K in typeof styleNames[U & keyof typeof styleNames]]?: StyleDef<T> }
    : never;

export type Header = UnionToIntersection<WithStylesFor<AnyDefinition>> & Typed<'header'>;

