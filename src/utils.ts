export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

export interface Typed<T extends string> {
    readonly type: T
}

