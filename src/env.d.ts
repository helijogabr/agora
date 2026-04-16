declare namespace App {
  interface SessionData {
    userId: number;
  }

  interface Locals {
    user: {
      id: number;
      info: {
        name: string;
        city: string;
        role?: "admin" | undefined;
        locale?: string | undefined;
      };
    };
    invalidateCache?: string;
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
