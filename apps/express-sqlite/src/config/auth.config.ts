import { ExpressAuth, ExpressAuthConfig } from "@auth/express"
import Google from "@auth/express/providers/google"

export const authConfig = {
  trustHost: true,
  providers: [
    Google,
  ],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        // User is available during sign-in
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      return session;
    },
  },
} as const satisfies ExpressAuthConfig;

export const expressAuth = ExpressAuth(authConfig);

