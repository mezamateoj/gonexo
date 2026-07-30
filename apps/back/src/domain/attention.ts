type JobAction = {
  jobId: string;
  requestId: string;
  createdAt: Date;
};

export type ClientJobAction =
  | JobAction & { type: "confirm_reception" }
  | JobAction & { type: "review_job" };

export type DriverJobAction =
  | JobAction & {
      type: "start_job";
      scheduledAt: Date;
    }
  | JobAction & { type: "mark_arrived" }
  | JobAction & { type: "complete_job" }
  | JobAction & { type: "review_job" };
