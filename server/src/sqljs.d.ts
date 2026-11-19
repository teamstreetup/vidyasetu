declare module 'sql.js/dist/sql-wasm-inline.js' {
  export interface SqlStatement {
    bind(values?: unknown[]): boolean;
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    free(): boolean;
  }

  export interface SqlDatabase {
    run(sql: string, params?: unknown[]): SqlDatabase;
    exec(sql: string): unknown[];
    prepare(sql: string): SqlStatement;
    getRowsModified(): number;
    export(): Uint8Array;
    close(): void;
  }

  export interface SqlStatic {
    Database: new (data?: ArrayLike<number> | Uint8Array) => SqlDatabase;
  }

  export default function initSqlJs(config?: Record<string, unknown>): Promise<SqlStatic>;
}
