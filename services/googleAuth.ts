// src/auth/googleAuth.ts
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const redirectUri = AuthSession.makeRedirectUri({
    useProxy: true, // ✅ aquí va useProxy (NO en promptAsync)
  }as any);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: "804526717040-4djo8lau6q1dsfur3d8p8s7phn7fcejh.apps.googleusercontent.com", // WEB client id
    scopes: ["openid", "profile", "email"],
    redirectUri, // ✅ importante
  });

  return { request, response, promptAsync, redirectUri };
}
