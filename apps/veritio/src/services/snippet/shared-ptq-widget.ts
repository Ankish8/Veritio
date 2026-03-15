/**
 * Shared PTQ (Post-Task Questions) widget code for live-website-snippet.ts and proxy-companion.ts.
 *
 * Both files generate self-contained vanilla ES5 JS strings injected into third-party sites.
 * These functions return JS code strings that rely on closure variables already present in both
 * consumers: `ptqResponses`, `widgetRoot`, `tasks`, `currentTaskIndex`, `taskResponses`,
 * `escapeHtml`, `advanceToNextTask`, `removeBlockingOverlay`, `renderWidget`, `widgetState`.
 */

/**
 * Returns a JS function declaration string: `function getPtqCssRules(brand) { return '...'; }`
 * The generated JS calls `getPtqCssRules(brand)` at runtime to get CSS with brand color interpolated.
 */
export function getPtqCss(): string {
  return `
  function getPtqCssRules(brand) {
    return ''
    + '.__vt_ptq_input {'
    + '  width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;'
    + '  font-size:14px;font-family:inherit;outline:none;transition:border-color 150ms;'
    + '}'
    + '.__vt_ptq_input:focus { border-color:' + brand + '; }'
    + '.__vt_ptq_textarea {'
    + '  width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;'
    + '  font-size:14px;font-family:inherit;outline:none;resize:vertical;min-height:64px;'
    + '  transition:border-color 150ms;'
    + '}'
    + '.__vt_ptq_textarea:focus { border-color:' + brand + '; }'
    + '.__vt_ptq_opt {'
    + '  display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid #e5e7eb;'
    + '  border-radius:8px;margin-bottom:6px;cursor:pointer;transition:border-color 150ms,background 150ms;'
    + '}'
    + '.__vt_ptq_opt:hover { border-color:#d1d5db;background:#f9fafb; }'
    + '.__vt_ptq_opt.selected { border-color:' + brand + ';background:' + brand + '1a; }'
    + '.__vt_ptq_opt input { margin:0; }'
    + '.__vt_ptq_opt span { font-size:14px;color:#374151; }'
    + '.__vt_ptq_yn { display:flex;gap:12px; }'
    + '.__vt_ptq_yn_btn {'
    + '  flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;'
    + '  padding:16px;border:2px solid #e5e7eb;border-radius:12px;cursor:pointer;'
    + '  background:#fff;transition:all 150ms;min-height:72px;font-family:inherit;'
    + '}'
    + '.__vt_ptq_yn_btn:hover { border-color:#d1d5db;background:#f9fafb; }'
    + '.__vt_ptq_yn_btn.selected { border-color:' + brand + ';background:' + brand + '1a; }'
    + '.__vt_ptq_yn_icon { font-size:24px;margin-bottom:4px; }'
    + '.__vt_ptq_yn_text { font-size:14px;font-weight:500;color:#374151; }'
    + '.__vt_ptq_scale_row { display:flex;flex-direction:column;gap:4px; }'
    + '.__vt_ptq_scale_btns { display:flex;gap:4px; }'
    + '.__vt_ptq_scale_btn {'
    + '  flex:1;height:36px;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;'
    + '  background:#fff;font-size:13px;font-weight:500;color:#374151;transition:all 150ms;'
    + '  display:flex;align-items:center;justify-content:center;font-family:inherit;'
    + '}'
    + '.__vt_ptq_scale_btn:hover { border-color:#d1d5db;background:#f9fafb; }'
    + '.__vt_ptq_scale_btn.selected { border-color:' + brand + ';background:' + brand + ';color:#fff; }'
    + '.__vt_ptq_scale_btn.star-selected { border-color:#facc15;background:#fef9c3;color:#854d0e; }'
    + '.__vt_ptq_scale_btn.star-hover:not(.star-selected) { border-color:#fde68a;background:#fefce8;color:#a16207; }'
    + '.__vt_ptq_scale_labels { display:flex;justify-content:space-between;font-size:11px;color:#9ca3af; }'
    + '.__vt_ptq_nps_btn.selected.detractor { background:#ef4444;border-color:#ef4444;color:#fff; }'
    + '.__vt_ptq_nps_btn.selected.passive { background:#eab308;border-color:#eab308;color:#fff; }'
    + '.__vt_ptq_nps_btn.selected.promoter { background:#22c55e;border-color:#22c55e;color:#fff; }'
    + '.__vt_ptq_slider_wrap { padding:8px 0; }'
    + '.__vt_ptq_slider { width:100%;margin:0;accent-color:' + brand + '; }'
    + '.__vt_ptq_slider_val { text-align:center;font-size:14px;font-weight:600;color:#111;margin-bottom:4px; }'
    + '.__vt_ptq_matrix { width:100%;border-collapse:collapse;font-size:13px; }'
    + '.__vt_ptq_matrix th { text-align:center;padding:6px 4px;font-weight:500;color:#6b7280;font-size:12px; }'
    + '.__vt_ptq_matrix td { text-align:center;padding:6px 4px;border-top:1px solid #f3f4f6; }'
    + '.__vt_ptq_matrix td:first-child { text-align:left;font-size:13px;color:#374151; }'
    + '.__vt_ptq_matrix input { margin:0; }'
    + '.__vt_ptq_rank_item {'
    + '  display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f9fafb;'
    + '  border:1px solid #e5e7eb;border-radius:8px;margin-bottom:6px;'
    + '}'
    + '.__vt_ptq_rank_num { font-size:12px;font-weight:600;color:#6b7280;min-width:20px; }'
    + '.__vt_ptq_rank_text { flex:1;font-size:14px;color:#374151; }'
    + '.__vt_ptq_rank_btn {'
    + '  border:none;background:#e5e7eb;color:#374151;width:24px;height:24px;border-radius:4px;'
    + '  cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;'
    + '  transition:background 150ms;font-family:inherit;'
    + '}'
    + '.__vt_ptq_rank_btn:hover { background:#d1d5db; }'
    + '.__vt_ptq_rank_btn:disabled { opacity:0.3;cursor:default; }'
    + '.__vt_ptq_sd_row { display:flex;align-items:center;gap:4px;margin-bottom:8px; }'
    + '.__vt_ptq_sd_label { font-size:12px;color:#6b7280;min-width:60px;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }'
    + '.__vt_ptq_sd_label_r { font-size:12px;color:#6b7280;min-width:60px;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right; }'
    + '.__vt_ptq_sd_btns { display:flex;gap:4px;flex:1;justify-content:center; }'
    + '.__vt_ptq_cs_item { display:flex;align-items:center;gap:8px;margin-bottom:8px; }'
    + '.__vt_ptq_cs_label { flex:1;font-size:13px;color:#374151; }'
    + '.__vt_ptq_cs_input {'
    + '  width:60px;text-align:center;padding:6px;border:1px solid #d1d5db;border-radius:6px;'
    + '  font-size:14px;font-family:inherit;outline:none;'
    + '}'
    + '.__vt_ptq_cs_input:focus { border-color:' + brand + '; }'
    + '.__vt_ptq_cs_total { text-align:right;font-size:13px;font-weight:500;padding-top:4px; }'
    + '.__vt_ptq_img_grid { display:grid;gap:8px; }'
    + '.__vt_ptq_img_item {'
    + '  display:flex;flex-direction:column;align-items:center;padding:8px;border:2px solid #e5e7eb;'
    + '  border-radius:8px;cursor:pointer;transition:all 150ms;'
    + '}'
    + '.__vt_ptq_img_item:hover { border-color:#d1d5db; }'
    + '.__vt_ptq_img_item.selected { border-color:' + brand + ';background:' + brand + '1a; }'
    + '.__vt_ptq_img_item img { width:100%;height:auto;border-radius:4px;margin-bottom:4px; }'
    + '.__vt_ptq_img_label { font-size:12px;text-align:center;color:#374151; }';
  }
`
}

