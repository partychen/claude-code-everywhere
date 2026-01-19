export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface CreateDirectoryRequest {
  alias: string;
  path: string;
  description?: string;
  previewEnabled?: boolean;
  startCmd?: string;
  previewPort?: number;
  isDefault?: boolean;
}

export interface UpdateDirectoryRequest {
  description?: string;
  previewEnabled?: boolean;
  startCmd?: string;
  previewPort?: number;
}
