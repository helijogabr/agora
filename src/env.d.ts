declare namespace App {
  interface SessionData {
    userId: number;
    user: {
      name: string;
      city: string;
      role?: "admin" | undefined;
    };
  }

  interface Locals {
    user: {
      id: number;
      info: {
        name: string;
        city: string;
        role?: "admin" | undefined;
      };
    };
    invalidateCache?: boolean;
  }
}

declare global {
  interface Window {
    __USER__?: {
      name: string;
      city: string;
      role?: "admin" | undefined;
    };
  }
}
