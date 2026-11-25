const SqlService = require('./sqlService');
const AdminRepository = require('./adminRepository');
const ApiContext = require('../../base/apiContext');

describe('SqlService Architecture & Execution Tests', () => {
  let mockContext;
  let mockRepository;
  let sqlService;

  beforeEach(() => {
    mockContext = new ApiContext({ user: { id: 1 } }, {});
    sqlService = new SqlService(mockContext);
    
    // Mock the repository created by the service
    mockRepository = {
      executeRaw: jest.fn()
    };
    sqlService.repository = mockRepository;
  });

  describe('Constructor & DI', () => {
    it('instantiates AdminRepository with context', () => {
      const freshService = new SqlService(mockContext);
      expect(freshService.repository).toBeInstanceOf(AdminRepository);
      expect(freshService.repository.context).toBe(mockContext);
    });
  });

  describe('AST Safety Validation', () => {
    it('rejects DROP statements', async () => {
      await expect(
        sqlService.executeSql('primary', 'DROP TABLE users;')
      ).rejects.toThrow(/DROP statements are strictly prohibited/);
      expect(mockRepository.executeRaw).not.toHaveBeenCalled();
    });

    it('rejects ALTER statements', async () => {
      await expect(
        sqlService.executeSql('primary', 'ALTER TABLE users ADD COLUMN age INT;')
      ).rejects.toThrow(/ALTER statements are strictly prohibited/);
      expect(mockRepository.executeRaw).not.toHaveBeenCalled();
    });

    it('rejects UPDATE without WHERE clause', async () => {
      await expect(
        sqlService.executeSql('primary', 'UPDATE users SET status = "inactive";')
      ).rejects.toThrow(/UPDATE statements must have a WHERE clause/);
      expect(mockRepository.executeRaw).not.toHaveBeenCalled();
    });

    it('rejects UPDATE with tautological WHERE clause (1=1)', async () => {
      await expect(
        sqlService.executeSql('primary', 'UPDATE users SET status = "inactive" WHERE 1=1;')
      ).rejects.toThrow(/cannot be a tautology/);
      expect(mockRepository.executeRaw).not.toHaveBeenCalled();
    });

    it('rejects non-primary database IDs', async () => {
      await expect(
        sqlService.executeSql('replica', 'SELECT 1;')
      ).rejects.toThrow(/Database ID 'replica' is not allowed/);
    });

    it('rejects empty SQL input', async () => {
      await expect(
        sqlService.executeSql('primary', '   ')
      ).rejects.toThrow(/No SQL provided/);
    });
  });

  describe('Query Execution & Formatting', () => {
    it('successfully calls repository.executeRaw and formats output for SELECT', async () => {
      const mockResult = {
        command: 'SELECT',
        rowCount: 2,
        rows: [{ table_name: 'users' }, { table_name: 'roles' }],
        fields: [{ name: 'table_name' }]
      };
      mockRepository.executeRaw.mockResolvedValueOnce(mockResult);

      const query = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;";
      const response = await sqlService.executeSql('primary', query);

      expect(mockRepository.executeRaw).toHaveBeenCalledWith(query);
      expect(response).toMatchObject({
        success: true,
        command: 'SELECT',
        rowCount: 2,
        rows: [{ table_name: 'users' }, { table_name: 'roles' }],
        fields: ['table_name']
      });
      expect(typeof response.executionTimeMs).toBe('number');
    });

    it('wraps repository errors in a Database execution error with code', async () => {
      const dbError = new Error('relation "unknown_table" does not exist');
      dbError.code = '42P01';
      mockRepository.executeRaw.mockRejectedValueOnce(dbError);

      await expect(
        sqlService.executeSql('primary', 'SELECT * FROM unknown_table;')
      ).rejects.toThrow(/Database execution error: relation "unknown_table" does not exist/);
    });
  });
});

