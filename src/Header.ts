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
}

export interface OrnamentDef extends Definition<'ornamentDef'> {
    dynamicsGradient?: DynamicsGradient
    temporalSpread?: TemporalSpread
}

export interface ArticulationDef extends Definition<'articulationDef'> {
    relativeDuration?: number
    absoluteVelocityChange?: number
}

export type AnyDefinition =
    | OrnamentDef
    | ArticulationDef

export const definitionTypes = ['ornamentDef', 'articulationDef'] as const
export type DefinitionType = typeof definitionTypes[number];

export const styleNames = {
    ornamentDef: 'ornamentationStyles',
    articulationDef: 'articulationStyles'
} as const

export const correspondingStyleNameFor = (definitionType: DefinitionType) => {
    return styleNames[definitionType]
}

type WithStylesFor<T> = T extends Definition<infer U>
    ? { [K in typeof styleNames[U & keyof typeof styleNames]]?: T[] }
    : never;

export type Header = UnionToIntersection<WithStylesFor<AnyDefinition>> & Typed<'header'>;

