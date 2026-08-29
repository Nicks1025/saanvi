const AdminRepository = require('./adminRepository');
const QueryHelper = require('../../database/queryHelper');

jest.mock('../../database/queryHelper');

describe('AdminRepository', () => {
  let mockQueryHelper;
  let adminRepository;
  let dbMock;

  beforeEach(() => {
    const knexBuilderMock = {
      whereRaw: jest.fn().mockReturnThis(),
      whereNull: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      as: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      countDistinct: jest.fn().mockReturnThis(),
    };
    dbMock = jest.fn(() => knexBuilderMock);
    dbMock.raw = jest.fn(sql => sql);

    mockQueryHelper = {
      db: dbMock,
      from: jest.fn().mockReturnThis(),
      field: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereRaw: jest.fn().mockReturnThis(),
      whereNull: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      countDistinct: jest.fn().mockReturnThis(),
      execute: jest.fn(),
      transaction: jest.fn(async (callback) => {
        return callback({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue([])
        });
      })
    };
    QueryHelper.mockImplementation(() => mockQueryHelper);
    
    adminRepository = new AdminRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    it('should return paginated data and total count', async () => {
      // Mock execute behavior: first call is count, second is data
      mockQueryHelper.execute
        .mockResolvedValueOnce([{ total: '5' }]) // Count query
        .mockResolvedValueOnce([{ uuid: 'user-1', email: 'test@example.com' }]); // Data query

      const result = await adminRepository.getAllUsers('search string', false, 2, 10);

      // Verifications for count query
      expect(mockQueryHelper.countDistinct).toHaveBeenCalledWith('u.uuid', 'total');
      
      // Verifications for data query
      expect(mockQueryHelper.limit).toHaveBeenCalledWith(10);
      expect(mockQueryHelper.offset).toHaveBeenCalledWith(10); // (page 2 - 1) * 10
      
      expect(result).toEqual({
        data: [{
          uuid: 'user-1',
          email: 'test@example.com',
          status: undefined,
          created_at: undefined,
          first_name: null,
          last_name: null
        }],
        total: 5
      });
    });

    it('should handle archived filter', async () => {
      mockQueryHelper.execute
        .mockResolvedValueOnce([{ total: '1' }]) // Count query
        .mockResolvedValueOnce([]); // Data query

      await adminRepository.getAllUsers('', true, 1, 10);

      // Verify the query builder was told to look for NOT null archived_at
      expect(mockQueryHelper.where).toHaveBeenCalledWith('u.archived_at', 'not_is', null);
    });
  });

  describe('archiveUser', () => {
    it('should set status to inactive and archived_at to current date', async () => {
      mockQueryHelper.execute.mockResolvedValueOnce([]);
      
      await adminRepository.archiveUser('uuid-1234');
      
      expect(mockQueryHelper.from).toHaveBeenCalledWith('users');
      expect(mockQueryHelper.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'inactive',
        archived_at: expect.any(String)
      }));
      expect(mockQueryHelper.where).toHaveBeenCalledWith('uuid', 'eq', 'uuid-1234');
    });
  });

  describe('restoreUser', () => {
    it('should set status to active and archived_at to null', async () => {
      mockQueryHelper.execute.mockResolvedValueOnce([]);
      
      await adminRepository.restoreUser('uuid-1234');
      
      expect(mockQueryHelper.from).toHaveBeenCalledWith('users');
      expect(mockQueryHelper.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'active',
        archived_at: null
      }));
      expect(mockQueryHelper.where).toHaveBeenCalledWith('uuid', 'eq', 'uuid-1234');
    });
  });
});
