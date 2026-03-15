/**
 * Form Handling Script Block
 *
 * Generates JavaScript for the capture form (email + demographics),
 * form submission, and redirect to study functionality.
 */

/**
 * Generate the form rendering and submission functions.
 */
export function generateFormHandlingBlock(): string {
  return `// Drawer capture form with demographics
  function renderDrawerCaptureForm() {
    currentView = 'capture';
    var inputStyle = 'background:' + theme.inputBg + ';color:' + theme.textColor + ';border:1px solid ' + theme.inputBorder;

    var formHtml = '<div class="veritio-drawer-header">' +
      '<h2 id="veritio-title" class="veritio-title" style="margin:0;padding:0">' + escapeHtml(config.title) + '</h2>' +
      '<button class="veritio-close" aria-label="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
      '</div>' +
      '<div class="veritio-drawer-content">' +
      '<p class="veritio-desc" style="margin-bottom:20px">' + escapeHtml(config.description) + '</p>' +
      '<form class="veritio-form" id="veritio-capture-form">' +
      '<div class="veritio-field"><label class="veritio-label">Email<span class="veritio-required">*</span></label><input type="email" name="email" class="veritio-input" style="' + inputStyle + '" placeholder="your@email.com" required></div>';

    // Add demographic fields if enabled - supports new object format
    if (config.captureSettings.collectDemographics && config.demographicFields.length > 0) {
      config.demographicFields.forEach(function(field) {
        var fieldType = typeof field === 'string' ? field : field.fieldType;
        var fieldRequired = typeof field === 'object' && field.required;
        var fieldLabel = (typeof field === 'object' && field.label) || '';
        var fieldConfig = demographicOptions[fieldType];

        if (fieldConfig) {
          var label = fieldLabel || fieldConfig.label;
          var requiredMark = fieldRequired ? '<span class="veritio-required">*</span>' : '';
          var requiredAttr = fieldRequired ? 'required' : '';

          formHtml += '<div class="veritio-field"><label class="veritio-label">' + label + requiredMark + '</label>' +
            '<select name="' + fieldType + '" class="veritio-select" style="' + inputStyle + '" ' + requiredAttr + '><option value="">Select...</option>';
          fieldConfig.options.forEach(function(opt) {
            formHtml += '<option value="' + opt + '">' + opt + '</option>';
          });
          formHtml += '</select></div>';
        }
      });
    }

    formHtml += '<div id="veritio-form-error" class="veritio-error" style="display:none"></div>' +
      '</form></div>' +
      '<div class="veritio-drawer-footer">' +
      '<button type="submit" form="veritio-capture-form" class="veritio-btn" style="background:' + config.buttonColor + ';color:' + getContrastColor(config.buttonColor) + '">' + ((config.captureSettings && config.captureSettings.submitButtonText) || "Start Survey") + '</button>' +
      '</div>';

    widget.innerHTML = formHtml;
    widget.querySelector('.veritio-close').onclick = dismiss;

    var form = widget.querySelector('#veritio-capture-form');
    form.onsubmit = function(e) {
      e.preventDefault();
      submitCapture(form);
    };
  }

  function renderCaptureForm() {
    currentView = 'capture';
    // Input styles use theme colors for proper dark mode support
    var inputStyle = 'background:' + theme.inputBg + ';color:' + theme.textColor + ';border:1px solid ' + theme.inputBorder;
    var formHtml = '<button class="veritio-close" aria-label="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
      '<h2 id="veritio-title" class="veritio-title">Join our research panel</h2>' +
      '<p class="veritio-desc">Enter your details to participate in this study.</p>' +
      '<form class="veritio-form" id="veritio-capture-form">' +
      '<div class="veritio-field"><label class="veritio-label">Email<span class="veritio-required">*</span></label><input type="email" name="email" class="veritio-input" style="' + inputStyle + '" placeholder="your@email.com" required></div>';

    // Add demographic fields if enabled - supports new object format
    if (config.captureSettings.collectDemographics && config.demographicFields.length > 0) {
      config.demographicFields.forEach(function(field) {
        var fieldType = typeof field === 'string' ? field : field.fieldType;
        var fieldRequired = typeof field === 'object' && field.required;
        var fieldLabel = (typeof field === 'object' && field.label) || '';
        var fieldConfig = demographicOptions[fieldType];

        if (fieldConfig) {
          var label = fieldLabel || fieldConfig.label;
          var requiredMark = fieldRequired ? '<span class="veritio-required">*</span>' : '';
          var requiredAttr = fieldRequired ? 'required' : '';

          formHtml += '<div class="veritio-field"><label class="veritio-label">' + label + requiredMark + '</label>' +
            '<select name="' + fieldType + '" class="veritio-select" style="' + inputStyle + '" ' + requiredAttr + '><option value="">Select...</option>';
          fieldConfig.options.forEach(function(opt) {
            formHtml += '<option value="' + opt + '">' + opt + '</option>';
          });
          formHtml += '</select></div>';
        }
      });
    }

    formHtml += '<div id="veritio-form-error" class="veritio-error" style="display:none"></div>' +
      '<button type="submit" class="veritio-btn" style="background:' + config.buttonColor + ';color:' + getContrastColor(config.buttonColor) + '">' + ((config.captureSettings && config.captureSettings.submitButtonText) || "Start Survey") + '</button>' +
      '<button type="button" class="veritio-btn veritio-back" style="border:1px solid ' + theme.inputBorder + '">Back</button>' +
      '</form>';

    widget.innerHTML = formHtml;

    widget.querySelector('.veritio-close').onclick = dismiss;
    widget.querySelector('.veritio-back').onclick = renderIntroView;

    var form = widget.querySelector('#veritio-capture-form');
    form.onsubmit = function(e) {
      e.preventDefault();
      submitCapture(form);
    };
  }

  function submitCapture(form) {
    var submitBtn = widget.querySelector('button[type="submit"]') || form.querySelector('button[type="submit"]');
    var errorEl = form.querySelector('#veritio-form-error');
    var email = form.querySelector('input[name="email"]').value.trim();

    if (!email || !email.includes('@')) {
      errorEl.textContent = 'Please enter a valid email address.';
      errorEl.style.display = 'block';
      return;
    }

    // Collect demographics - handle new object format
    var demographics = {};
    config.demographicFields.forEach(function(field) {
      var fieldType = typeof field === 'string' ? field : field.fieldType;
      var fieldRequired = typeof field === 'object' && field.required;
      var select = form.querySelector('select[name="' + fieldType + '"]');
      if (select) {
        if (fieldRequired && !select.value) {
          errorEl.textContent = 'Please fill in all required fields.';
          errorEl.style.display = 'block';
          return;
        }
        if (select.value) {
          demographics[fieldType] = select.value;
        }
      }
    });

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    errorEl.style.display = 'none';

    // Submit to capture endpoint with auto-detected browser data
    var browserData = BrowserDataDetector.getAll();
    fetch(config.apiBase + '/api/panel/widget/capture/' + config.embedCodeId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        demographics: demographics,
        pageUrl: window.location.href,
        referrer: document.referrer,
        browserData: browserData
      })
    })
    .then(function(res) {
      if (!res.ok) throw new Error('Capture failed');
      return res.json();
    })
    .then(function(data) {
      // Mark as participated in localStorage for future targeting
      try {
        var vd = JSON.parse(getStorage(visitorKey) || '{}');
        vd.participated = true;
        setStorage(visitorKey, JSON.stringify(vd));
      } catch(e) {}
      // Pass the email and panel participant ID to study for linking
      redirectToStudy(email, data.participant_id);
    })
    .catch(function(err) {
      submitBtn.disabled = false;
      submitBtn.textContent = (config.captureSettings && config.captureSettings.submitButtonText) || "Start Survey";
      errorEl.textContent = 'Something went wrong. Please try again.';
      errorEl.style.display = 'block';
    });
  }

  function redirectToStudy(capturedEmail, panelParticipantId) {
    dismiss();
    // Build URL with widget source, email for prefilling, and panel participant ID for linking
    var url = config.studyUrl + '?utm_source=widget';
    if (capturedEmail) {
      url += '&prefill_email=' + encodeURIComponent(capturedEmail);
    }
    if (panelParticipantId) {
      url += '&pp=' + encodeURIComponent(panelParticipantId);
    }
    var win = window.open(url, '_blank', 'noopener');
    if (!win || win.closed) {
      if (confirm('Popup blocked. Open in this tab?')) {
        window.location.href = url;
      }
    }
  }`
}
