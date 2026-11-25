const QueryHelper = require('./queryHelper');
const knex = require('knex');

describe('QueryHelper Unit & Contract Tests', () => {
  let mockKnex;

  beforeAll(() => {
    mockKnex = knex({ client: 'pg' });
  });

  afterAll(async () => {
    await mockKnex.destroy();
  });

  describe('Critical Query Isolation & Reuse', () => {
    it('produces independent query chains when repository-level this.sql is reused', () => {
      const sql = new QueryHelper('users', null, mockKnex);

      const queryA = sql
        .select()
        .field('uuid')
        .where('uuid', '=', 'first-uuid');

      const queryB = sql
        .select()
        .field('email')
        .where('uuid', '=', 'second-uuid');

      const sqlA = queryA.toSQL();
      const sqlB = queryB.toSQL();

      expect(sqlA.sql).toBe('select "uuid" from "users" where "uuid" = ?');
      expect(sqlA.bindings).toEqual(['first-uuid']);

      expect(sqlB.sql).toBe('select "email" from "users" where "uuid" = ?');
      expect(sqlB.bindings).toEqual(['second-uuid']);

      // queryA and queryB must be completely independent
      expect(sqlA.sql).not.toContain('email');
      expect(sqlB.sql).not.toContain('first-uuid');
    });

    it('supports concurrent query construction without leaking state', () => {
      const sql = new QueryHelper('sph_form_wizards', null, mockKnex);

      const q1 = sql.select().field('uuid').field('name').where('is_active', '=', true);
      const q2 = sql.select().field('uuid').where('created_by', '=', 'admin-1');
      const q3 = sql.count('*', 'total').where('status', '=', 'published');

      expect(q1.toSQL().sql).toBe('select "uuid", "name" from "sph_form_wizards" where "is_active" = ?');
      expect(q1.toSQL().bindings).toEqual([true]);

      expect(q2.toSQL().sql).toBe('select "uuid" from "sph_form_wizards" where "created_by" = ?');
      expect(q2.toSQL().bindings).toEqual(['admin-1']);

      expect(q3.toSQL().sql).toBe('select count(*) as "total" from "sph_form_wizards" where "status" = ?');
      expect(q3.toSQL().bindings).toEqual(['published']);
    });

    it('supports multiple table-bound instances in same repository', () => {
      const sqlWizards = new QueryHelper('sph_form_wizards', 'w', mockKnex);
      const sqlPhases = new QueryHelper('sph_form_wizard_phases', 'p', mockKnex);

      const qW = sqlWizards.select().field('w.uuid').where('w.uuid', '=', 'wiz-1');
      const qP = sqlPhases.select().field('p.uuid').where('p.wizard_uuid', '=', 'wiz-1');

      expect(qW.toSQL().sql).toBe('select "w"."uuid" from "sph_form_wizards" as "w" where "w"."uuid" = ?');
      expect(qW.toSQL().bindings).toEqual(['wiz-1']);

      expect(qP.toSQL().sql).toBe('select "p"."uuid" from "sph_form_wizard_phases" as "p" where "p"."wizard_uuid" = ?');
      expect(qP.toSQL().bindings).toEqual(['wiz-1']);
    });
  });

  describe('Sofy-Style SELECT Convention & Empty SELECT Protection', () => {
    it('requires explicit field selection via .field() or .fields()', () => {
      const q = new QueryHelper('users', null, mockKnex)
        .select()
        .field('u.uuid')
        .field('u.email')
        .field('r.name as role_name');

      const sql = q.toSQL();
      expect(sql.sql).toBe('select "u"."uuid", "u"."email", "r"."name" as "role_name" from "users"');
    });

    it('supports selecting all fields explicitly via .field("*")', () => {
      const q = new QueryHelper('users', null, mockKnex).select().field('*');
      expect(q.toSQL().sql).toBe('select * from "users"');
    });

    it('rejects unfinished empty SELECT queries at build time', () => {
      const q = new QueryHelper('users', null, mockKnex).select();
      expect(() => q.build()).toThrow(/SELECT query requires at least one field/);
    });

    it('rejects build() called on uninitialized table definition', () => {
      const tableDef = new QueryHelper('users', null, mockKnex);
      expect(() => tableDef.build()).toThrow(/No query has been initialized/);
    });

    it('supports fields() with arrays and comma-separated columns', () => {
      const q1 = new QueryHelper('users', null, mockKnex).select().fields('uuid', 'email');
      expect(q1.toSQL().sql).toBe('select "uuid", "email" from "users"');

      const q2 = new QueryHelper('users', null, mockKnex).select().fields(['uuid', 'email']);
      expect(q2.toSQL().sql).toBe('select "uuid", "email" from "users"');
    });

    it('generates count and countDistinct with alias', () => {
      const qCount = new QueryHelper('users', null, mockKnex).count('*', 'userCount');
      expect(qCount.toSQL().sql).toBe('select count(*) as "userCount" from "users"');

      const qDist = new QueryHelper('users', null, mockKnex).countDistinct('email', 'distinctEmails');
      expect(qDist.toSQL().sql).toBe('select count(distinct "email") as "distinctEmails" from "users"');
    });
  });

  describe('Mutations (INSERT / UPDATE / DELETE)', () => {
    it('generates INSERT with returning * for PostgreSQL', () => {
      const q = new QueryHelper('users', null, mockKnex).insert({
        uuid: 'u-1',
        email: 'test@example.com'
      });
      const sql = q.toSQL();
      expect(sql.sql).toBe('insert into "users" ("email", "uuid") values (?, ?) returning *');
      expect(sql.bindings).toEqual(['test@example.com', 'u-1']);
    });

    it('generates UPDATE with returning * for PostgreSQL', () => {
      const q = new QueryHelper('users', null, mockKnex)
        .where('uuid', '=', 'u-1')
        .update({ email: 'new@example.com' });

      const sql = q.toSQL();
      expect(sql.sql).toBe('update "users" set "email" = ? where "uuid" = ? returning *');
      expect(sql.bindings).toEqual(['new@example.com', 'u-1']);
    });

    it('supports update before where as well as where before update', () => {
      const q1 = new QueryHelper('users', null, mockKnex)
        .update({ status: 'active' })
        .where('uuid', '=', 'u-1');

      const q2 = new QueryHelper('users', null, mockKnex)
        .where('uuid', '=', 'u-1')
        .update({ status: 'active' });

      expect(q1.toSQL().sql).toBe(q2.toSQL().sql);
      expect(q1.toSQL().bindings).toEqual(q2.toSQL().bindings);
    });

    it('generates DELETE with returning * for PostgreSQL', () => {
      const q = new QueryHelper('users', null, mockKnex)
        .delete()
        .where('uuid', '=', 'u-1');

      const sql = q.toSQL();
      expect(sql.sql).toBe('delete from "users" where "uuid" = ? returning *');
      expect(sql.bindings).toEqual(['u-1']);
    });

    it('rejects undefined/null/empty payload for insert and update', () => {
      const sql = new QueryHelper('users', null, mockKnex);
      expect(() => sql.insert(undefined)).toThrow(/cannot be undefined or null/);
      expect(() => sql.insert({})).toThrow(/cannot be empty/);
      expect(() => sql.update(null)).toThrow(/cannot be undefined or null/);
      expect(() => sql.update({})).toThrow(/cannot be an empty object/);
    });
  });

  describe('WHERE Conditions & Validation', () => {
    it('correctly forwards arguments in and() and orWhere() without leaking undefined', () => {
      const q = new QueryHelper('users', null, mockKnex)
        .select()
        .field('uuid')
        .where('status', 'ACTIVE')
        .and('is_email_verified', true)
        .orWhere('role', 'SUPER_ADMIN');

      const sql = q.toSQL();
      expect(sql.sql).toBe('select "uuid" from "users" where "status" = ? and "is_email_verified" = ? or "role" = ?');
      expect(sql.bindings).toEqual(['ACTIVE', true, 'SUPER_ADMIN']);
    });

    it('rejects undefined bindings with clear meaningful error', () => {
      const sql = new QueryHelper('users', null, mockKnex);

      expect(() => {
        sql.where('uuid', '=', undefined);
      }).toThrow(/Column "uuid" cannot have an undefined value in where clause/);

      expect(() => {
        sql.where('uuid', undefined);
      }).toThrow(/Column "uuid" cannot have an undefined value in where clause/);

      expect(() => {
        sql.or('uuid', '=', undefined);
      }).toThrow(/Column "uuid" cannot have an undefined value in where clause/);
    });

    it('rejects null in where() and mandates whereNull()', () => {
      const sql = new QueryHelper('users', null, mockKnex);
      expect(() => sql.where('archived_at', '=', null)).toThrow(/Ambiguous null comparison/);
      expect(() => sql.where('archived_at', null)).toThrow(/Ambiguous null comparison/);
    });

    it('rejects in and between operators passed to where()', () => {
      const sql = new QueryHelper('users', null, mockKnex);
      expect(() => sql.where('uuid', 'in', ['u1', 'u2'])).toThrow(/Use .whereIn\(\)/);
      expect(() => sql.where('created_at', 'between', ['2026-01-01', '2026-02-01'])).toThrow(/Use .whereBetween\(\)/);
    });

    it('rejects unsupported operators', () => {
      const sql = new QueryHelper('users', null, mockKnex);
      expect(() => {
        sql.where('uuid', 'INVALID_OP', 'test-uuid');
      }).toThrow(/Unsupported operator "INVALID_OP" in where clause/);
    });

    it('supports standard comparison operators and alias mapping', () => {
      const q = new QueryHelper('items', null, mockKnex)
        .select()
        .field('*')
        .where('price', '>', 100)
        .where('quantity', 'gte', 10)
        .where('status', 'eq', 'active')
        .where('deleted', 'neq', true);

      const sql = q.toSQL();
      expect(sql.sql).toBe('select * from "items" where "price" > ? and "quantity" >= ? and "status" = ? and "deleted" != ?');
      expect(sql.bindings).toEqual([100, 10, 'active', true]);
    });

    it('correctly handles whereNull and whereNotNull', () => {
      const q = new QueryHelper('users', null, mockKnex)
        .select()
        .field('*')
        .whereNull('archived_at')
        .whereNotNull('verified_at');

      const sql = q.toSQL();
      expect(sql.sql).toBe('select * from "users" where "archived_at" is null and "verified_at" is not null');
    });

    it('validates whereIn, whereNotIn, and whereBetween', () => {
      const sql = new QueryHelper('users', null, mockKnex);

      expect(() => sql.whereIn('id', 'not-an-array')).toThrow(/must be an array/);
      expect(() => sql.whereIn('id', [undefined])).toThrow(/cannot contain undefined elements/);
      expect(() => sql.whereBetween('date', ['2026-01-01'])).toThrow(/must be an array of \[min, max\]/);

      const q = sql.select().field('*').whereIn('id', [1, 2, 3]).whereBetween('created_at', ['2026-01-01', '2026-02-01']);
      expect(q.toSQL().sql).toBe('select * from "users" where "id" in (?, ?, ?) and "created_at" between ? and ?');
      expect(q.toSQL().bindings).toEqual([1, 2, 3, '2026-01-01', '2026-02-01']);
    });

    it('supports parameterized whereRaw', () => {
      const q = new QueryHelper('users', null, mockKnex)
        .select()
        .field('*')
        .whereRaw('created_at > ? AND status = ?', ['2026-01-01', 'active']);

      const sql = q.toSQL();
      expect(sql.sql).toBe('select * from "users" where created_at > ? AND status = ?');
      expect(sql.bindings).toEqual(['2026-01-01', 'active']);
    });
  });

  describe('Joins, OrderBy, Limit & Offset', () => {
    it('constructs explicit inner and left joins', () => {
      const q = new QueryHelper('users', 'u', mockKnex)
        .select()
        .field('u.uuid')
        .field('r.name as role')
        .innerJoin('user_roles', 'u.uuid', 'user_roles.user_uuid')
        .leftJoin('roles', 'user_roles.role_uuid', 'roles.uuid')
        .where('u.status', '=', 'active');

      const sql = q.toSQL();
      expect(sql.sql).toBe('select "u"."uuid", "r"."name" as "role" from "users" as "u" inner join "user_roles" on "u"."uuid" = "user_roles"."user_uuid" left join "roles" on "user_roles"."role_uuid" = "roles"."uuid" where "u"."status" = ?');
      expect(sql.bindings).toEqual(['active']);
    });

    it('strictly validates orderBy directions (asc/desc only)', () => {
      const qAsc = new QueryHelper('items', null, mockKnex).select().field('*').orderBy('created_at', 'asc');
      expect(qAsc.toSQL().sql).toBe('select * from "items" order by "created_at" asc');

      const qDesc = new QueryHelper('items', null, mockKnex).select().field('*').orderBy('created_at', 'desc');
      expect(qDesc.toSQL().sql).toBe('select * from "items" order by "created_at" desc');

      expect(() => {
        new QueryHelper('items', null, mockKnex).select().field('*').orderBy('created_at', 'invalid');
      }).toThrow(/Invalid orderBy direction/);

      expect(() => {
        new QueryHelper('items', null, mockKnex).select().field('*').orderBy('created_at', true);
      }).toThrow(/Invalid orderBy direction/);
    });

    it('strictly enforces non-negative safe integer for limit and offset', () => {
      const q = new QueryHelper('items', null, mockKnex).select().field('*').limit(10).offset(20);
      expect(q.toSQL().sql).toBe('select * from "items" limit ? offset ?');
      expect(q.toSQL().bindings).toEqual([10, 20]);

      expect(() => new QueryHelper('items', null, mockKnex).limit('10')).toThrow(/Limit must be a non-negative integer/);
      expect(() => new QueryHelper('items', null, mockKnex).limit(-1)).toThrow(/Limit must be a non-negative integer/);
      expect(() => new QueryHelper('items', null, mockKnex).limit(NaN)).toThrow(/Limit must be a non-negative integer/);
      expect(() => new QueryHelper('items', null, mockKnex).limit(10.5)).toThrow(/Limit must be a non-negative integer/);
      expect(() => new QueryHelper('items', null, mockKnex).limit(Number.MAX_SAFE_INTEGER + 1)).toThrow(/Limit must be a non-negative integer/);
      expect(() => new QueryHelper('items', null, mockKnex).offset('invalid')).toThrow(/Offset must be a non-negative integer/);
      expect(() => new QueryHelper('items', null, mockKnex).offset(Number.MAX_SAFE_INTEGER + 1)).toThrow(/Offset must be a non-negative integer/);
    });
  });

  describe('Explicit Query-Type Tracking and Chain Protection', () => {
    it('prevents an active SELECT query from changing to UPDATE, DELETE, or INSERT', () => {
      const q = new QueryHelper('users', null, mockKnex).select().field('uuid');
      expect(() => q.update({ name: 'test' })).toThrow(/Cannot change query type from SELECT to UPDATE/);
      expect(() => q.delete()).toThrow(/Cannot change query type from SELECT to DELETE/);
      expect(() => q.insert({ name: 'test' })).toThrow(/Cannot change query type from SELECT to INSERT/);
    });

    it('prevents mutation queries from calling .field(), .fields(), or .select()', () => {
      const qUpdate = new QueryHelper('users', null, mockKnex).update({ name: 'test' });
      expect(() => qUpdate.field('uuid')).toThrow(/Cannot select fields on a UPDATE query/);
      expect(() => qUpdate.fields('uuid', 'email')).toThrow(/Cannot select fields on a UPDATE query/);
      expect(() => qUpdate.select()).toThrow(/Cannot change query type from UPDATE to SELECT/);

      const qDelete = new QueryHelper('users', null, mockKnex).delete();
      expect(() => qDelete.field('uuid')).toThrow(/Cannot select fields on a DELETE query/);
      expect(() => qDelete.select()).toThrow(/Cannot change query type from DELETE to SELECT/);

      const qInsert = new QueryHelper('users', null, mockKnex).insert({ name: 'test' });
      expect(() => qInsert.field('uuid')).toThrow(/Cannot select fields on a INSERT query/);
      expect(() => qInsert.select()).toThrow(/Cannot change query type from INSERT to SELECT/);
    });

    it('allows WHERE conditions to precede UPDATE and DELETE', () => {
      const qUpdate = new QueryHelper('users', null, mockKnex)
        .where('status', '=', 'ARCHIVED')
        .update({ status: 'PURGED' });
      expect(qUpdate.toSQL().sql).toBe('update "users" set "status" = ? where "status" = ? returning *');

      const qDelete = new QueryHelper('users', null, mockKnex)
        .where('uuid', '=', 'user-1')
        .delete();
      expect(qDelete.toSQL().sql).toBe('delete from "users" where "uuid" = ? returning *');
    });

    it('rejects build() on incomplete query chain with no query type', () => {
      const qIncomplete = new QueryHelper('users', null, mockKnex).where('status', '=', 'active');
      expect(() => qIncomplete.build()).toThrow(/Incomplete query chain/);
    });

    it('rejects illegal characters in identifiers', () => {
      expect(() => new QueryHelper('users; DROP TABLE users;', null, mockKnex).select().field('*')).toThrow(/illegal characters/);
      expect(() => new QueryHelper('users', 'u--comment', mockKnex).select().field('*')).toThrow(/illegal characters/);
    });

    it('validates join, groupBy, and having parameters strictly', () => {
      expect(() => new QueryHelper('users', null, mockKnex).select().field('*').join('', 'users.id', 'orders.user_id')).toThrow(/Join table must be a non-empty string/);
      expect(() => new QueryHelper('users', null, mockKnex).select().field('*').groupBy()).toThrow(/requires at least one column/);
      expect(() => new QueryHelper('users', null, mockKnex).select().field('*').having('', '=', 'active')).toThrow(/Column required for having/);
      expect(() => new QueryHelper('users', null, mockKnex).select().field('*').havingRaw('total > ?', [undefined])).toThrow(/cannot contain undefined/);
    });
  });
});

