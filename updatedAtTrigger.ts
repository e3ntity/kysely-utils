import { Kysely, QueryResult, sql } from "kysely";
import { snakeCase } from "lodash";

export async function createUpdatedAtTrigger(tableName: string, db: Kysely<any>): Promise<QueryResult<any>> {
  const triggerName = `update_${snakeCase(tableName)}_updated_at`;

  return await db.executeQuery(
    sql`
    CREATE TRIGGER ${sql.raw(triggerName)}
    BEFORE UPDATE ON ${sql.table(tableName)}
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
    `.compile(db)
  );
}

export async function dropUpdatedAtTrigger(tableName: string, db: Kysely<any>): Promise<QueryResult<any>> {
  const triggerName = `update_${snakeCase(tableName)}_updated_at`;

  return await db.executeQuery(sql`DROP TRIGGER ${sql.raw(triggerName)} ON ${sql.table(tableName)};`.compile(db));
}
