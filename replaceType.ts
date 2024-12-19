import { Kysely, sql } from "kysely";

export type ReplaceTypeParams = {
  column: string;
  db: Kysely<any>;
  tableName: string;
  typeEnum: Array<string>;
  typeName: string;
};

export default async function replaceType({ column, db, tableName, typeEnum, typeName }: ReplaceTypeParams) {
  await db.executeQuery(sql`ALTER TYPE "${sql.raw(typeName)}" RENAME TO "${sql.raw(typeName)}_old";`.compile(db));
  await db.schema.createType(typeName).asEnum(typeEnum).execute();
  await db.executeQuery(
    sql`ALTER TABLE ${sql.table(tableName)} ALTER COLUMN "${sql.raw(column)}" TYPE "${sql.raw(
      typeName
    )}" USING "${sql.raw(column)}"::text::"${sql.raw(typeName)}";`.compile(db)
  );
  await db.schema.dropType(`${typeName}_old`).execute();
}
