export interface DatabaseHealthResult {
  ok: boolean;
  latencyMs: number;
  error?: unknown;
}

export interface DatabaseHealthCheck {
  check(): Promise<DatabaseHealthResult>;
  close(): Promise<void>;
}

export function createPostgresHealthCheck(
  connectionString: string,
  options?: {
    onPoolError?: (error: Error) => void;
  },
): DatabaseHealthCheck;
