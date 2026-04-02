import { column, defineDb, defineTable, sql } from "astro:db";

const User = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    name: column.text({
      unique: true
    }),
    password: column.text()
  },
});

const Todo = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    title: column.text(),
    completed: column.boolean({ default: false }),
    user: column.number({
      references: () => User.columns.id,
    }),
  },
});

const Session = defineTable({
  columns: {
    key: column.text({ primaryKey: true }),
    value: column.text({
      optional: true
    }),
    createdAt: column.number({
      name: "created_at",
      default: sql`CURRENT_TIMESTAMP`
    }),
    updatedAt: column.number({
      name: "updated_at",
      default: sql`CURRENT_TIMESTAMP`
    })
  },
});

// https://astro.build/db/config
export default defineDb({
  tables: { User, Todo, Session },
});
