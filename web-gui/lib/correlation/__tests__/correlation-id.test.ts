import { 
  generateCorrelationId, 
  isValidCorrelationId, 
  extractCorrelationId,
  CORRELATION_ID_HEADER,
  CorrelationIdManager 
} from '../correlation-id';

describe('Correlation ID utilities', () => {
  describe('generateCorrelationId', () => {
    it('should generate a valid correlation ID', () => {
      const id = generateCorrelationId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(10);
      expect(id).toMatch(/^[a-z0-9]+-[a-f0-9]{16}$/i);
    });

    it('should generate unique IDs', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('isValidCorrelationId', () => {
    it('should validate correct format', () => {
      const validId = generateCorrelationId();
      expect(isValidCorrelationId(validId)).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidCorrelationId('')).toBe(false);
      expect(isValidCorrelationId('invalid')).toBe(false);
      expect(isValidCorrelationId('123-invalid')).toBe(false);
      expect(isValidCorrelationId('valid-123')).toBe(false); // Too short hex
    });
  });

  describe('extractCorrelationId', () => {
    it('should extract from headers', () => {
      const expectedId = generateCorrelationId();
      const headers = new Headers({
        [CORRELATION_ID_HEADER]: expectedId
      });
      
      const result = extractCorrelationId(headers);
      expect(result).toBe(expectedId);
    });

    it('should extract from object headers', () => {
      const expectedId = generateCorrelationId();
      const headers = {
        [CORRELATION_ID_HEADER]: expectedId
      };
      
      const result = extractCorrelationId(headers);
      expect(result).toBe(expectedId);
    });

    it('should extract from search params', () => {
      const expectedId = generateCorrelationId();
      const searchParams = new URLSearchParams({
        correlationId: expectedId
      });
      
      const result = extractCorrelationId(undefined, searchParams);
      expect(result).toBe(expectedId);
    });

    it('should prioritize headers over search params', () => {
      const headerId = generateCorrelationId();
      const paramId = generateCorrelationId();
      
      const headers = new Headers({
        [CORRELATION_ID_HEADER]: headerId
      });
      const searchParams = new URLSearchParams({
        correlationId: paramId
      });
      
      const result = extractCorrelationId(headers, searchParams);
      expect(result).toBe(headerId);
    });

    it('should generate new ID if none provided', () => {
      const result = extractCorrelationId();
      expect(isValidCorrelationId(result)).toBe(true);
    });

    it('should generate new ID if invalid ID provided', () => {
      const headers = new Headers({
        [CORRELATION_ID_HEADER]: 'invalid-id'
      });
      
      const result = extractCorrelationId(headers);
      expect(result).not.toBe('invalid-id');
      expect(isValidCorrelationId(result)).toBe(true);
    });
  });

  describe('CorrelationIdManager', () => {
    let manager: CorrelationIdManager;

    beforeEach(() => {
      // Clear any existing session storage
      if (typeof Storage !== 'undefined') {
        sessionStorage.clear();
      }
      manager = CorrelationIdManager.getInstance();
      manager.clearCorrelationId();
    });

    it('should be a singleton', () => {
      const manager1 = CorrelationIdManager.getInstance();
      const manager2 = CorrelationIdManager.getInstance();
      expect(manager1).toBe(manager2);
    });

    it('should generate correlation ID on first access', () => {
      const id = manager.getCorrelationId();
      expect(isValidCorrelationId(id)).toBe(true);
    });

    it('should return same ID on subsequent calls', () => {
      const id1 = manager.getCorrelationId();
      const id2 = manager.getCorrelationId();
      expect(id1).toBe(id2);
    });

    it('should set and get correlation ID', () => {
      const testId = generateCorrelationId();
      manager.setCorrelationId(testId);
      expect(manager.getCorrelationId()).toBe(testId);
    });

    it('should clear correlation ID', () => {
      const testId = generateCorrelationId();
      manager.setCorrelationId(testId);
      manager.clearCorrelationId();
      
      // Should generate new ID
      const newId = manager.getCorrelationId();
      expect(newId).not.toBe(testId);
      expect(isValidCorrelationId(newId)).toBe(true);
    });

    it('should renew correlation ID', () => {
      const originalId = manager.getCorrelationId();
      const newId = manager.renewCorrelationId();
      
      expect(newId).not.toBe(originalId);
      expect(isValidCorrelationId(newId)).toBe(true);
      expect(manager.getCorrelationId()).toBe(newId);
    });
  });
});

// Mock sessionStorage for testing
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  },
  writable: true
});
