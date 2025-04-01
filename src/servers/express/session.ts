import session from 'express-session';

const sessionStore = new session.MemoryStore();

export { sessionStore };
