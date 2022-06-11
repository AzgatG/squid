import type {
    ContractsContractEmittedEvent,
    EvmLogEvent,
    SubstrateCall,
    SubstrateEvent,
    SubstrateExtrinsic,
    SubstrateFinalizationEvent,
    SubstrateInitializationEvent
} from "./substrate"


type Req<T> = {
    [P in keyof T]?: unknown
}


type PlainReq<T> = {
    [P in keyof T]?: boolean
}


type Select<T, R extends Req<T>> = {
    [P in keyof T as R[P] extends true ? P : P extends 'id' | 'pos' | 'name' ? P : never]: T[P]
}


export type WithProp<K extends string, V> = [V] extends [never] ? {} : {
    [k in K]: V
}


type CallScalars = Omit<SubstrateCall, 'parent'>
type ExtrinsicScalars = Omit<SubstrateExtrinsic, 'call'>
type EventScalars<T=SubstrateEvent> = Omit<T, 'call' | 'extrinsic'>


export type CallRequest = PlainReq<CallScalars> & {
    parent?: PlainReq<SubstrateCall> | boolean
}


export type ExtrinsicRequest = PlainReq<ExtrinsicScalars> & {
    call?: CallRequest | boolean
}


export type EventRequest = PlainReq<EventScalars> & {
    call?: CallRequest | boolean
    extrinsic?: ExtrinsicRequest | boolean
    evmTxHash?: boolean
}


type CallFields<R extends CallRequest> = Select<CallScalars, R> & (
    R['parent'] extends true
        ? {parent?: CallFields<R>}
        : R['parent'] extends PlainReq<SubstrateCall>
            ? {parent?: CallFields<R['parent']>}
            : {}
)


export type CallType<R> = R extends true
    ? SubstrateCall
    : R extends CallRequest ? CallFields<R> : never


type ExtrinsicFields<R extends ExtrinsicRequest> = Select<ExtrinsicScalars, R> & (
    R['call'] extends true
        ? {call: SubstrateCall}
        : R['call'] extends CallRequest
            ? {call: CallFields<R['call']>}
            : {}
)


export type ExtrinsicType<R> = R extends true
    ? SubstrateExtrinsic
    : R extends ExtrinsicRequest ? ExtrinsicFields<R> : never


type ApplyExtrinsicFields<R extends EventRequest> = (
    R['call'] extends true
        ? {call: SubstrateCall, phase: 'ApplyExtrinsic'}
        : R['call'] extends CallRequest
            ? {call: CallFields<R['call']>, phase: 'ApplyExtrinsic'}
            : {}
) & (
    R['extrinsic'] extends true
        ? {extrinsic: SubstrateExtrinsic, phase: 'ApplyExtrinsic'}
        : R['extrinsic'] extends ExtrinsicRequest
            ? {extrinsic: ExtrinsicFields<R['extrinsic']>, phase: 'ApplyExtrinsic'}
            : {}
)


type EventFields<R extends EventRequest> =
    (
        Select<SubstrateInitializationEvent | SubstrateFinalizationEvent, R> &
        {extrinsic?: undefined, call?: undefined} & (
            R['call'] extends true | CallRequest
                ? {phase: 'Initialization' | 'Finalization'}
                : R['extrinsic'] extends true | ExtrinsicRequest
                    ? {phase: 'Initialization' | 'Finalization'}
                    : {}
        )
    ) | (
        Select<EventScalars, R> & ApplyExtrinsicFields<R>
    )


type CommonEventType<R> = R extends true
    ? SubstrateEvent
    : R extends EventRequest ? EventFields<R> : never


type EvmLogEventType<R> = R extends true
    ? EvmLogEvent
    : R extends EventRequest
        ? ApplyExtrinsicFields<R> & Select<EventScalars<EvmLogEvent>, R>
        : never


type ContractsContractEmittedEventType<R> = R extends true
    ? ContractsContractEmittedEvent
    : R extends EventRequest
        ? ApplyExtrinsicFields<R> & Select<EventScalars<ContractsContractEmittedEvent>, R>
        : never


export type EventType<R, N = string> =
    N extends 'Contracts.ContractEmitted'
        ? ContractsContractEmittedEventType<R>
        : N extends 'EVM.Log'
            ? EvmLogEventType<R>
            : CommonEventType<R>


export interface EventDataRequest {
    event?: boolean | EventRequest
}


export type EventData<R extends EventDataRequest = {event: true}, N = string>
    = WithProp<'event', EventType<R['event'], N>>


export interface CallDataRequest {
    call?: boolean | CallRequest
    extrinsic?: boolean | ExtrinsicRequest
}


export type CallData<R extends CallDataRequest = {call: true, extrinsic: true}> =
    WithProp<"call", CallType<R["call"]>> &
    WithProp<"extrinsic", ExtrinsicType<R["extrinsic"]>>


type SetName<T, N> = Omit<T, "name"> & {name: N}
type SetItemName<T, P, N> = P extends keyof T
    ? Omit<T, P> & {[p in P]: SetName<T[P], N>} & {name: N}
    : never


type WithKind<K, T> = {kind: K} & {
    [P in keyof T]: T[P]
}


export type EventItem<N, R = false> = WithKind<
    "event",
    SetItemName<
        R extends true ? EventData<{event: true}, N> : R extends EventDataRequest ? EventData<R, N> : EventData<{event: {}}, N>,
        'event',
        N
    >
>


export type CallItem<Name, R = false> = WithKind<
    "call",
    SetItemName<
        R extends true ? CallData : R extends CallDataRequest ? CallData<R> : CallData<{call: {}}>,
        "call",
        Name
        >
    >


export interface DataSelection<R> {
    data: R
}


export interface NoDataSelection {
    data?: undefined
}


export interface MayBeDataSelection<R> {
    data?: R
}
