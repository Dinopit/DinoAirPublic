import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock the model training service since it doesn't exist yet
jest.mock('@/lib/services/model-training', () => ({
  modelTrainingService: {
    uploadDataset: jest.fn(),
  },
}));

// Helper to create a mock NextRequest with formData support
function createMockRequestWithFormData(formData: FormData) {
  const request = {
    formData: jest.fn().mockResolvedValue(formData),
  } as unknown as NextRequest;

  return request;
}

describe('/api/training/datasets POST', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return helpful error message for invalid JSON metadata', async () => {
    // Create a FormData with invalid JSON metadata
    const formData = new FormData();
    formData.append('file', new File(['test content'], 'test.txt', { type: 'text/plain' }));
    formData.append(
      'metadata',
      '{"name": "test", "description": "test", "type": "test", "format": "test", "uploadedBy": "test"'
    ); // missing closing brace

    const request = createMockRequestWithFormData(formData);
    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid metadata JSON');
    // The error should include specific JSON parse error details (not just the generic message)
    expect(result.error).toMatch(/Invalid metadata JSON: .+/); // Should include parse error details after the colon
    expect(result.error.length).toBeGreaterThan('Invalid metadata JSON'.length); // Should be longer than just the basic message
  });

  it('should return helpful error message for malformed JSON metadata', async () => {
    // Test with completely invalid JSON
    const formData = new FormData();
    formData.append('file', new File(['test content'], 'test.txt', { type: 'text/plain' }));
    formData.append('metadata', 'not-json-at-all');

    const request = createMockRequestWithFormData(formData);
    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid metadata JSON');
    expect(result.error).toMatch(/Invalid metadata JSON: .+/);
    expect(result.error.length).toBeGreaterThan('Invalid metadata JSON'.length);
  });

  it('should return error for missing file', async () => {
    const formData = new FormData();
    formData.append(
      'metadata',
      '{"name": "test", "description": "test", "type": "test", "format": "test", "uploadedBy": "test"}'
    );

    const request = createMockRequestWithFormData(formData);
    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.success).toBe(false);
    expect(result.error).toBe('No file provided');
  });

  it('should return error for missing metadata', async () => {
    const formData = new FormData();
    formData.append('file', new File(['test content'], 'test.txt', { type: 'text/plain' }));

    const request = createMockRequestWithFormData(formData);
    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.success).toBe(false);
    expect(result.error).toBe('No metadata provided');
  });
});
