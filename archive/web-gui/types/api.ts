/**
 * Shared API Type Definitions
 * Comprehensive type definitions for all API responses and requests
 */

// Base API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  timestamp: string;
  path?: string;
  details?: any;
}

// User Types
export interface User {
  id: string;
  email: string;
  name?: string;
  roles: string[];
  plan: 'free' | 'premium' | 'enterprise';
  metadata?: {
    plan?: string;
    createdAt?: string;
    lastLogin?: string;
    preferences?: UserPreferences;
  };
  profile?: UserProfile;
}

export interface UserProfile {
  id: string;
  userId: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  editor: {
    fontSize: number;
    tabSize: number;
    wordWrap: boolean;
    minimap: boolean;
  };
}

// Authentication Types
export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse extends ApiResponse {
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse extends ApiResponse {
  data: {
    accessToken: string;
    expiresIn: number;
  };
}

// Artifact Types
export interface Artifact {
  id: string;
  name: string;
  type: string;
  content: string;
  userId?: string;
  tags: string[];
  metadata: ArtifactMetadata;
  createdAt: string;
  updatedAt: string;
  version?: number;
}

export interface ArtifactMetadata {
  author?: string;
  description?: string;
  language?: string;
  size?: number;
  encoding?: string;
  checksum?: string;
  originalFilename?: string;
  importedAt?: string;
  fileSize?: number;
  securityScan?: SecurityScanResult;
}

export interface SecurityScanResult {
  signatureValid: boolean;
  virusScan: string;
  scanTimestamp: string;
  threats?: string[];
  riskLevel?: 'low' | 'medium' | 'high';
}

export interface ArtifactVersion {
  id: string;
  artifactId: string;
  content: string;
  timestamp: string;
  versionNumber: number;
  changeDescription?: string;
  author?: string;
}

export interface CreateArtifactRequest {
  name: string;
  type: string;
  content: string;
  tags?: string[];
  metadata?: Partial<ArtifactMetadata>;
}

export interface UpdateArtifactRequest {
  name?: string;
  content?: string;
  tags?: string[];
  metadata?: Partial<ArtifactMetadata>;
}

export interface ArtifactsResponse extends PaginatedResponse<Artifact> {}

export interface ArtifactResponse extends ApiResponse<Artifact> {}

// Chat Types
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: string;
  conversationId?: string;
  metadata?: ChatMessageMetadata;
}

export interface ChatMessageMetadata {
  model?: string;
  personality?: string;
  tokens?: number;
  responseTime?: number;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatRequest {
  message: string;
  model?: string;
  personality?: string;
  conversationId?: string;
  stream?: boolean;
  parameters?: ChatParameters;
}

export interface ChatParameters {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface ChatResponse extends ApiResponse {
  data: {
    id: string;
    message: ChatMessage;
    conversationId: string;
    metadata: ChatMessageMetadata;
  };
}

export interface ChatHistoryResponse extends PaginatedResponse<ChatMessage> {
  conversationId: string;
}

// Model Types
export interface Model {
  id: string;
  name: string;
  description?: string;
  type: 'chat' | 'completion' | 'embedding' | 'image';
  provider: string;
  version?: string;
  parameters?: ModelParameters;
  capabilities?: string[];
  status: 'available' | 'unavailable' | 'loading' | 'error';
  metadata?: ModelMetadata;
}

export interface ModelParameters {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface ModelMetadata {
  size?: string;
  quantization?: string;
  contextLength?: number;
  lastUpdated?: string;
  downloadUrl?: string;
  requirements?: string[];
}

export interface ModelsResponse extends ApiResponse {
  data: {
    models: Model[];
    total: number;
    available: number;
    providers: string[];
  };
}

export interface ModelResponse extends ApiResponse<Model> {
  usage?: ModelUsage;
}

export interface ModelUsage {
  totalRequests: number;
  averageResponseTime: number;
  lastUsed?: string;
  tokensGenerated?: number;
  errorRate?: number;
}

// System Types
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: ServiceHealth[];
  metrics: SystemMetrics;
}

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  lastCheck: string;
  error?: string;
}

export interface SystemMetrics {
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    cores: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  requests: {
    total: number;
    perSecond: number;
    errors: number;
    errorRate: number;
  };
}

export interface SystemHealthResponse extends ApiResponse<SystemHealth> {}

// File Upload Types
export interface FileUploadRequest {
  files: File[];
  metadata?: {
    description?: string;
    tags?: string[];
    category?: string;
  };
}

export interface FileUploadResponse extends ApiResponse {
  data: {
    uploaded: number;
    artifacts: Artifact[];
    errors: FileUploadError[];
    storageStats: StorageStats;
  };
}

export interface FileUploadError {
  file: string;
  error: string;
  code?: string;
}

export interface StorageStats {
  count: number;
  maxCount: number;
  totalSize: number;
  maxSize: number;
  utilizationPercent: {
    count: number;
    size: number;
  };
  quota: StorageQuota;
}

export interface StorageQuota {
  plan: string;
  maxFiles: number;
  maxTotalSize: number;
  maxFileSize: number;
}

// Rate Limiting Types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  category: string;
  tier: string;
  window: number;
}

export interface RateLimitResponse extends ErrorResponse {
  rateLimit: RateLimitInfo;
  upgradeMessage?: string;
}

// Export Types
export interface ExportRequest {
  artifactIds: string[];
  format: 'zip' | 'tar' | 'individual';
  includeMetadata?: boolean;
}

export interface ExportResponse extends ApiResponse {
  data: {
    downloadUrl: string;
    filename: string;
    size: number;
    expiresAt: string;
  };
}

// Search Types
export interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  sort?: SearchSort;
  pagination?: {
    page: number;
    limit: number;
  };
}

export interface SearchFilters {
  type?: string[];
  tags?: string[];
  author?: string[];
  dateRange?: {
    from: string;
    to: string;
  };
}

export interface SearchSort {
  field: 'relevance' | 'date' | 'name' | 'size';
  order: 'asc' | 'desc';
}

export interface SearchResponse extends PaginatedResponse<Artifact> {
  query: string;
  filters: SearchFilters;
  suggestions?: string[];
}

// Utility Types
export type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'type';

export type FileType = 
  | 'javascript' 
  | 'typescript' 
  | 'typescriptreact' 
  | 'javascriptreact'
  | 'python' 
  | 'java' 
  | 'cpp' 
  | 'c' 
  | 'csharp' 
  | 'html' 
  | 'css' 
  | 'json' 
  | 'yaml' 
  | 'markdown' 
  | 'text' 
  | 'sql' 
  | 'shell' 
  | 'bash' 
  | 'rust' 
  | 'go' 
  | 'php';

export type UserRole = 'user' | 'admin' | 'moderator';

export type UserPlan = 'free' | 'premium' | 'enterprise';

export type ModelProvider = 'ollama' | 'openai' | 'anthropic' | 'huggingface' | 'local';

export type ModelStatus = 'available' | 'unavailable' | 'loading' | 'error';

export type SystemStatus = 'healthy' | 'degraded' | 'unhealthy';

export type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy';

export type RateLimitCategory = 'auth' | 'api' | 'upload' | 'chat' | 'export';

export type RateLimitTier = 'free' | 'premium' | 'enterprise';