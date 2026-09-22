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
  var cameraBtn = document.getElementById("camera-toggle");
  var cameraStopBtn = document.getElementById("camera-stop");
  var cameraWrap = document.getElementById("camera-wrap");
  var cameraStatus = document.getElementById("camera-status");
  var found = null;
  var lookupTimer = null;
  var html5QrCode = null;
  var cameraRunning = false;
  var lastScanned = "";
  var lastScanAt = 0;

  function isTouchDevice() {
    return (
      window.matchMedia("(max-width: 900px)").matches ||
      navigator.maxTouchPoints > 1 ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "")
    );
  }

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

  function setCameraStatus(msg) {
    if (cameraStatus) cameraStatus.textContent = msg || "";
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
    if (!cameraRunning) {
      skuInput.focus({ preventScroll: true });
    }
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
          html += " · In this bay: <strong>" + res.data.available + "</strong>";
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

  function applyScannedCode(code) {
    var sku = String(code || "").trim();
    if (!sku) return;
    var now = Date.now();
    if (sku === lastScanned && now - lastScanAt < 2500) return;
    lastScanned = sku;
    lastScanAt = now;

    skuInput.value = sku;
    lookupSku(sku);
    if (navigator.vibrate) {
      try {
        navigator.vibrate(40);
      } catch (e) {}
    }
    setCameraStatus("Scanned: " + sku);
  }

  function stopCamera() {
    if (!html5QrCode || !cameraRunning) {
      cameraRunning = false;
      if (cameraWrap) cameraWrap.hidden = true;
      if (cameraBtn) {
        cameraBtn.hidden = false;
        cameraBtn.disabled = false;
      }
      if (cameraStopBtn) cameraStopBtn.hidden = true;
      return Promise.resolve();
    }
    return html5QrCode
      .stop()
      .catch(function () {})
      .then(function () {
        cameraRunning = false;
        if (cameraWrap) cameraWrap.hidden = true;
        if (cameraBtn) {
          cameraBtn.hidden = false;
          cameraBtn.disabled = false;
        }
        if (cameraStopBtn) cameraStopBtn.hidden = true;
        setCameraStatus("");
      });
  }

  function startCamera() {
    if (typeof Html5Qrcode === "undefined") {
      setCameraStatus("Camera scanner failed to load. Check your connection.");
      setPanel("Camera library unavailable. Type or use a USB scanner.", "error");
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatus("This browser cannot use the camera.");
      setPanel("Camera not supported here. Type the SKU or use a USB scanner.", "error");
      return;
    }
    if (!locationInput.value) {
      setPanel("Pick a bay first, then open the camera.", "error");
      setCameraStatus("Select a bay before scanning.");
      return;
    }

    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode("camera-reader", { verbose: false });
    }

    if (cameraBtn) cameraBtn.disabled = true;
    setCameraStatus("Starting camera…");
    if (cameraWrap) cameraWrap.hidden = false;

    var config = {
      fps: 10,
      qrbox: function (viewfinderWidth, viewfinderHeight) {
        var w = Math.floor(viewfinderWidth * 0.85);
        var h = Math.floor(Math.min(viewfinderHeight * 0.35, 160));
        return { width: w, height: h };
      },
      aspectRatio: 1.333,
      rememberLastUsedCamera: true,
    };

    var formats =
      typeof Html5QrcodeSupportedFormats !== "undefined"
        ? [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
          ]
        : undefined;

    if (formats) config.formatsToSupport = formats;

    html5QrCode
      .start(
        { facingMode: "environment" },
        config,
        function (decodedText) {
          applyScannedCode(decodedText);
        },
        function () {}
      )
      .then(function () {
        cameraRunning = true;
        if (cameraBtn) cameraBtn.hidden = true;
        if (cameraStopBtn) cameraStopBtn.hidden = false;
        setCameraStatus("Point the camera at the barcode");
      })
      .catch(function (err) {
        cameraRunning = false;
        if (cameraWrap) cameraWrap.hidden = true;
        if (cameraBtn) {
          cameraBtn.hidden = false;
          cameraBtn.disabled = false;
        }
        setCameraStatus("");
        var msg = (err && err.message) || String(err);
        setPanel(
          "Could not open camera. Allow camera permission, or use HTTPS / localhost. (" +
            escapeHtml(msg) +
            ")",
          "error"
        );
      });
  }

  if (cameraBtn) {
    cameraBtn.addEventListener("click", function () {
      startCamera();
    });
  }
  if (cameraStopBtn) {
    cameraStopBtn.addEventListener("click", function () {
      stopCamera();
    });
  }

  // Show camera CTA on phones/tablets; keep HID field for USB scanners
  if (isTouchDevice() && cameraBtn) {
    cameraBtn.classList.add("camera-primary");
    document.body.classList.add("is-touch");
  }

  skuInput.addEventListener("input", function () {
    clearTimeout(lookupTimer);
    var val = skuInput.value.trim();
    lookupTimer = setTimeout(function () {
      lookupSku(val);
    }, 200);
  });

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
    stopCamera();
  });

  window.addEventListener("pagehide", function () {
    stopCamera();
  });

  if (!isTouchDevice()) {
    skuInput.focus({ preventScroll: true });
  }
})();
