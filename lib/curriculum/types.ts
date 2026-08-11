export type LessonStatus = "not_started" | "reading" | "assigned" | "submitted" | "complete";

export type SubmissionInput = {
  photoId: string;
  role?: string;
  selfNote?: string;
};
