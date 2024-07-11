import { NoteOffShift } from './Dated'
import { Typed, UnionToIntersection } from './utils'

export interface Definition<T extends string> extends Typed<T> {
    name: string
}

export interface OrnamentDef extends Definition<'ornamentDef'> {
    frameLength: number
    'frame.start': number
    'noteoff.shift': NoteOffShift,
    'transition.from': number
    'transition.to': number
    'time.unit': 'ticks' | 'milliseconds'
}

export interface ArticulationDef extends Definition<'articulationDef'> {
    relativeDuration: number
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

