declare module '@earendil-works/pi-coding-agent';
declare module 'typebox' {
  export const Type: {
    Object(shape: Record<string, unknown>): unknown;
    String(options?: Record<string, unknown>): unknown;
    Optional(value: unknown): unknown;
    Array(value: unknown): unknown;
  };
}
