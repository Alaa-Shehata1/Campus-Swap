export interface PilotMetrics {
  members: number;
  activeMembers: number;
  moderators: number;
  listings: number;
  activeListings: number;
  completedExchanges: number;
  reportsReceived: number;
  reportsUnderReview: number;
  reportsResolved: number;
  /** Median Received → Resolved latency in ms; null when nothing resolved yet. */
  medianTriageMs: number | null;
  sanctions: number;
  handovers: number;
  reviewsPublished: number;
  generatedAtMs: number;
}

export interface TargetProgress {
  met: boolean;
  actual: number;
  target: number;
  remaining: number;
}

export interface PilotProgress {
  members: TargetProgress;
  listings: TargetProgress;
  completions: TargetProgress;
  triage: TargetProgress;
}
