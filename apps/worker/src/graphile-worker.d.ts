declare global {
  namespace GraphileWorker {
    interface Tasks {
      'foundation:test': {
        probeId: string;
        queuedAt: string;
      };
      'work-with-us:notify-inquiry': {
        inquiryId: string;
      };
    }
  }
}

export {};
