/* eslint-disable */
// Generated with guidance; adjust as needed for your account/types.

interface Env {
  EMAIL_MCP_SERVER: DurableObjectNamespace<import("./src/index").EmailMcpServer>;
  EMAILS_DB: D1Database;
  SEND_EMAIL: SendEmail;
  MAIL_FROM: string;
  ALLOWED_RECIPIENTS: string;
}

// ForwardableEmailMessage and SendEmail come from Cloudflare runtime types.
// In this repo, similar large env types exist elsewhere; this keeps it minimal here.