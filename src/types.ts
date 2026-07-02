export type ReadParams = {
  path: string;
  offset?: number;
  limit?: number;
};

export type EditOp =
  | {
      op: 'replace' | 'append' | 'prepend';
      pos?: string;
      end?: string;
      lines?: string[];
    }
  | {
      op: 'replace_text';
      oldText: string;
      newText: string;
    };

export type EditParams = {
  path: string;
  edits: EditOp[];
};

export type PiClient = {
  read(params: ReadParams): Promise<string>;
  edit(params: EditParams): Promise<string>;
};

export type AnchorLine = {
  lineNumber: number;
  hash: string;
  content: string;
  raw: string;
};

export type StaleAnchorInfo = {
  stale: boolean;
  suggested: AnchorLine[];
  raw: string;
};
