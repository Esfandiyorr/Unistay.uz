// Vercel function entry: the web build of the libSQL client talks to Turso over HTTPS.
import { createClient } from '@libsql/client/web';
import { createHandler } from './handler.js';

export default createHandler(createClient);
