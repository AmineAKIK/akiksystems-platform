declare global {
  namespace GraphileWorker {
    interface Tasks {
      'foundation:test': {
        probeId: string;
        queuedAt: string;
      };
    }
  }
}

export {};
