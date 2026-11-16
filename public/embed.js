(function () {
  if (window.__SCALEPODS_CHAT_LOADED__) return;
  window.__SCALEPODS_CHAT_LOADED__ = true;

  // ---------- Root wrapper (click-through) ----------
  const root = document.createElement("div");
  root.id = "scalepods-chat-root";

  Object.assign(root.style, {
    position: "fixed",
    bottom: "16px",
    right: "16px",
    zIndex: "999999",
    pointerEvents: "none"
  });

  document.body.appendChild(root);

  // ---------- Launcher button ----------
  const launcher = document.createElement("button");
  launcher.innerHTML = "💬";

  Object.assign(launcher.style, {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    border: "none",
    background: "#00E5FF",
    cursor: "pointer",
    boxShadow: "0 10px 30px rgba(0,0,0,.35)",
    fontSize: "22px",
    pointerEvents: "auto"
  });

  root.appendChild(launcher);

  // ---------- Chat container ----------
  const panel = document.createElement("div");

  Object.assign(panel.style, {
    width: "380px",
    height: "520px",
    borderRadius: "18px",
    overflow: "hidden",
    background: "#000",
    boxShadow: "0 20px 50px rgba(0,0,0,.45)",
    display: "none",
    pointerEvents: "auto"
  });

  root.appendChild(panel);

  let reactRoot = null;

  // ---------- Open chat ----------
  launcher.onclick = () => {
    launcher.style.display = "none";
    panel.style.display = "block";

    if (!reactRoot) {
      const { createRoot } = window.ReactDOM;
      reactRoot = createRoot(panel);

      const ChatApp = window.ScalePodsChatApp?.();
      if (!ChatApp) {
        console.error("ScalePodsChatApp not found");
        return;
      }

      reactRoot.render(
        window.React.createElement(ChatApp, {
          onClose: closeChat
        })
      );
    }
  };

  // ---------- Close chat ----------
  function closeChat() {
    panel.style.display = "none";
    launcher.style.display = "block";
  }

})();
