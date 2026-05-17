export type StreamerRequestInput = {
  streamerName: string;
  kickUrl?: string;
  youtubeUrl?: string;
};

export type StreamerRequestPreviewInput = StreamerRequestInput & {
  requestId?: string;
  selectedHelperRequestIds?: string[];
  targetDatabaseId?: string;
};

export type StreamerRequestStatus = "pending" | "reviewed" | "approved" | "rejected";

export type StreamerRequest = StreamerRequestInput & {
  id: string;
  createdAt: string;
  status?: StreamerRequestStatus;
  databaseId?: string;
};

export type StreamerRequestResponse = {
  ok: boolean;
  message: string;
  request?: StreamerRequest;
  fieldErrors?: Partial<Record<keyof StreamerRequestInput, string>>;
};

export type StreamerRequestDeleteResponse = {
  ok: boolean;
  message: string;
  request?: StreamerRequest;
};
