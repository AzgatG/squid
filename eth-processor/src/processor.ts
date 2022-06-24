import {createLogger, Logger} from "@subsquid/logger"
import {def, runProgram} from "@subsquid/util-internal"
import assert from "assert"
import { Log } from "./eth"
import { LogFieldSelection } from "./fieldSelection"
import { Runner } from "./runner"

export class Processor<Store> {
	protected hooks: { evmLog: Array<EvmLogHandlerEntry<Store>> }
	private blockRange: Range
	private batchSize: number
	private src?: DataSource
	private running: boolean
	private db: Database<Store>

	constructor(db: Database<Store>) {
		this.hooks = {evmLog: []}
		this.blockRange = { from: 0 }
		this.batchSize = 100
		this.db = db
		this.running = false
	}

	/**
     * Sets blockchain data source.
     *
     * @example
     * processor.setDataSource({
     *     archive: 'https://eth.indexer.gc.subsquid.io'
     * })
     */
	setDataSource(src: DataSource): void {
		this.assertNotRunning()
		this.src = src
	}

	/**
     * Limits the range of blocks to be processed.
     *
     * When the upper bound is specified,
     * the processor will terminate with exit code 0 once it reaches it.
     *
     * @example
     * // process only block 100
     * processor.setBlockRange({
     *     from: 100,
     *     to: 100
     * })
     */
	setBlockRange(range: Range): void {
		this.assertNotRunning()
		this.blockRange = range
	}

	/**
     * Sets the maximum number of blocks which can be fetched
     * from the data source in a single request.
     *
     * The default is 100.
     *
     * Usually this setting doesn't have any significant impact on the performance.
     */
    setBatchSize(size: number): void {
        this.assertNotRunning()
        assert(size > 0)
        this.batchSize = size
    }

    addEvmLogHandler(
    	contractAddress: string,
    	options: EvmLogOptions,
    	fn: EvmLogHandler<Store>
    ): void {
    	this.assertNotRunning()
    	this.hooks.evmLog.push({
    		handler: fn,
    		contractAddress,
    		...options
    	})
    }

    protected assertNotRunning(): void {
        if (this.running) {
            throw new Error('Settings modifications are not allowed after start of processing')
        }
    }

    @def
    public getLogger(): Logger {
        return createLogger('eth:processor')
    }

    public getDatabase() {
        return this.db
    }

    public getArchiveEndpoint(): string {
        let url = this.src?.archive
        if (url == null) {
            throw new Error('use .setDataSource() to specify archive url')
        }
        return url
    }

    public getBlockRange(): Range {
        return this.blockRange
    }

    public getBatchSize(): number {
        return this.batchSize
    }

    public getHooks(): Hooks<Store> {
        return this.hooks
    }

    run(): void {
    	if(this.running) {
    		return
    	}
    	this.running = true
    	runProgram(async () => {
    		await new Runner(this).run()
    	}, err => {
    		this.getLogger().fatal(err)
    	})
    }
}

export interface Range {
    from: number
    to?: number
}

export interface Options {
    batchSize?: number
    blockRange?: Range
}

export interface Database<S> {
    connect(): Promise<number>
    transact(from: number, to: number, cb: (store: S) => Promise<void>): Promise<void>
    advance(height: number): Promise<void>
}

export interface DataSource {
	archive: string
}

export interface EvmLogOptions {
	fieldSelection: LogFieldSelection
}

type EvmLogHandlerEntry<Store> = {
	handler: EvmLogHandler<Store>,
	contractAddress: string,
} & EvmLogOptions

export interface EvmLogHandler<Store> {
    (ctx: EvmLogHandlerContext<Store>): Promise<void>
}

export interface EvmLogHandlerContext<Store> {
	db: Database<Store>,
	log: Log,
}

export interface Hooks<Store> {
    evmLog: Array<EvmLogHandlerEntry<Store>>
}
