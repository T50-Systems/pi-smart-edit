declare module '@earendil-works/pi-coding-agent' {
  export function withFileMutationQueue<T>(filePath: string, fn: () => Promise<T>): Promise<T>;
}
