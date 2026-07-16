export interface JobResult {
  id: string;
  company: string;
  title: string;
  status: "pending" | "running" | "success" | "error";
  score?: number;
  error?: string;
}

type Listener = (state: {
  running: boolean;
  currentIndex: number;
  results: JobResult[];
  total: number;
}) => void;

class BulkAnalyzeStore {
  private listeners = new Set<Listener>();
  private running = false;
  private currentIndex = 0;
  private results: JobResult[] = [];
  private total = 0;
  private shouldStop = false;
  private maximizeCallback?: () => void;

  setMaximizeCallback(cb: () => void) {
    this.maximizeCallback = cb;
  }

  maximize() {
    if (this.maximizeCallback) this.maximizeCallback();
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    // Emit initial state immediately
    listener({
      running: this.running,
      currentIndex: this.currentIndex,
      results: [...this.results],
      total: this.total,
    });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const state = {
      running: this.running,
      currentIndex: this.currentIndex,
      results: [...this.results],
      total: this.total,
    };
    this.listeners.forEach((l) => l(state));
  }

  getState() {
    return {
      running: this.running,
      currentIndex: this.currentIndex,
      results: [...this.results],
      total: this.total,
    };
  }

  stop() {
    this.shouldStop = true;
    this.running = false;
    this.notify();
  }

  async start(
    unscoredJobs: { id: string; company: string; title: string }[],
    onComplete?: () => void
  ) {
    if (this.running) return;
    this.running = true;
    this.shouldStop = false;
    this.currentIndex = 0;
    this.total = unscoredJobs.length;
    this.results = unscoredJobs.map((job) => ({
      id: job.id,
      company: job.company,
      title: job.title,
      status: "pending",
    }));
    this.notify();

    for (let i = 0; i < unscoredJobs.length; i++) {
      if (this.shouldStop) break;

      this.currentIndex = i + 1;
      this.results[i].status = "running";
      this.notify();

      const job = unscoredJobs[i];
      try {
        const res = await fetch(`/api/jobs/${job.id}/analyze`, { method: "POST" });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error ?? "Failed to score");

        this.results[i].status = "success";
        this.results[i].score = data.matchScore;
      } catch (err) {
        this.results[i].status = "error";
        this.results[i].error = err instanceof Error ? err.message : "Error";
      }
      this.notify();
    }

    this.running = false;
    this.notify();
    if (onComplete) onComplete();
  }
}

export const bulkAnalyzeStore = new BulkAnalyzeStore();
export type { BulkAnalyzeStore };
