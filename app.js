// 圆点闪视 v0 — 核心逻辑
(function () {
  "use strict";

  var COLORS = {
    red:   { label: "红色", hex: "#FF3B30" },
    blue:  { label: "蓝色", hex: "#0A84FF" },
    green: { label: "绿色", hex: "#30D158" }
  };
  var COLOR_ORDER = ["red", "blue", "green"];

  var els = {
    setup: document.getElementById("setup"),
    countdown: document.getElementById("countdown"),
    test: document.getElementById("test"),
    result: document.getElementById("result"),
    count: document.getElementById("count"),
    minP: document.getElementById("minP"),
    maxP: document.getElementById("maxP"),
    durationRadios: document.getElementsByName("duration"),
    colorRadios: document.getElementsByName("colors"),
    startBtn: document.getElementById("startBtn"),
    cdNum: document.getElementById("cdNum"),
    board: document.getElementById("board"),
    answer: document.getElementById("answer"),
    answerInputs: document.getElementById("answerInputs"),
    nextBtn: document.getElementById("nextBtn"),
    progress: document.getElementById("progress"),
    accuracy: document.getElementById("accuracy"),
    resultTable: document.getElementById("resultTable"),
    retryBtn: document.getElementById("retryBtn")
  };

  var state = {
    settings: null,
    questions: [],
    current: 0,
    results: []
  };

  var dotTimer = null;

  function showPage(id) {
    [els.setup, els.countdown, els.test, els.result].forEach(function (p) {
      p.classList.remove("active");
    });
    document.getElementById(id).classList.add("active");
  }

  function getColorCount() {
    for (var i = 0; i < els.colorRadios.length; i++) {
      if (els.colorRadios[i].checked) return parseInt(els.colorRadios[i].value, 10);
    }
    return 1;
  }

  function getDuration() {
    for (var i = 0; i < els.durationRadios.length; i++) {
      if (els.durationRadios[i].checked) return parseFloat(els.durationRadios[i].value);
    }
    return 1;
  }

  function randInt(a, b) {
    return a + Math.floor(Math.random() * (b - a + 1));
  }

  function startTest() {
    var count = Math.max(1, parseInt(els.count.value, 10) || 10);
    var minP = Math.max(1, parseInt(els.minP.value, 10) || 9);
    var maxP = Math.max(minP, parseInt(els.maxP.value, 10) || 13);
    var colorCount = getColorCount();
    minP = Math.max(minP, colorCount); // 保证点数够分给每种颜色
    var duration = getDuration();
    var enabled = COLOR_ORDER.slice(0, colorCount);

    state.settings = {
      count: count, minP: minP, maxP: maxP,
      colorCount: colorCount, duration: duration, enabled: enabled
    };
    state.questions = [];
    state.results = [];
    state.current = 0;

    for (var i = 0; i < count; i++) {
      state.questions.push(generateQuestion(state.settings));
    }

    showPage("countdown");
    runCountdown(3, function () { showQuestion(0); });
  }

  function generateQuestion(s) {
    var total = randInt(s.minP, s.maxP);
    var counts = {};
    s.enabled.forEach(function (c) { counts[c] = 1; }); // 每种颜色至少 1 个
    var remaining = total - s.enabled.length;
    while (remaining > 0) {
      var c = s.enabled[randInt(0, s.enabled.length - 1)];
      counts[c]++;
      remaining--;
    }
    var colorList = [];
    s.enabled.forEach(function (c) {
      for (var i = 0; i < counts[c]; i++) colorList.push(c);
    });
    return { total: total, counts: counts, colorList: colorList };
  }

  function runCountdown(n, done) {
    els.cdNum.textContent = n;
    var cur = n;
    var timer = setInterval(function () {
      cur--;
      if (cur <= 0) {
        clearInterval(timer);
        done();
      } else {
        els.cdNum.textContent = cur;
      }
    }, 1000);
  }

  function resizeCanvas() {
    var rect = els.board.getBoundingClientRect();
    els.board.width = Math.max(1, Math.floor(rect.width));
    els.board.height = Math.max(1, Math.floor(rect.height));
  }

  function generatePositions(n, r, W, H) {
    var margin = r + 12;
    var minDist = 2 * r + 14;
    var pts = [];
    var attempts = 0;
    while (pts.length < n && attempts < 6000) {
      attempts++;
      var x = margin + Math.random() * (W - 2 * margin);
      var y = margin + Math.random() * (H - 2 * margin);
      var ok = true;
      for (var i = 0; i < pts.length; i++) {
        if (Math.hypot(pts[i].x - x, pts[i].y - y) < minDist) { ok = false; break; }
      }
      if (ok) pts.push({ x: x, y: y });
    }
    while (pts.length < n) {
      pts.push({
        x: margin + Math.random() * (W - 2 * margin),
        y: margin + Math.random() * (H - 2 * margin)
      });
    }
    return pts;
  }

  function drawDots(q) {
    resizeCanvas();
    var ctx = els.board.getContext("2d");
    var W = els.board.width, H = els.board.height;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    var r = Math.max(14, Math.min(W, H) * 0.045);
    var positions = generatePositions(q.total, r, W, H);
    q.positions = positions;
    positions.forEach(function (p, idx) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = COLORS[q.colorList[idx]].hex;
      ctx.fill();
    });
  }

  function clearBoard() {
    var ctx = els.board.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, els.board.width, els.board.height);
  }

  function flashAndAnswer(q) {
    drawDots(q);
    dotTimer = setTimeout(function () {
      clearBoard();
      showAnswerForm(q);
    }, state.settings.duration * 1000);
  }

  var INTERVAL_BUFFER = 500; // 题间黑屏缓冲（毫秒）

  function showQuestion(i, buffer) {
    state.current = i;
    var q = state.questions[i];
    els.progress.textContent = "第 " + (i + 1) + " / " + state.questions.length + " 题";
    els.answer.style.display = "none";
    showPage("test");
    clearBoard(); // 先黑屏
    if (buffer) {
      // 题间缓冲：点完「下一题」后黑屏 0.5 秒再闪圆点
      setTimeout(function () { flashAndAnswer(q); }, INTERVAL_BUFFER);
    } else {
      flashAndAnswer(q);
    }
  }

  function makeInput(label, key) {
    var wrap = document.createElement("div");
    wrap.className = "input-row";
    var lab = document.createElement("label");
    lab.textContent = label;
    var inp = document.createElement("input");
    inp.type = "number";
    inp.min = "0";
    inp.inputMode = "numeric";
    inp.dataset.key = key;
    wrap.appendChild(lab);
    wrap.appendChild(inp);
    return wrap;
  }

  function showAnswerForm(q) {
    els.answerInputs.innerHTML = "";
    if (state.settings.colorCount === 1) {
      els.answerInputs.appendChild(makeInput("圆点数量", "total"));
    } else {
      state.settings.enabled.forEach(function (c) {
        els.answerInputs.appendChild(makeInput(COLORS[c].label + "数量", c));
      });
    }
    els.nextBtn.textContent = (state.current === state.questions.length - 1) ? "查看结果" : "下一题";
    els.answer.style.display = "flex";
    var first = els.answerInputs.querySelector("input");
    if (first) first.focus();
  }

  function submitAnswer() {
    if (dotTimer) { clearTimeout(dotTimer); dotTimer = null; }
    var q = state.questions[state.current];
    var inputs = els.answerInputs.querySelectorAll("input");
    var ans = {};
    inputs.forEach(function (inp) {
      var v = parseInt(inp.value, 10);
      ans[inp.dataset.key] = isNaN(v) ? 0 : v;
    });

    var allCorrect = true;
    var perColor = {};
    if (state.settings.colorCount === 1) {
      perColor.total = (ans.total === q.total);
      allCorrect = perColor.total;
    } else {
      state.settings.enabled.forEach(function (c) {
        perColor[c] = (ans[c] === q.counts[c]);
        if (!perColor[c]) allCorrect = false;
      });
    }

    state.results.push({ q: q, ans: ans, perColor: perColor, allCorrect: allCorrect });

    if (state.current < state.questions.length - 1) {
      showQuestion(state.current + 1, true); // 题间黑屏缓冲
    } else {
      showResult();
    }
  }

  function showResult() {
    showPage("result");
    var total = state.results.length;
    var correctCount = state.results.filter(function (r) { return r.allCorrect; }).length;
    var acc = total ? Math.round(correctCount / total * 100) : 0;
    els.accuracy.textContent = "总正确率：" + correctCount + " / " + total + " 题（" + acc + "%）";

    var html = '<table><thead><tr><th>题号</th><th>正确答案</th><th>你的答案</th><th>结果</th></tr></thead><tbody>';
    state.results.forEach(function (r, idx) {
      var correctStr, ansStr;
      if (state.settings.colorCount === 1) {
        correctStr = String(r.q.total);
        ansStr = String(r.ans.total);
      } else {
        correctStr = state.settings.enabled.map(function (c) { return COLORS[c].label + r.q.counts[c]; }).join(" ");
        ansStr = state.settings.enabled.map(function (c) { return COLORS[c].label + r.ans[c]; }).join(" ");
      }
      html += "<tr><td>" + (idx + 1) + "</td><td>" + correctStr + "</td><td>" + ansStr +
        "</td><td class=\"" + (r.allCorrect ? "ok" : "no") + "\">" + (r.allCorrect ? "✔" : "✘") + "</td></tr>";
    });
    html += "</tbody></table>";
    els.resultTable.innerHTML = html;
  }

  els.startBtn.addEventListener("click", startTest);
  els.nextBtn.addEventListener("click", submitAnswer);
  els.retryBtn.addEventListener("click", function () { showPage("setup"); });
})();
