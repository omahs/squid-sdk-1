import {unexpectedCase} from '@subsquid/util-internal'
import assert from 'assert'
import {Base58Bytes} from '../base'
import * as rpc from '../rpc'
import {Block, BlockHeader, Instruction, LogMessage, Transaction} from './data'
import {InvokeMessage, InvokeResultMessage, LogTruncatedMessage, Message, parseLogMessage} from './log-parser'


export function mapRpcBlock(src: rpc.Block): Block {
    let header: BlockHeader = {
        hash: src.hash,
        height: src.height,
        slot: src.slot,
        parentSlot: src.block.parentSlot,
        parentHash: src.block.previousBlockhash,
        timestamp: src.block.blockTime ?? 0
    }

    let instructions: Instruction[] = []
    let log: LogMessage[] = []

    let transactions = src.block.transactions
        ?.map((tx, i) => mapRpcTransaction(i, tx, instructions, log))
        ?? []

    return {
        header,
        transactions,
        instructions,
        log
    }
}


function mapRpcTransaction(
    transactionIndex: number,
    src: rpc.Transaction,
    instructions: Instruction[],
    log: LogMessage[]
): Transaction {
    let tx: Transaction = {
        index: transactionIndex,
        version: src.version,
        accountKeys: src.transaction.message.accountKeys,
        addressTableLookups: src.transaction.message.addressTableLookups ?? [],
        numReadonlySignedAccounts: src.transaction.message.header.numReadonlySignedAccounts,
        numReadonlyUnsignedAccounts: src.transaction.message.header.numReadonlyUnsignedAccounts,
        numRequiredSignatures: src.transaction.message.header.numRequiredSignatures,
        recentBlockhash: src.transaction.message.recentBlockhash,
        signatures: src.transaction.signatures,
        err: src.meta.err,
        computeUnitsConsumed: src.meta.computeUnitsConsumed ?? 0,
        fee: src.meta.fee,
        loadedAddresses: src.meta.loadedAddresses ?? {readonly: [], writable: []}
    }

    let accounts: Base58Bytes[]
    if (tx.version === 'legacy') {
        accounts = tx.accountKeys
    } else {
        assert(src.meta?.loadedAddresses)
        accounts = tx.accountKeys.concat(
            src.meta.loadedAddresses.writable,
            src.meta.loadedAddresses.readonly
        )
    }

    let getAccount = (index: number): Base58Bytes => {
        assert(index < accounts.length)
        return accounts[index]
    }

    new InstructionParser(
        getAccount,
        tx,
        src,
        src.meta.logMessages.map(parseLogMessage),
        instructions,
        log
    ).parse()

    return tx
}


const PROGRAMS_MISSING_INVOKE_LOG = new Set([
    'AddressLookupTab1e1111111111111111111111111',
    'BPFLoader1111111111111111111111111111111111',
    'BPFLoader2111111111111111111111111111111111',
    'BPFLoaderUpgradeab1e11111111111111111111111',
    'KeccakSecp256k11111111111111111111111111111',
    'ZkTokenProof1111111111111111111111111111111',
])


class InstructionParser {
    private pos = 0
    private messagePos = 0
    private messagesTruncated = false
    private errorPos?: number
    private lastAddress: number[] = []

    constructor(
        private getAccount: (index: number) => Base58Bytes,
        private tx: Transaction,
        private src: rpc.Transaction,
        private messages: Message[],
        private instructions: Instruction[],
        private log: LogMessage[]
    ) {
        let err: any = this.src.meta.err
        if (err) {
            if ('InstructionError' in err) {
                let pos = err['InstructionError'][0]
                assert(typeof pos == 'number')
                assert(0 <= pos && pos < this.src.transaction.message.instructions.length)
                this.errorPos = pos
            }
        }
    }

    parse(): void {
        while (this.pos < this.src.transaction.message.instructions.length) {
            let instruction = this.src.transaction.message.instructions[this.pos]

            let inner = this.src.meta.innerInstructions
                ?.filter(i => i.index === this.pos)
                .flatMap(i => i.instructions) ?? []

            if (this.errorPos == null || this.errorPos >= this.pos) {
                let instructions = [instruction].concat(inner)
                let end = this.traverse(instructions, 0, 1)
                assert(end == instructions.length)
            } else {
                this.assert(inner.length == 0, false, 0, 'seemingly non-executed instruction has inner instructions')
                this.push(1, instruction)
            }

            this.pos += 1
        }
    }

    private traverse(
        instructions: rpc.Instruction[],
        pos: number,
        stackHeight: number
    ): number {
        this.assert(pos < instructions.length, true, 0, 'unexpected and of inner instructions')

        let instruction = instructions[pos]

        this.assert(
            instruction.stackHeight == null || instruction.stackHeight == stackHeight,
            false, pos, 'instruction has unexpected stack height'
        )

        let msg: Message | undefined
        if (this.messagePos < this.messages.length) {
            msg = this.messages[this.messagePos]
        }

        if (msg?.kind == 'truncate') {
            this.messagePos += 1
            this.messagesTruncated = true
        }

        if (this.messagesTruncated) {
            this.push(stackHeight, instruction)
            return this.logLessTraversal(stackHeight, instructions, pos + 1)
        }

        let programId = this.getAccount(instruction.programIdIndex)

        if (msg?.kind === 'invoke' && msg.programId === programId) {
            this.assert(msg.stackHeight == stackHeight, true, pos, 'invoke message has unexpected stack height')
            this.messagePos += 1
            return this.invokeInstruction(stackHeight, instructions, pos)
        }

        if (PROGRAMS_MISSING_INVOKE_LOG.has(programId)) {
            this.dropInvokeLessInstructionMessages(pos)
            this.push(stackHeight, instruction)
            return this.invokeLessTraversal(stackHeight, instructions, pos + 1)
        }

        throw this.error(true, pos, 'missing invoke message')
    }

