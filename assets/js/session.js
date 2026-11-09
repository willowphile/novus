/* =====================================================================
   session.js - a pretend "login session" with NO backend.

   The idea: when someone "logs in", we save their details in the browser's
   localStorage. Every page reads from that same spot to know who the user
   is. "Logout" simply deletes it. Nothing is ever sent to a server, and
   there are no passwords, so don't treat this as real security.

   Everything is stored as one JSON object under the key "ts.session":
     { username, account, role, plan, loggedInAt }

   Handy things to try in the browser console:
     Session.get()      -> shows the saved user
     Session.clear()    -> logs out
   ===================================================================== */

window.Session = (function () {
  var KEY = 'ts.session';

  // Read the saved user. Returns an object, or null if nobody is logged in.
  function get() {
    try {
      return JSON.parse(localStorage.getItem(KEY));
    } catch (e) {
      return null;   // the saved text was broken; treat as logged out
    }
  }

  // Save a user (turns the object into text for storage).
  function save(user) {
    user.loggedInAt = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify(user));
  }

  // Delete the saved user = logout.
  function clear() {
    localStorage.removeItem(KEY);
  }

  // true / false: is somebody logged in?
  function isLoggedIn() {
    var user = get();
    return !!(user && user.username);
  }

  return { get: get, save: save, clear: clear, isLoggedIn: isLoggedIn };
})();