/**
 * Returns all PTQ render functions as a JS code string.
 * These are function declarations that will exist in the IIFE closure.
 */
export function getPtqRenderFunctions(): string {
  return `
  function renderPtqQuestions(ptq) {
    if (!ptq || !ptq.length) return '';
    var html = '';
    for (var i = 0; i < ptq.length; i++) {
      html += renderOnePtqQuestion(ptq[i], i);
    }
    return html;
  }

  function renderOnePtqQuestion(q, idx) {
    var qid = q.id || ('q' + idx);
    var qText = q.question_text || q.text || ('Question ' + (idx + 1));
    var required = q.is_required || q.required;
    var qType = q.question_type || q.type || 'single_line_text';
    var cfg = q.config || {};

    var labelHtml = '<div class="__vt_ptq_qlabel">' + escapeHtml(qText)
      + (required ? '<span class="__vt_ptq_req">*</span>' : '') + '</div>';

    var bodyHtml = '';
    switch (qType) {
      case 'single_line_text':
        bodyHtml = renderPtqText(qid, cfg, false); break;
      case 'multi_line_text': case 'text':
        bodyHtml = renderPtqText(qid, cfg, true); break;
      case 'yes_no':
        bodyHtml = renderPtqYesNo(qid, cfg); break;
      case 'multiple_choice': case 'single_choice':
        bodyHtml = renderPtqChoice(qid, cfg, qType); break;
      case 'opinion_scale': case 'rating':
        bodyHtml = renderPtqScale(qid, cfg, qType); break;
      case 'nps':
        bodyHtml = renderPtqNps(qid, cfg); break;
      case 'slider':
        bodyHtml = renderPtqSlider(qid, cfg); break;
      case 'matrix':
        bodyHtml = renderPtqMatrix(qid, cfg); break;
      case 'semantic_differential':
        bodyHtml = renderPtqSemanticDiff(qid, cfg); break;
      case 'constant_sum':
        bodyHtml = renderPtqConstantSum(qid, cfg); break;
      case 'ranking':
        bodyHtml = renderPtqRanking(qid, cfg); break;
      case 'image_choice':
        bodyHtml = renderPtqImageChoice(qid, cfg); break;
      case 'audio_response':
        bodyHtml = renderPtqText(qid, cfg, true); break;
      default:
        bodyHtml = '<div style="font-size:12px;color:#9ca3af;padding:8px 0;">Unsupported question type</div>';
    }

    return '<div class="__vt_ptq_q" data-qid="' + qid + '">' + labelHtml + bodyHtml + '</div>';
  }

  function renderPtqText(qid, cfg, multiline) {
    var ph = cfg.placeholder || '';
    if (multiline) {
      return '<textarea class="__vt_ptq_textarea" data-ptq="' + qid + '" placeholder="' + escapeHtml(ph) + '" rows="3"></textarea>';
    }
    var inputType = cfg.inputType || 'text';
    return '<input class="__vt_ptq_input" data-ptq="' + qid + '" type="' + inputType + '" placeholder="' + escapeHtml(ph) + '" />';
  }

  function renderPtqYesNo(qid, cfg) {
    var yesLabel = cfg.yesLabel || 'Yes';
    var noLabel = cfg.noLabel || 'No';
    var styleType = cfg.styleType || 'buttons';
    var yesIcon = styleType === 'emotions' ? '&#128522;' : '&#10003;';
    var noIcon = styleType === 'emotions' ? '&#128542;' : '&#10007;';
    return '<div class="__vt_ptq_yn">'
      + '<button class="__vt_ptq_yn_btn" data-ptq-yn="' + qid + '" data-val="true"><span class="__vt_ptq_yn_icon">' + yesIcon + '</span><span class="__vt_ptq_yn_text">' + escapeHtml(yesLabel) + '</span></button>'
      + '<button class="__vt_ptq_yn_btn" data-ptq-yn="' + qid + '" data-val="false"><span class="__vt_ptq_yn_icon">' + noIcon + '</span><span class="__vt_ptq_yn_text">' + escapeHtml(noLabel) + '</span></button>'
      + '</div>';
  }

  function renderPtqChoice(qid, cfg, qType) {
    var opts = cfg.options || [];
    var mode = cfg.mode || (qType === 'single_choice' ? 'single' : 'single');
    var inputType = mode === 'multi' ? 'checkbox' : 'radio';
    var html = '';
    for (var i = 0; i < opts.length; i++) {
      var opt = opts[i];
      var optId = opt.id || ('o' + i);
      var optLabel = opt.label || opt.text || opt.value || '';
      html += '<label class="__vt_ptq_opt" data-ptq-opt="' + qid + '">'
        + '<input type="' + inputType + '" name="ptq_' + qid + '" value="' + escapeHtml(optId) + '" data-ptq-choice="' + qid + '" data-mode="' + mode + '" />'
        + '<span>' + escapeHtml(optLabel) + '</span>'
        + '</label>';
    }
    if (cfg.allowOther) {
      html += '<label class="__vt_ptq_opt" data-ptq-opt="' + qid + '">'
        + '<input type="' + inputType + '" name="ptq_' + qid + '" value="__other" data-ptq-choice="' + qid + '" data-mode="' + mode + '" />'
        + '<span>' + escapeHtml(cfg.otherLabel || 'Other') + '</span>'
        + '</label>'
        + '<input class="__vt_ptq_input" data-ptq-other="' + qid + '" placeholder="Please specify..." style="display:none;margin-top:4px;" />';
    }
    return html;
  }

  function renderPtqScale(qid, cfg, qType) {
    var scaleType = cfg.scaleType || 'numerical';
    var points = cfg.scalePoints || cfg.maxRating || 5;
    var startAt = cfg.startAtZero ? 0 : 1;
    var end = cfg.startAtZero ? points - 1 : points;
    var leftLabel = cfg.leftLabel || '';
    var rightLabel = cfg.rightLabel || '';
    var btns = '';
    for (var v = startAt; v <= end; v++) {
      var display = '';
      if (scaleType === 'stars') { display = '&#9733;'; }
      else if (scaleType === 'emotions') {
        var pos = (end - startAt) > 0 ? (v - startAt) / (end - startAt) : 0.5;
        if (pos <= 0.2) display = '&#128542;';
        else if (pos <= 0.4) display = '&#128533;';
        else if (pos <= 0.6) display = '&#128528;';
        else if (pos <= 0.8) display = '&#128578;';
        else display = '&#128516;';
      } else { display = String(v); }
      btns += '<button class="__vt_ptq_scale_btn" data-ptq-scale="' + qid + '" data-val="' + v + '" data-scale-type="' + scaleType + '">' + display + '</button>';
    }
    var labelsHtml = '';
    if (leftLabel || rightLabel) {
      labelsHtml = '<div class="__vt_ptq_scale_labels"><span>' + escapeHtml(leftLabel) + '</span><span>' + escapeHtml(rightLabel) + '</span></div>';
    }
    return '<div class="__vt_ptq_scale_row"><div class="__vt_ptq_scale_btns">' + btns + '</div>' + labelsHtml + '</div>';
  }

  function renderPtqNps(qid, cfg) {
    var leftLabel = cfg.leftLabel || 'Not at all likely';
    var rightLabel = cfg.rightLabel || 'Extremely likely';
    var btns = '';
    for (var v = 0; v <= 10; v++) {
      btns += '<button class="__vt_ptq_scale_btn __vt_ptq_nps_btn" data-ptq-nps="' + qid + '" data-val="' + v + '">' + v + '</button>';
    }
    return '<div class="__vt_ptq_scale_row"><div class="__vt_ptq_scale_btns">' + btns + '</div>'
      + '<div class="__vt_ptq_scale_labels"><span>' + escapeHtml(leftLabel) + '</span><span>' + escapeHtml(rightLabel) + '</span></div></div>';
  }

  function renderPtqSlider(qid, cfg) {
    var min = typeof cfg.minValue === 'number' ? cfg.minValue : 0;
    var max = typeof cfg.maxValue === 'number' ? cfg.maxValue : 100;
    var step = cfg.step || 1;
    var mid = Math.round((min + max) / 2);
    var leftLabel = cfg.leftLabel || '';
    var rightLabel = cfg.rightLabel || '';
    var midLabel = cfg.middleLabel || '';
    return '<div class="__vt_ptq_slider_wrap">'
      + '<div class="__vt_ptq_slider_val" data-ptq-sval="' + qid + '">' + mid + '</div>'
      + '<input type="range" class="__vt_ptq_slider" data-ptq-slider="' + qid + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + mid + '" />'
      + '<div class="__vt_ptq_scale_labels"><span>' + escapeHtml(leftLabel) + '</span>'
      + (midLabel ? '<span>' + escapeHtml(midLabel) + '</span>' : '')
      + '<span>' + escapeHtml(rightLabel) + '</span></div></div>';
  }

  function renderPtqMatrix(qid, cfg) {
    var rows = cfg.rows || [];
    var cols = cfg.columns || [];
    var multi = cfg.allowMultiplePerRow;
    var inputType = multi ? 'checkbox' : 'radio';
    var headerHtml = '<tr><th></th>';
    for (var c = 0; c < cols.length; c++) headerHtml += '<th>' + escapeHtml(cols[c].label || '') + '</th>';
    headerHtml += '</tr>';
    var bodyHtml = '';
    for (var r = 0; r < rows.length; r++) {
      var rid = rows[r].id || ('r' + r);
      bodyHtml += '<tr><td>' + escapeHtml(rows[r].label || '') + '</td>';
      for (var c2 = 0; c2 < cols.length; c2++) {
        var cid = cols[c2].id || ('c' + c2);
        bodyHtml += '<td><input type="' + inputType + '" name="ptq_' + qid + '_' + rid + '" value="' + escapeHtml(cid) + '" data-ptq-matrix="' + qid + '" data-row="' + rid + '" /></td>';
      }
      bodyHtml += '</tr>';
    }
    return '<div style="overflow-x:auto;"><table class="__vt_ptq_matrix"><thead>' + headerHtml + '</thead><tbody>' + bodyHtml + '</tbody></table></div>';
  }

  function renderPtqSemanticDiff(qid, cfg) {
    var scales = cfg.scales || [];
    var points = cfg.scalePoints || 7;
    var halfPoints = Math.floor(points / 2);
    var html = '';
    for (var s = 0; s < scales.length; s++) {
      var scale = scales[s];
      var sid = scale.id || ('s' + s);
      html += '<div class="__vt_ptq_sd_row"><span class="__vt_ptq_sd_label">' + escapeHtml(scale.leftLabel || '') + '</span><div class="__vt_ptq_sd_btns">';
      for (var p = -halfPoints; p <= halfPoints; p++) {
        html += '<button class="__vt_ptq_scale_btn" data-ptq-sd="' + qid + '" data-scale="' + sid + '" data-val="' + p + '" style="width:28px;height:28px;min-width:28px;padding:0;font-size:11px;">'
          + (cfg.showNumbers ? p : '&#9675;') + '</button>';
      }
      html += '</div><span class="__vt_ptq_sd_label_r">' + escapeHtml(scale.rightLabel || '') + '</span></div>';
    }
    return html;
  }

  function renderPtqConstantSum(qid, cfg) {
    var items = cfg.items || [];
    var total = cfg.totalPoints || 100;
    var html = '';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var iid = item.id || ('i' + i);
      html += '<div class="__vt_ptq_cs_item"><span class="__vt_ptq_cs_label">' + escapeHtml(item.label || '') + '</span>'
        + '<input type="number" class="__vt_ptq_cs_input" data-ptq-cs="' + qid + '" data-item="' + iid + '" min="0" max="' + total + '" value="0" /></div>';
    }
    html += '<div class="__vt_ptq_cs_total" data-ptq-cstotal="' + qid + '">0 / ' + total + '</div>';
    return html;
  }

  function renderPtqRanking(qid, cfg) {
    var items = cfg.items || [];
    var html = '';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var iid = item.id || ('i' + i);
      html += '<div class="__vt_ptq_rank_item" data-ptq-rankitem="' + qid + '" data-item="' + iid + '" data-pos="' + i + '">'
        + '<span class="__vt_ptq_rank_num">' + (i + 1) + '</span>'
        + '<span class="__vt_ptq_rank_text">' + escapeHtml(item.label || '') + '</span>'
        + '<button class="__vt_ptq_rank_btn" data-ptq-rankup="' + qid + '" data-pos="' + i + '"' + (i === 0 ? ' disabled' : '') + '>&#8593;</button>'
        + '<button class="__vt_ptq_rank_btn" data-ptq-rankdown="' + qid + '" data-pos="' + i + '"' + (i === items.length - 1 ? ' disabled' : '') + '>&#8595;</button>'
        + '</div>';
    }
    return '<div data-ptq-rankwrap="' + qid + '">' + html + '</div>';
  }

  function renderPtqImageChoice(qid, cfg) {
    var opts = cfg.options || [];
    var mode = cfg.mode || 'single';
    var cols = cfg.gridColumns || 2;
    var showLabels = cfg.showLabels !== false;
    var html = '<div class="__vt_ptq_img_grid" style="grid-template-columns:repeat(' + cols + ',1fr);">';
    for (var i = 0; i < opts.length; i++) {
      var opt = opts[i];
      var optId = opt.id || ('o' + i);
      html += '<div class="__vt_ptq_img_item" data-ptq-img="' + qid + '" data-val="' + escapeHtml(optId) + '" data-mode="' + mode + '">'
        + (opt.imageUrl ? '<img src="' + escapeHtml(opt.imageUrl) + '" alt="" />' : '<div style="height:60px;background:#f3f4f6;border-radius:4px;width:100%;"></div>')
        + (showLabels && opt.label ? '<span class="__vt_ptq_img_label">' + escapeHtml(opt.label) + '</span>' : '')
        + '</div>';
    }
    html += '</div>';
    return html;
  }
`
}

