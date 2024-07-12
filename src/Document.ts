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

type RelatedResource = {
    uri: string
    type: string
}

interface Author extends Typed<'author'> {
    number: number 
    text: string
}

interface Comment extends Typed<'comment'> {
    text: string
}

export type Metadata = (Author | Comment | RelatedResource)[]

export interface Document extends Typed<'mpm'> {
    performance: Performance
    metadata: Metadata
}

