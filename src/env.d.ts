declare namespace App {
  interface SessionData {
    userId: number;
    updatedAt: number;
    user: {
      name: string;
      city: string;
      role?: "admin" | "user" | undefined;
    };
  }

  interface Locals {
    user: {
      id: number;
      info: {
        name: string;
        city: string;
        role?: "admin" | "user" | undefined;
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
      role?: "admin" | "user" | undefined;
    };
  }
}
