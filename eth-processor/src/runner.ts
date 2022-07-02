import { Processor } from "./processor"
import axios from "axios"
import { Log } from "./eth"

export class Runner<Store> {
    private processor: Processor<Store>

    constructor(processor: Processor<Store>) {
        this.processor = processor
    }

    async run(): Promise<void> {
        const db = this.processor.getDatabase();
		const archiveEndpoint = this.processor.getArchiveEndpoint();

		const heightAtStart = await db.connect()

        const blockRange = this.processor.getBlockRange()
		const from: number = heightAtStart > blockRange.from ? heightAtStart : blockRange.from
		let to: number;
		if (blockRange.to) {
			to = blockRange.to;
		} else {
			const status = await axios.get(`${archiveEndpoint}/status`);
			to = status.data.number
		}
		
        const batchSize = this.processor.getBatchSize()

        const hooks = this.processor.getHooks().evmLog

        const fieldSelection = this.processor.getFieldSelection()

		for (let start=from; start<to; start += batchSize) {
			const end = start + batchSize > to ? to : start + batchSize;

            const req = {
                fromBlock: start,
                toBlock: end,
                addresses: hooks.map(hook => ({
                    address: hook.options.address,
                    topics: hook.options.topics,
                })),
                fieldSelection,
            };

            const { data: logs } = await axios.post(`${archiveEndpoint}/query`, req);

            for(const rawLog of logs) {
                const log = logFromRaw(rawLog);

                const topics = [log.topic0, log.topic1, log.topic2, log.topic3];

                for (const hook of hooks) {
                    if (hook.options.address === log.address && matchTopics(hook.options.topics, topics)) {
                        await hook.handler({
                            db,
                            log,
                        })
                    }
                }
            }

            await db.advance(end)
		}
    }
}

function logFromRaw(raw: any): Log {
    let tx: any = {};
    let block: any = {};
    let log: any = {};

    for(const key of Object.keys(raw)) {
        if(key.startsWith("log")) {
            log[key.substring(4)] = raw[key];
        } else if(key.startsWith("tx")) {
            tx[key.substring(3)] = raw[key];
        }  else if(key.startsWith("block")) {
            block[key.substring(5)] = raw[key];
        }
    }

	return {
		tx, block, ...log
	}
}

function matchTopics(expected: Array<Array<string> | null>, got: Array<string | undefined | null>): boolean {
    for(let i=0; i<4; ++i) {
        const gotTopic = got[i];
        const expectedTopics = expected[i];

        if (expectedTopics === null) {
            continue;
        }

        const found = expectedTopics.find(topic => {
            return topic === gotTopic;
        });

        if(!found) {
            return false;
        }
    }

    return true;
}