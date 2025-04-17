import { Dated } from "./Dated"
import { Header } from "./Header"
import { Typed } from "./utils"

export interface Part extends Typed<'part'> {
    header: Header
    dated: Dated
}

/**
 * A part can be specified as either a given
 * part number or global. This definition is 
 * used in both, MSM and MPM.
 */
export type Scope = number | 'global'

export interface Performance extends Typed<'performance'> {
    name: string
    parts: Map<Scope, Part>
}

export type RelatedResource = {
    uri: string
    type: string
}

export interface Author extends Typed<'author'> {
    number: number 
    text: string
}

export interface Comment extends Typed<'comment'> {
    text: string
}

export interface Note extends Typed<'note'> {
    text: string
}

export interface TransformationInfo extends Typed<'transformation'> {
    'xml:id': string
    name: string
    cdata: string
    children: Note[]
}

export interface AppInfo extends Typed<'appInfo'> {
    version: string
    name: string
    url: string

    children: TransformationInfo[]
}

export type Metadata = (Author | Comment | RelatedResource | AppInfo)[]

export interface Document extends Typed<'mpm'> {
    performance: Performance
    metadata: Metadata
}