/**
 * Returns PTQ init, listeners, helpers, and submit logic as a JS code string.
 */
export function getPtqLogic(): string {
  return `
  function initPtq() {
    var task = tasks[currentTaskIndex];
    var ptq = task && task.post_task_questions;
    if (!ptq || !ptq.length) { advanceToNextTask(); return; }
    ptqResponses = {};
    for (var i = 0; i < ptq.length; i++) {
      var q = ptq[i];
      var qid = q.id || ('q' + i);
      var qType = q.question_type || q.type;
      var cfg = q.config || {};
      if (qType === 'slider') {
        var smin = typeof cfg.minValue === 'number' ? cfg.minValue : 0;
        var smax = typeof cfg.maxValue === 'number' ? cfg.maxValue : 100;
        ptqResponses[qid] = Math.round((smin + smax) / 2);
      }
      if (qType === 'ranking' && cfg.items) {
        ptqResponses[qid] = [];
        for (var ri = 0; ri < cfg.items.length; ri++) ptqResponses[qid].push(cfg.items[ri].id || ('i' + ri));
      }
      if (qType === 'constant_sum' && cfg.items) {
        var csVal = {};
        for (var ci = 0; ci < cfg.items.length; ci++) csVal[cfg.items[ci].id || ('i' + ci)] = 0;
        ptqResponses[qid] = csVal;
      }
      if (qType === 'semantic_differential' && cfg.scales) ptqResponses[qid] = {};
      if (qType === 'matrix') ptqResponses[qid] = {};
    }
    attachPtqListeners();
    setTimeout(updatePtqSubmitButton, 0);
  }

  function attachPtqListeners() {
    if (!widgetRoot) return;
    var ptqBody = widgetRoot.querySelector('[data-ptq-body]');
    if (!ptqBody) return;

    ptqBody.addEventListener('click', function(e) {
      var t = e.target;
      var ynBtn = t.closest ? t.closest('[data-ptq-yn]') : null;
      if (ynBtn) {
        var qid = ynBtn.getAttribute('data-ptq-yn');
        ptqResponses[qid] = ynBtn.getAttribute('data-val') === 'true';
        var siblings = widgetRoot.querySelectorAll('[data-ptq-yn="' + qid + '"]');
        for (var i = 0; i < siblings.length; i++) siblings[i].classList.toggle('selected', siblings[i].getAttribute('data-val') === ynBtn.getAttribute('data-val'));
        return;
      }
      var scaleBtn = t.closest ? t.closest('[data-ptq-scale]') : null;
      if (scaleBtn) {
        var qid = scaleBtn.getAttribute('data-ptq-scale');
        var val = parseInt(scaleBtn.getAttribute('data-val'));
        ptqResponses[qid] = val;
        var siblings = widgetRoot.querySelectorAll('[data-ptq-scale="' + qid + '"]');
        var isStars = scaleBtn.getAttribute('data-scale-type') === 'stars';
        for (var i = 0; i < siblings.length; i++) {
          var sv = parseInt(siblings[i].getAttribute('data-val'));
          siblings[i].classList.remove('selected', 'star-selected');
          if (isStars) {
            if (sv <= val) siblings[i].classList.add('star-selected');
          } else {
            if (sv === val) siblings[i].classList.add('selected');
          }
        }
        return;
      }
      var npsBtn = t.closest ? t.closest('[data-ptq-nps]') : null;
      if (npsBtn) {
        var qid = npsBtn.getAttribute('data-ptq-nps');
        var val = parseInt(npsBtn.getAttribute('data-val'));
        ptqResponses[qid] = val;
        var siblings = widgetRoot.querySelectorAll('[data-ptq-nps="' + qid + '"]');
        for (var i = 0; i < siblings.length; i++) {
          var sv = parseInt(siblings[i].getAttribute('data-val'));
          siblings[i].classList.remove('selected', 'detractor', 'passive', 'promoter');
          if (sv === val) {
            siblings[i].classList.add('selected');
            if (val <= 6) siblings[i].classList.add('detractor');
            else if (val <= 8) siblings[i].classList.add('passive');
            else siblings[i].classList.add('promoter');
          }
        }
        return;
      }
      var sdBtn = t.closest ? t.closest('[data-ptq-sd]') : null;
      if (sdBtn) {
        var qid = sdBtn.getAttribute('data-ptq-sd');
        var sid = sdBtn.getAttribute('data-scale');
        var val = parseInt(sdBtn.getAttribute('data-val'));
        if (!ptqResponses[qid]) ptqResponses[qid] = {};
        ptqResponses[qid][sid] = val;
        var siblings = widgetRoot.querySelectorAll('[data-ptq-sd="' + qid + '"][data-scale="' + sid + '"]');
        for (var i = 0; i < siblings.length; i++) siblings[i].classList.toggle('selected', parseInt(siblings[i].getAttribute('data-val')) === val);
        return;
      }
      var rankUp = t.closest ? t.closest('[data-ptq-rankup]') : null;
      if (rankUp) { handlePtqRankMove(rankUp.getAttribute('data-ptq-rankup'), parseInt(rankUp.getAttribute('data-pos')), -1); return; }
      var rankDown = t.closest ? t.closest('[data-ptq-rankdown]') : null;
      if (rankDown) { handlePtqRankMove(rankDown.getAttribute('data-ptq-rankdown'), parseInt(rankDown.getAttribute('data-pos')), 1); return; }
      var imgItem = t.closest ? t.closest('[data-ptq-img]') : null;
      if (imgItem) {
        var qid = imgItem.getAttribute('data-ptq-img');
        var val = imgItem.getAttribute('data-val');
        var mode = imgItem.getAttribute('data-mode');
        if (mode === 'multi') {
          if (!ptqResponses[qid]) ptqResponses[qid] = { optionIds: [] };
          var ids = ptqResponses[qid].optionIds || [];
          var idx = ids.indexOf(val);
          if (idx === -1) ids.push(val); else ids.splice(idx, 1);
          ptqResponses[qid] = { optionIds: ids };
          imgItem.classList.toggle('selected');
        } else {
          ptqResponses[qid] = { optionId: val };
          var siblings = widgetRoot.querySelectorAll('[data-ptq-img="' + qid + '"]');
          for (var i = 0; i < siblings.length; i++) siblings[i].classList.toggle('selected', siblings[i].getAttribute('data-val') === val);
        }
        return;
      }
    });

    // Cumulative hover preview for star scale buttons
    ptqBody.addEventListener('mouseover', function(e) {
      var t = e.target;
      var scaleBtn = t.closest ? t.closest('[data-ptq-scale]') : null;
      if (scaleBtn && scaleBtn.getAttribute('data-scale-type') === 'stars') {
        var qid = scaleBtn.getAttribute('data-ptq-scale');
        var val = parseInt(scaleBtn.getAttribute('data-val'));
        var siblings = widgetRoot.querySelectorAll('[data-ptq-scale="' + qid + '"]');
        for (var i = 0; i < siblings.length; i++) {
          var sv = parseInt(siblings[i].getAttribute('data-val'));
          siblings[i].classList.toggle('star-hover', sv <= val);
        }
      }
    });
    ptqBody.addEventListener('mouseout', function(e) {
      var t = e.target;
      var scaleBtn = t.closest ? t.closest('[data-ptq-scale]') : null;
      if (scaleBtn && scaleBtn.getAttribute('data-scale-type') === 'stars') {
        var qid = scaleBtn.getAttribute('data-ptq-scale');
        var siblings = widgetRoot.querySelectorAll('[data-ptq-scale="' + qid + '"]');
        for (var i = 0; i < siblings.length; i++) siblings[i].classList.remove('star-hover');
      }
    });

    ptqBody.addEventListener('input', function(e) {
      var t = e.target;
      if (t.getAttribute('data-ptq')) { ptqResponses[t.getAttribute('data-ptq')] = t.value; return; }
      if (t.getAttribute('data-ptq-slider')) {
        var qid = t.getAttribute('data-ptq-slider');
        ptqResponses[qid] = parseInt(t.value);
        var valEl = widgetRoot.querySelector('[data-ptq-sval="' + qid + '"]');
        if (valEl) valEl.textContent = t.value;
        return;
      }
      if (t.getAttribute('data-ptq-cs')) { handlePtqConstantSumChange(t); return; }
      if (t.getAttribute('data-ptq-other')) {
        var qid = t.getAttribute('data-ptq-other');
        if (ptqResponses[qid]) ptqResponses[qid].otherText = t.value;
        return;
      }
    });

    ptqBody.addEventListener('change', function(e) {
      var t = e.target;
      if (t.getAttribute('data-ptq-choice')) {
        var qid = t.getAttribute('data-ptq-choice');
        var mode = t.getAttribute('data-mode') || 'single';
        if (mode === 'multi') {
          var checked = widgetRoot.querySelectorAll('[data-ptq-choice="' + qid + '"]:checked');
          var ids = [];
          for (var i = 0; i < checked.length; i++) ids.push(checked[i].value);
          ptqResponses[qid] = { optionIds: ids };
        } else {
          ptqResponses[qid] = { optionId: t.value };
        }
        var opts = widgetRoot.querySelectorAll('[data-ptq-opt="' + qid + '"]');
        for (var i = 0; i < opts.length; i++) {
          var inp = opts[i].querySelector('input');
          opts[i].classList.toggle('selected', inp && inp.checked);
        }
        var otherInput = widgetRoot.querySelector('[data-ptq-other="' + qid + '"]');
        if (otherInput) {
          var hasOther = mode === 'multi'
            ? (ptqResponses[qid] && ptqResponses[qid].optionIds && ptqResponses[qid].optionIds.indexOf('__other') !== -1)
            : (ptqResponses[qid] && ptqResponses[qid].optionId === '__other');
          otherInput.style.display = hasOther ? 'block' : 'none';
        }
        return;
      }
      if (t.getAttribute('data-ptq-matrix')) {
        var qid = t.getAttribute('data-ptq-matrix');
        var rowId = t.getAttribute('data-row');
        if (!ptqResponses[qid]) ptqResponses[qid] = {};
        if (t.type === 'checkbox') {
          var checked = widgetRoot.querySelectorAll('[data-ptq-matrix="' + qid + '"][data-row="' + rowId + '"]:checked');
          var vals = [];
          for (var i = 0; i < checked.length; i++) vals.push(checked[i].value);
          ptqResponses[qid][rowId] = vals;
        } else {
          ptqResponses[qid][rowId] = t.value;
        }
        return;
      }
    });

    ['click', 'input', 'change'].forEach(function(evt) {
      ptqBody.addEventListener(evt, function() { updatePtqSubmitButton(); }, false);
    });
  }

  function handlePtqConstantSumChange(input) {
    var qid = input.getAttribute('data-ptq-cs');
    var iid = input.getAttribute('data-item');
    if (!ptqResponses[qid]) ptqResponses[qid] = {};
    ptqResponses[qid][iid] = parseInt(input.value) || 0;
    var total = 0;
    var inputs = widgetRoot.querySelectorAll('[data-ptq-cs="' + qid + '"]');
    for (var i = 0; i < inputs.length; i++) total += parseInt(inputs[i].value) || 0;
    var task = tasks[currentTaskIndex];
    var ptq = task && task.post_task_questions;
    var targetTotal = 100;
    if (ptq) {
      for (var i = 0; i < ptq.length; i++) {
        if ((ptq[i].id || ('q' + i)) === qid && ptq[i].config) { targetTotal = ptq[i].config.totalPoints || 100; break; }
      }
    }
    var totalEl = widgetRoot.querySelector('[data-ptq-cstotal="' + qid + '"]');
    if (totalEl) {
      totalEl.textContent = total + ' / ' + targetTotal;
      totalEl.style.color = total === targetTotal ? '#22c55e' : (total > targetTotal ? '#ef4444' : '#6b7280');
    }
  }

  function handlePtqRankMove(qid, pos, direction) {
    var ranking = ptqResponses[qid];
    if (!ranking) return;
    var newPos = pos + direction;
    if (newPos < 0 || newPos >= ranking.length) return;
    var temp = ranking[pos];
    ranking[pos] = ranking[newPos];
    ranking[newPos] = temp;
    updatePtqRankingUI(qid);
  }

  function updatePtqRankingUI(qid) {
    var wrap = widgetRoot.querySelector('[data-ptq-rankwrap="' + qid + '"]');
    if (!wrap) return;
    var ranking = ptqResponses[qid];
    if (!ranking) return;
    var task = tasks[currentTaskIndex];
    var ptq = task && task.post_task_questions;
    var itemMap = {};
    if (ptq) {
      for (var i = 0; i < ptq.length; i++) {
        if ((ptq[i].id || ('q' + i)) === qid && ptq[i].config && ptq[i].config.items) {
          var items = ptq[i].config.items;
          for (var j = 0; j < items.length; j++) itemMap[items[j].id || ('i' + j)] = items[j].label || '';
          break;
        }
      }
    }
    var html = '';
    for (var i = 0; i < ranking.length; i++) {
      html += '<div class="__vt_ptq_rank_item" data-ptq-rankitem="' + qid + '" data-item="' + ranking[i] + '" data-pos="' + i + '">'
        + '<span class="__vt_ptq_rank_num">' + (i + 1) + '</span>'
        + '<span class="__vt_ptq_rank_text">' + escapeHtml(itemMap[ranking[i]] || ranking[i]) + '</span>'
        + '<button class="__vt_ptq_rank_btn" data-ptq-rankup="' + qid + '" data-pos="' + i + '"' + (i === 0 ? ' disabled' : '') + '>&#8593;</button>'
        + '<button class="__vt_ptq_rank_btn" data-ptq-rankdown="' + qid + '" data-pos="' + i + '"' + (i === ranking.length - 1 ? ' disabled' : '') + '>&#8595;</button>'
        + '</div>';
    }
    wrap.innerHTML = html;
  }

  function updatePtqSubmitButton() {
    if (!widgetRoot) return;
    var btn = widgetRoot.querySelector('[data-action="ptq-submit"]');
    if (!btn) return;
    var task = tasks[currentTaskIndex];
    var ptq = task && task.post_task_questions;
    if (!ptq) return;
    var allValid = true;
    for (var i = 0; i < ptq.length; i++) {
      var q = ptq[i];
      var qid = q.id || ('q' + i);
      var required = q.is_required || q.required;
      if (!required) continue;
      var val = ptqResponses[qid];
      if (val === undefined || val === null || val === '') { allValid = false; break; }
    }
    btn.disabled = !allValid;
  }

  function handlePtqSubmit() {
    var task = tasks[currentTaskIndex];
    var ptq = task && task.post_task_questions;
    if (!ptq) { advanceToNextTask(); return; }
    for (var i = 0; i < ptq.length; i++) {
      var q = ptq[i];
      var qid = q.id || ('q' + i);
      var required = q.is_required || q.required;
      if (!required) continue;
      var val = ptqResponses[qid];
      if (val === undefined || val === null || val === '') {
        var qEl = widgetRoot.querySelector('[data-qid="' + qid + '"]');
        if (qEl) {
          qEl.style.outline = '2px solid #ef4444';
          qEl.style.outlineOffset = '4px';
          qEl.style.borderRadius = '8px';
          qEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(function() { if (qEl) { qEl.style.outline = ''; qEl.style.outlineOffset = ''; } }, 2000);
        }
        return;
      }
    }
    var responses = [];
    for (var i = 0; i < ptq.length; i++) {
      var q = ptq[i];
      var qid = q.id || ('q' + i);
      if (ptqResponses[qid] !== undefined && ptqResponses[qid] !== null && ptqResponses[qid] !== '') {
        responses.push({ questionId: qid, value: ptqResponses[qid] });
      }
    }
    var lastResp = taskResponses[taskResponses.length - 1];
    if (lastResp) lastResp.postTaskResponses = responses;
    removeBlockingOverlay();
    widgetState = 'ptq_saved';
    renderWidget();
    setTimeout(function() { advanceToNextTask(); }, 800);
  }
`
}