    private dropInvokeLessInstructionMessages(pos: number): void {
        while (this.messagePos < this.messages.length && !this.messagesTruncated) {
            let msg = this.messages[this.messagePos]
            switch(msg.kind) {
                case 'log':
                case 'data':
                case 'cu':
                case 'other':
                    this.messagePos += 1
                    break
                case 'truncate':
                    this.messagePos += 1
                    this.messagesTruncated = true
                    return
                case 'invoke':
                    return
                case 'invoke-result':
                    throw this.error(true, pos, `invoke result message does not match any invoke`)
                default:
                    throw unexpectedCase()
            }
        }
    }

    private invokeInstruction(
        stackHeight: number,
        instructions: rpc.Instruction[],
        instructionPos: number
    ): number {
        let ins = this.push(stackHeight, instructions[instructionPos])
        let pos = instructionPos + 1
        while (true) {
            let token = this.takeInstructionMessages(ins, instructionPos)
            switch(token.kind) {
                case 'invoke':
                    pos = this.traverse(instructions, pos, stackHeight + 1)
                    break
                case 'invoke-result':
                    if (token.programId != ins.programId) {
                        throw this.error(true, instructionPos,
                            `invoke result message and instruction program ids don't match`
                        )
                    }
                    if (token.error) {
                        ins.error = token.error
                    }
                    pos = this.invokeLessTraversal(stackHeight, instructions, pos)
                    this.messagePos += 1
                    return pos
                case 'truncate':
                    return this.logLessTraversal(stackHeight, instructions, pos)
                default:
                    throw unexpectedCase()
            }
        }
    }

    private takeInstructionMessages(
        ins: Instruction,
        pos: number
    ): InvokeMessage | InvokeResultMessage | LogTruncatedMessage {
        if (this.messagesTruncated) return new LogTruncatedMessage()
        while (this.messagePos < this.messages.length) {
            let msg = this.messages[this.messagePos]
            switch(msg.kind) {
                case 'log':
                case 'data':
                case 'other':
                    this.log.push({
                        transactionIndex: ins.transactionIndex,
                        instructionAddress: ins.instructionAddress,
                        programId: ins.programId,
                        kind: msg.kind,
                        message: msg.message
                    })
                    break
                case 'cu':
                    if (ins.programId != msg.programId) {
                        throw this.error(true, pos, 'unexpected programId in compute unit message')
                    }
                    ins.computeUnitsConsumed = toInteger(msg.consumed)
                    break
                case 'invoke':
                case 'invoke-result':
                    return msg
                case 'truncate':
                    this.messagesTruncated = true
                    this.messagePos += 1
                    return msg
                default:
                    throw unexpectedCase()
            }
            this.messagePos += 1
        }
        throw this.error(false, pos, 'unexpected end of log messages')
    }

    private invokeLessTraversal(
        parentStackHeight: number,
        instructions: rpc.Instruction[],
        pos: number
    ): number {
        return this.logLessTraversal(parentStackHeight, instructions, pos, (ins, pos) => {
            if (PROGRAMS_MISSING_INVOKE_LOG.has(ins.programId)) {
            } else {
                throw this.error(false, pos, 'invoke message is missing')
            }
        })
    }

    private logLessTraversal(
        parentStackHeight: number,
        instructions: rpc.Instruction[],
        pos: number,
        cb?: (ins: Instruction, pos: number) => void
    ): number {
        while (pos < instructions.length) {
            let instruction = instructions[pos]
            let stackHeight = instruction.stackHeight ?? 2
            if (stackHeight > parentStackHeight) {
                let ins = this.push(stackHeight, instruction)
                cb?.(ins, pos)
                pos += 1
            } else {
                return pos
            }
        }
        return pos
    }

    private push(stackHeight: number, src: rpc.Instruction): Instruction {
        assert(stackHeight > 0)

        if (src.stackHeight != null) {
            assert(stackHeight === src.stackHeight)
        }

        let address = this.lastAddress.slice()

        while (address.length > stackHeight) {
            address.pop()
        }

        if (address.length === stackHeight) {
            address[stackHeight - 1] += 1
        } else {
            assert(address.length + 1 == stackHeight)
            address[stackHeight - 1] = 0
        }

        let i: Instruction = {
            transactionIndex: this.tx.index,
            instructionAddress: address,
            programId: this.getAccount(src.programIdIndex),
            accounts: src.accounts.map(a => this.getAccount(a)),
            data: src.data
        }

        this.instructions.push(i)
        this.lastAddress = address
        return i
    }

    private assert(ok: unknown, withMessagePos: boolean, innerPos: number, msg: string): asserts ok {
        if (!ok) throw this.error(withMessagePos, innerPos, msg)
    }

    private error(withMessagePos: boolean, innerPos: number, msg: string): Error {
        let loc = `stopped at instruction ${this.pos}`
        if (innerPos > 0) {
            loc += `, inner instruction ${innerPos - 1})`
        }
        if (withMessagePos && this.messagePos < this.messages.length) {
            loc += ` and log message ${this.messagePos}`
        }
        return new Error(
            `Failed to process transaction ${this.tx.signatures[0]}: ${loc}: ${msg}`
        )
    }
}


function toInteger(num: bigint | number | undefined): number | undefined {
    if (num == null) return
    let i = Number(num)
    assert(Number.isSafeInteger(i))
    return i
}
