import { Request } from 'express';
import { Hostel } from './hostel.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        global_role?: string;
      };
      hostel?: Hostel;
    }
  }
}

export {};
