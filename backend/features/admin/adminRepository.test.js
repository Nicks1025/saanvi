const AdminRepository = require('./adminRepository');

describe('AdminRepository', () => {
  let adminRepository;

  beforeEach(() => {
    adminRepository = new AdminRepository();
    adminRepository.runQuery = jest.fn();
    adminRepository.runQueryFirst = jest.fn();
    adminRepository.execute = jest.fn();
  });

  describe('getAllUsers', () => {
    it('should return paginated data and total count', async () => {
      adminRepository.runQueryFirst.mockResolvedValueOnce({ total: '5' });
      adminRepository.runQuery.mockResolvedValueOnce([
        {
          uuid: 'user-1',
          email: 'test@example.com',
          status: 'active',
          created_at: '2026-01-01',
          last_login_at: null,
          first_name: 'John',
          last_name: 'Doe'
        }
      ]);

      const result = await adminRepository.getAllUsers('search', false, 2, 10);

      expect(adminRepository.runQueryFirst).toHaveBeenCalled();
      expect(adminRepository.runQuery).toHaveBeenCalled();
      expect(result).toEqual({
        data: [{
          uuid: 'user-1',
          email: 'test@example.com',
          status: 'active',
          created_at: '2026-01-01',
          last_login_at: null,
          first_name: 'John',
          last_name: 'Doe'
        }],
        total: 5
      });
    });

    it('should handle archived filter', async () => {
      adminRepository.runQueryFirst.mockResolvedValueOnce({ total: '1' });
      adminRepository.runQuery.mockResolvedValueOnce([]);

      const result = await adminRepository.getAllUsers('', true, 1, 10);
      expect(result.total).toBe(1);
      expect(result.data).toEqual([]);
    });
  });

  describe('getUserByUuid', () => {
    it('should return user object or null', async () => {
      adminRepository.runQueryFirst.mockResolvedValueOnce({
        uuid: 'u-1',
        email: 'u1@test.com',
        status: 'active',
        created_at: '2026-01-01',
        last_login_at: null,
        first_name: 'Jane',
        last_name: 'Doe'
      });

      const user = await adminRepository.getUserByUuid('u-1');
      expect(user).toEqual({
        uuid: 'u-1',
        email: 'u1@test.com',
        status: 'active',
        created_at: '2026-01-01',
        last_login_at: null,
        first_name: 'Jane',
        last_name: 'Doe'
      });
    });
  });

  describe('archiveUser', () => {
    it('should execute update on users', async () => {
      adminRepository.execute.mockResolvedValueOnce({ affectedRows: 1, rows: [] });

      await adminRepository.archiveUser('uuid-1234');
      expect(adminRepository.execute).toHaveBeenCalled();
      const query = adminRepository.execute.mock.calls[0][0];
      const sqlObj = query.toSQL();
      expect(sqlObj.sql).toContain('update "users"');
    });
  });

  describe('restoreUser', () => {
    it('should execute update on users', async () => {
      adminRepository.execute.mockResolvedValueOnce({ affectedRows: 1, rows: [] });

      await adminRepository.restoreUser('uuid-1234');
      expect(adminRepository.execute).toHaveBeenCalled();
      const query = adminRepository.execute.mock.calls[0][0];
      const sqlObj = query.toSQL();
      expect(sqlObj.sql).toContain('update "users"');
    });
  });

  describe('getAllRoles', () => {
    it('should return roles array', async () => {
      adminRepository.runQuery.mockResolvedValueOnce([{ uuid: 'r-1', name: 'Admin' }]);

      const roles = await adminRepository.getAllRoles();
      expect(roles).toEqual([{ uuid: 'r-1', name: 'Admin' }]);
    });
  });
});
