import { column, defineDb, defineTable } from "astro:db";

const User = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    name: column.text({
      unique: true,
    }),
    password: column.text(),
  },
});

const Session = defineTable({
  columns: {
    key: column.text({ primaryKey: true }),
    value: column.text({
      optional: true,
    }),
  },
});

// https://astro.build/db/config
export default defineDb({
  tables: { User, Session },
});
