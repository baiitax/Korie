export interface ApiMeta {
  request_id: string;
  correlation_id: string;
  timestamp: string;
  duration_ms?: number;
  environment: 'SANDBOX' | 'PRODUCTION';
  idempotency_cached?: boolean;
}

export interface ApiResponse<T = any> {
  status: 'success';
  code?: string;
  message?: string;
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  field?: string;
  recommended_action?: string;
  help_url?: string;
}

export interface ApiErrorResponse {
  status: 'error';
  error: {
    code: string;
    message: string;
    request_id: string;
    details?: ApiErrorDetail[];
    timestamp: string;
  };
}

export interface RequestContext {
  requestId: string;
  correlationId: string;
  environment: 'SANDBOX' | 'PRODUCTION';
  orgId: string;
  userId?: string;
  userRole?: string;
  scopes: string[];
  apiKeyId?: string;
  ipAddress: string;
  country?: 'NG' | 'NE';
  idempotencyKey?: string;
  startTime: number;
}
