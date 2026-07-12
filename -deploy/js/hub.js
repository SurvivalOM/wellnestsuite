/* WellNest hub JS — UTM relay, waitlist, analytics events. Zero dependencies, < 4KB. */
(function () {
  "use strict";

  /* ---- 1. UTM relay: copy inbound utm_* onto outbound app links ---- */
  var inbound = new URLSearchParams(location.search);
  var utms = [];
  inbound.forEach(function (v, k) {
    if (k.indexOf("utm_") === 0) utms.push([k, v]);
  });
  try { if (utms.length) sessionStorage.setItem("wn_utms", JSON.stringify(utms)); } catch (e) {}
  try { if (!utms.length) utms = JSON.parse(sessionStorage.getItem("wn_utms") || "[]"); } catch (e) {}

  function decorate(a) {
    var url;
    try { url = new URL(a.href); } catch (e) { return; }
    if (url.origin === location.origin) return;
    if (!url.searchParams.has("utm_source")) url.searchParams.set("utm_source", "wellnest-hub");
    utms.forEach(function (p) {
      if (p[0] !== "utm_source" && !url.searchParams.has(p[0])) url.searchParams.set(p[0], p[1]);
    });
    a.href = url.toString();
  }
  document.querySelectorAll("a[data-app-link]").forEach(decorate);

  /* ---- 2. Event tracking (Umami if present; silent otherwise) ---- */
  function track(name, data) {
    if (window.umami && typeof window.umami.track === "function") {
      try { window.umami.track(name, data || {}); } catch (e) {}
    }
  }
  window.wnTrack = track;
  document.querySelectorAll("[data-wn-event]").forEach(function (el) {
    el.addEventListener("click", function () { track(el.getAttribute("data-wn-event")); });
  });

  /* ---- 3. Waitlist / WellNest ID form ----
     Posts to the identity Worker when configured (data-endpoint on the form);
     until then falls back to a mailto draft so the static site never breaks. */
  document.querySelectorAll("form.waitform").forEach(function (form) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var email = (form.querySelector("input[type=email]") || {}).value || "";
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { alert("Please enter a valid email."); return; }
      var tag = form.getAttribute("data-tag") || "waitlist";
      var endpoint = form.getAttribute("data-endpoint");
      track("waitlist_signup", { tag: tag });
      if (endpoint) {
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email, tag: tag })
        }).then(function (r) {
          form.innerHTML = r.ok
            ? "<p><strong>Check your inbox</strong> — we sent a confirmation link. Welcome to the nest.</p>"
            : "<p>Something went wrong — please try again in a minute.</p>";
        }).catch(function () {
          form.innerHTML = "<p>Something went wrong — please try again in a minute.</p>";
        });
      } else {
        location.href = "mailto:hello@wellnestsuite.com?subject=Join%20WellNest%20(" +
          encodeURIComponent(tag) + ")&body=Please%20add%20me%20to%20the%20WellNest%20list:%20" +
          encodeURIComponent(email);
        form.insertAdjacentHTML("beforeend",
          "<p class=\"formnote\">Your email app opened a pre-filled note — just press send.</p>");
      }
    });
  });
})();
