const { DbDriver } = require('./dbDriver');

describe('DbDriver Contract & Execution Tests', () => {
  let mockKnex;
  let driver;

  beforeEach(() => {
    mockKnex = {
      raw: jest.fn(),
      transaction: jest.fn(),
      destroy: jest.fn().mockResolvedValue(true),
      client: { config: {} }
    };
    driver = new DbDriver(mockKnex);
  });

  describe('Pool Lifecycle & Ownership', () => {
    it('does not destroy externally supplied knex instance on driver.close()', async () => {
      expect(driver._ownsPool).toBe(false);
      await driver.close();
      expect(mockKnex.destroy).not.toHaveBeenCalled();
    });

    it('strictly parses integer configuration and rejects invalid integer values', () => {
      expect(driver._parseStrictInteger(5, 'TEST_VAL')).toBe(5);
      expect(driver._parseStrictInteger('10', 'TEST_VAL')).toBe(10);
      expect(() => driver._parseStrictInteger('10abc', 'TEST_VAL')).toThrow(/must be a valid integer string/);
      expect(() => driver._parseStrictInteger('10.5', 'TEST_VAL')).toThrow(/must be a valid integer string/);
      expect(() => driver._parseStrictInteger(10.5, 'TEST_VAL')).toThrow(/must be a safe integer/);
      expect(() => driver._parseStrictInteger(NaN, 'TEST_VAL')).toThrow(/must be a safe integer/);
    });
  });

  describe('runQuery & runQueryFirst Contracts', () => {
    it('returns an array when knex query resolves to an array of rows', async () => {
      const sampleRows = [{ uuid: '1', name: 'Alice' }, { uuid: '2', name: 'Bob' }];
      const query = {
        build: () => Promise.resolve(sampleRows)
      };

      const result = await driver.runQuery(query);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(sampleRows);
    });

    it('returns empty array when knex query resolves to empty array', async () => {
      const query = {
        build: () => Promise.resolve([])
      };

      const result = await driver.runQuery(query);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('rejects with contract violation when runQuery resolves to a non-array value', async () => {
      const query = {
        build: () => Promise.resolve({ notAnArray: true })
      };

      await expect(driver.runQuery(query)).rejects.toThrow(
        /DbDriver Contract Violation: runQuery expected an array of rows/
      );
    });

    it('runQueryFirst returns the first object when query returns records', async () => {
      const sampleRows = [{ uuid: '1', email: 'alice@example.com' }, { uuid: '2', email: 'bob@example.com' }];
      const query = {
        build: () => Promise.resolve(sampleRows)
      };

      const result = await driver.runQueryFirst(query);
      expect(result).toEqual({ uuid: '1', email: 'alice@example.com' });
    });

    it('runQueryFirst returns null when query returns empty array', async () => {
      const query = {
        build: () => Promise.resolve([])
      };

      const result = await driver.runQueryFirst(query);
      expect(result).toBeNull();
    });
  });

  describe('execute (Mutations) Contracts', () => {
    it('returns { affectedRows, rows } for PostgreSQL returning * array results', async () => {
      const returnedRows = [{ id: 10, status: 'active' }, { id: 11, status: 'active' }];
      const query = {
        build: () => Promise.resolve(returnedRows)
      };

      const result = await driver.execute(query);
      expect(result).toEqual({
        affectedRows: 2,
        rows: returnedRows
      });
    });

    it('rejects with contract violation when execute resolves to an arbitrary object or invalid shape', async () => {
      const query = {
        build: () => Promise.resolve({ notAnArrayOrCount: true })
      };

      await expect(driver.execute(query)).rejects.toThrow(
        /DbDriver Contract Violation: execute expected an array of returned rows or count/
      );
    });

    it('rejects with transaction error when supplied query cannot be bound to transaction', async () => {
      const queryWithoutTransacting = {
        build: () => Promise.resolve([1])
      };
      const fakeTrx = { isTransaction: true };

      await expect(driver.execute(queryWithoutTransacting, [], fakeTrx)).rejects.toThrow(
        /DbDriver Transaction Error: Supplied query cannot be bound to transaction/
      );
    });

    it('returns { affectedRows, rows: [] } when result is a number of affected rows', async () => {
      const query = {
        build: () => Promise.resolve(5)
      };

      const result = await driver.execute(query);
      expect(result).toEqual({
        affectedRows: 5,
        rows: []
      });
    });
  });

  describe('Raw Query Execution', () => {
    it('executes raw queries and extracts rows from pg result structure', async () => {
      mockKnex.raw.mockResolvedValue({
        rowCount: 1,
        rows: [{ id: 1, title: 'Item 1' }]
      });

      const result = await driver.runQuery('SELECT * FROM items WHERE id = ?', [1]);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([{ id: 1, title: 'Item 1' }]);
      expect(mockKnex.raw).toHaveBeenCalledWith('SELECT * FROM items WHERE id = ?', [1]);
    });

    it('executes raw mutations and captures rowCount for affectedRows', async () => {
      mockKnex.raw.mockResolvedValue({
        rowCount: 3,
        rows: []
      });

      const result = await driver.execute('UPDATE items SET active = true WHERE category = ?', ['test']);
      expect(result).toEqual({
        affectedRows: 3,
        rows: []
      });
    });

    it('executeRaw returns full native result structure (command, rowCount, rows, fields)', async () => {
      const mockResult = {
        command: 'SELECT',
        rowCount: 2,
        rows: [{ table_name: 'users' }, { table_name: 'roles' }],
        fields: [{ name: 'table_name' }]
      };
      mockKnex.raw.mockResolvedValue(mockResult);

      const result = await driver.executeRaw('SELECT table_name FROM information_schema.tables', []);
      expect(result).toEqual({
        command: 'SELECT',
        rowCount: 2,
        rows: [{ table_name: 'users' }, { table_name: 'roles' }],
        fields: [{ name: 'table_name' }]
      });
      expect(mockKnex.raw).toHaveBeenCalledWith('SELECT table_name FROM information_schema.tables', []);
    });

    it('executeRaw supports transaction binding when supplied', async () => {
      const fakeTrx = { raw: jest.fn().mockResolvedValue({ command: 'UPDATE', rowCount: 1, rows: [], fields: [] }) };
      const result = await driver.executeRaw('UPDATE users SET status = ?', ['active'], fakeTrx);
      expect(result.command).toBe('UPDATE');
      expect(fakeTrx.raw).toHaveBeenCalledWith('UPDATE users SET status = ?', ['active']);
      expect(mockKnex.raw).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling & Metadata Preservation', () => {
    it('preserves PostgreSQL error code, constraint and message without mangling', async () => {
      const pgError = new Error('duplicate key value violates unique constraint "users_email_unique"');
      pgError.code = '23505';
      pgError.constraint = 'users_email_unique';
      pgError.detail = 'Key (email)=(test@example.com) already exists.';
      pgError.table = 'users';

      const query = {
        build: () => Promise.reject(pgError)
      };

      try {
        await driver.runQuery(query);
        fail('Should have thrown an error');
      } catch (err) {
        expect(err.code).toBe('23505');
        expect(err.constraint).toBe('users_email_unique');
        expect(err.detail).toBe('Key (email)=(test@example.com) already exists.');
        expect(err.table).toBe('users');
        expect(err.message).toBe('duplicate key value violates unique constraint "users_email_unique"');
      }
    });
  });

  describe('Transaction Handling', () => {
    it('commits transaction on success', async () => {
      const fakeTrx = { isTransaction: true };
      mockKnex.transaction.mockImplementation(async (callback) => {
        return await callback(fakeTrx);
      });

      const result = await driver.transaction(async (trx) => {
        expect(trx).toBe(fakeTrx);
        return 'success';
      });

      expect(result).toBe('success');
      expect(mockKnex.transaction).toHaveBeenCalled();
    });

    it('rolls back and rethrows original error on transaction failure', async () => {
      const txError = new Error('Transaction failure in step 2');
      txError.code = '40001';

      mockKnex.transaction.mockImplementation(async (callback) => {
        throw txError;
      });

      await expect(
        driver.transaction(async (trx) => {
          throw txError;
        })
      ).rejects.toThrow('Transaction failure in step 2');
    });
  });

  describe('Health Check', () => {
    it('returns healthy: true when database is reachable', async () => {
      mockKnex.raw.mockResolvedValue({ rows: [{ healthy: 1 }] });
      const status = await driver.healthCheck();
      expect(status.healthy).toBe(true);
      expect(status.rows).toEqual([{ healthy: 1 }]);
    });

    it('returns healthy: false when database query fails', async () => {
      mockKnex.raw.mockRejectedValue(new Error('Connection refused'));
      const status = await driver.healthCheck();
      expect(status.healthy).toBe(false);
      expect(status.error).toContain('Connection refused');
    });
  });
});
