export type JobSource = "pracuj" | "justjoin" | "nofluffjobs";

export type JobItem = {
  id: string;
  title: string;
  company?: string;
  location?: string;
  salary?: string;
  technologies?: string[];
  url?: string;
  source: JobSource;
};

export type JobsQuery = {
  q: string;
  location: string;
  tech: string;
  source: "all" | JobSource;
  remote: string;
};
