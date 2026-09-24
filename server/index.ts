import 'server-only';

// Sensitive Route Handlers and Server Actions must validate a server session.
export {
  AuthenticationRequiredError,
  getServerSession,
  requireApiSession,
  requireSession,
} from './auth';
