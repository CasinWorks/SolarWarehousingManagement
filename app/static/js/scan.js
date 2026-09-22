(function () {
  var app = document.getElementById("scan-app");
  if (!app) return;

  var lookupUrl = app.getAttribute("data-lookup-url");
  var mode = app.getAttribute("data-mode") || "in";
  var skuInput = document.getElementById("sku");
  var locationInput = document.getElementById("location_id");
  var qtyInput = document.getElementById("quantity");
  var panel = document.getElementById("lookup-panel");
  var confirmBtn = document.getElementById("confirm-btn");
  var form = document.getElementById("scan-form");
  var bayButtons = document.querySelectorAll(".bay-btn");
  var found = null;
  var lookupTimer = null;

  function updateConfirm() {
    var ready =
      found &&
      found.ok &&
      locationInput.value &&
      qtyInput.value &&
      parseInt(qtyInput.value, 10) > 0;
    confirmBtn.disabled = !ready;
  }

  function setPanel(html, className) {
    panel.className = "scan-lookup mt-3 " + (className || "");
    panel.innerHTML = html;
  }

  function selectBay(btn) {
    bayButtons.forEach(function (b) {
      b.classList.remove("selected");
    });
    btn.classList.add("selected");
    locationInput.value = btn.getAttribute("data-bay-id");
    updateConfirm();
    if (skuInput.value.trim()) {
      lookupSku(skuInput.value.trim());
    }
    skuInput.focus();
  }

  bayButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      selectBay(btn);
    });
  });

  function lookupSku(sku) {
    if (!sku) {
      found = null;
      setPanel("Waiting for scan…", "empty");
      updateConfirm();
      return;
    }
    var url = lookupUrl + "?sku=" + encodeURIComponent(sku);
    if (locationInput.value) {
      url += "&location_id=" + encodeURIComponent(locationInput.value);
    }
    setPanel("Looking up…", "empty");
    fetch(url, { headers: { Accept: "application/json" } })
      .then(function (r) {
        return r.json().then(function (data) {
          return { status: r.status, data: data };
        });
      })
      .then(function (res) {
        found = res.data;
        if (!res.data.ok) {
          setPanel(res.data.error || "SKU not found.", "error");
          updateConfirm();
          return;
        }
        var html =
          '<div class="sku-found">' +
          escapeHtml(res.data.sku) +
          " · " +
          escapeHtml(res.data.name) +
          "</div>" +
          '<div class="sku-meta">' +
          (res.data.category ? escapeHtml(res.data.category) + " · " : "") +
          "Total stock: " +
          res.data.stock +
          " " +
          escapeHtml(res.data.unit || "pc");
        if (mode === "out" && res.data.available !== null && res.data.available !== undefined) {
          html +=
            " · In this bay: <strong>" + res.data.available + "</strong>";
        }
        html += "</div>";
        setPanel(html, "");
        updateConfirm();
      })
      .catch(function () {
        found = null;
        setPanel("Lookup failed. Check the network and try again.", "error");
        updateConfirm();
      });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  skuInput.addEventListener("input", function () {
    clearTimeout(lookupTimer);
    var val = skuInput.value.trim();
    lookupTimer = setTimeout(function () {
      lookupSku(val);
    }, 200);
  });

  // HID scanners typically end with Enter — look up then keep focus for confirm
  skuInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      clearTimeout(lookupTimer);
      lookupSku(skuInput.value.trim());
      if (found && found.ok && locationInput.value) {
        qtyInput.focus();
        qtyInput.select();
      }
    }
  });

  qtyInput.addEventListener("input", updateConfirm);
  qtyInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !confirmBtn.disabled) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener("submit", function (e) {
    if (confirmBtn.disabled) {
      e.preventDefault();
      if (!locationInput.value) {
        setPanel("Pick a bay first.", "error");
      } else if (!found || !found.ok) {
        setPanel("Scan a valid SKU first.", "error");
      }
      return;
    }
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Adding…";
  });

  // Restore bay selection after postback if browser kept hidden field (usually empty)
  skuInput.focus();
})();
