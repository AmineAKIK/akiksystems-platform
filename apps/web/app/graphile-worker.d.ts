declare global {
  namespace GraphileWorker {
    interface Tasks {
      'work-with-us:notify-inquiry': {
        inquiryId: string;
      };
    }
  }
}

export {};
