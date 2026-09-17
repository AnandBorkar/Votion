(function () {
  const currentPath = window.location.pathname.split("/").pop() || "";
  const isLoginPage = currentPath === "login.html";
  const token = localStorage.getItem("votionAdmin") || "";

  if (!isLoginPage && !token) {
    window.location.replace("login.html");
    return;
  }

  window.VOTION_API = window.VOTION_API || "http://localhost:5000/api";

  window.getAdminHeaders = function getAdminHeaders() {
    return {
      Authorization: `Bearer ${localStorage.getItem("votionAdmin") || ""}`,
    };
  };

  window.requireAdmin = function requireAdmin() {
    if (!localStorage.getItem("votionAdmin")) {
      window.location.replace("login.html");
      return false;
    }
    return true;
  };
})();
