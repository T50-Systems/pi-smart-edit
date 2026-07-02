export type ReadParams = {
  path: string;
  offset?: number;
  limit?: number;
};

export type ReplaceLikeEditOp = {
  op: 'replace' | 'append' | 'prepend';
  pos?: string;
  end?: string;
  lines?: string[];
};

export type ReplaceTextEditOp = {
  op: 'replace_text';
  oldText: string;
  newText: string;
};

export type EditOp = ReplaceLikeEditOp | ReplaceTextEditOp;

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
