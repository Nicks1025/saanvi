const RbacService = require('./rbacService');
const RbacRepository = require('./rbacRepository');

jest.mock('./rbacRepository');

describe('RbacService', () => {
  let service;
  let mockRepository;

  beforeEach(() => {
    mockRepository = {
      getUserPermissions: jest.fn()
    };
    RbacRepository.mockImplementation(() => mockRepository);
    service = new RbacService(); // Uses mock internally
    // Re-inject mock just in case
    service.repository = mockRepository;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getEffectivePermissions', () => {
    it('should return permissions from repository', async () => {
      mockRepository.getUserPermissions.mockResolvedValue(['READ', 'WRITE']);
      
      const result = await service.getEffectivePermissions('user-uuid');
      
      expect(result).toEqual(['READ', 'WRITE']);
      expect(mockRepository.getUserPermissions).toHaveBeenCalledWith('user-uuid');
    });

    it('should return empty array if repository throws an error', async () => {
      mockRepository.getUserPermissions.mockRejectedValue(new Error('DB Error'));
      
      const result = await service.getEffectivePermissions('user-uuid');
      
      expect(result).toEqual([]);
    });
  });
});
