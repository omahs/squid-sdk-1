import {isTsNode} from '@subsquid/util-internal'
import * as path from 'path'
import * as process from 'process'
import type {DataSourceOptions as OrmConfig} from 'typeorm'
import {createConnectionOptions} from './connectionOptions'
import {SnakeNamingStrategy} from './namingStrategy'


export interface OrmOptions {
    projectDir?: string
}


export const MIGRATIONS_DIR = 'db/migrations'


export function createOrmConfig(options?: OrmOptions): OrmConfig {
    let dir = path.resolve(options?.projectDir || process.cwd())
    let model = resolveModel(dir)
    let migrationsDir = path.join(dir, MIGRATIONS_DIR)
    return  {
        type: 'postgres',
        namingStrategy: new SnakeNamingStrategy(),
        entities: [model],
        migrations: [migrationsDir + '/*.js'],
        ...createConnectionOptions()
    }
}


function resolveModel(projectDir: string): string {
    let model = path.join(projectDir, isTsNode() ? 'src/model' : 'lib/model')
    try {
        return require.resolve(model)
    } catch(e: any) {
        throw new Error(
            `Failed to resolve model ${model}. Did you forget to run codegen or compile the code?`
        )
    }
}
