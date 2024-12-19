import { Kysely, sql } from "kysely";
import { snakeCase } from "lodash";

type Options = { functionName?: string; primaryKey?: string };

type Database = any; // Change to your database type
type TablesWithType = { [K in keyof Database]: "type" extends keyof Database[K] ? K : never }[keyof Database];

const makeFunctionName = (subTableName: string) => `enforce_subtype_constraints_${snakeCase(subTableName)}`;
const makeTriggerName = (subTableName: string) => `enforce_constraints_${snakeCase(subTableName)}`;

/**
 * Creates a trigger for tables extended in another table to enforce the type matches the extended table.
 */
export async function createTypeConstraintTrigger<T extends TablesWithType>(
  db: Kysely<Database>,
  tableName: T,
  subTableName: keyof Database,
  type: Database[T]["type"],
  options: Options = {}
) {
  const functionName = options.functionName ?? makeFunctionName(subTableName);
  const triggerName = makeTriggerName(subTableName);
  const primaryKey = options.primaryKey ?? `${tableName.replace(/s$/, "")}Id`;

  await db.executeQuery(
    sql`
    CREATE OR REPLACE FUNCTION ${sql.raw(functionName)}()
    RETURNS TRIGGER AS $$
    BEGIN
      IF (
        SELECT type FROM "${sql.raw(tableName)}" WHERE "${sql.raw(primaryKey)}" = NEW."${sql.raw(primaryKey)}"
      ) != '${sql.raw(type)}' THEN
        RAISE EXCEPTION '${sql.raw(tableName)} type must be ${sql.raw(type)}';
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `.compile(db)
  );

  await db.executeQuery(
    sql`
    CREATE TRIGGER ${sql.raw(triggerName)}
    BEFORE INSERT OR UPDATE ON ${sql.table(subTableName)}
    FOR EACH ROW EXECUTE FUNCTION ${sql.raw(functionName)}();
  `.compile(db)
  );
}

export async function dropTypeConstraintTrigger(
  db: Kysely<Database>,
  subTableName: keyof Database,
  options: Options = {}
) {
  const functionName = options.functionName ?? makeFunctionName(subTableName);
  const triggerName = makeTriggerName(subTableName);

  await db.executeQuery(sql`DROP TRIGGER ${sql.raw(triggerName)} ON ${sql.table(subTableName)};`.compile(db));
  await db.executeQuery(sql`DROP FUNCTION ${sql.raw(functionName)};`.compile(db));
}
