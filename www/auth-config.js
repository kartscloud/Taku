/* taku · Firebase config
   ============================================================================
   Paste the SIX values Firebase shows you when you register a Web App
   (Project settings → Your apps → the </> icon). Until a real apiKey is here,
   the app runs the offline MOCK backend and touches no network.

   THESE SIX ARE SAFE IN PUBLIC CODE. Google documents that Firebase Web API
   keys "do not need to be treated as secrets" — they identify the project, they
   do not grant access. What protects your data is firestore.rules, nothing else.

   NEVER PUT IN THIS FILE, OR ANYWHERE UNDER www/:
     · the service-account JSON  (contains "private_key": "-----BEGIN PRIVATE KEY-----")
       — that is Admin SDK credentials and bypasses every security rule
     · any SMTP password or email-provider key (Resend "re_...", SES credentials)
       — those belong in the Firebase Console only
     · any user's password, in any form, ever

   If one of those ever lands in a commit, deleting it later does nothing: it
   stays in git history and in every fork. Rotate it at the provider instead. */

window.TAKU_FIREBASE = {
  apiKey:            "PASTE_YOUR_API_KEY",
  authDomain:        "PASTE_PROJECT.firebaseapp.com",
  projectId:         "PASTE_PROJECT",
  storageBucket:     "PASTE_PROJECT.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId:             "PASTE_APP_ID"
};
