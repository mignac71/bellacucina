(function () {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const runBtn = $("#runBtn");
  const toggleErrorsBtn = $("#toggleErrorsBtn");
  const exportCsvBtn = $("#exportCsvBtn");
  const dupCheck = $("#dupCheck");
  const statsBox = $("#stats");
  const tbody = $("#resultsBody");

  let onlyErrors = false;
  let lastRows = []; // pamiętamy wyniki do eksportu

  function sanitizeIssues(path) {
    if (!path) return [];
    const issues = [];
    if (/[A-Z]/.test(path)) issues.push("duże litery");
    if (/[ąćęłńóśźż]/i.test(path)) issues.push("polskie znaki");
    if (/\s/.test(path)) issues.push("spacje");
    if (/%[0-9A-Fa-f]{2}/.test(path)) issues.push("zakodowane znaki");
    return issues;
  }

  function toAbs(url) {
    try {
      return url.startsWith("http") ? url : new URL(url, location.href).href;
    } catch {
      return url || "";
    }
  }

  async function testImage(url) {
    return new Promise((resolve) => {
      if (!url) return resolve({ ok: false, reason: "brak pola image" });
      const img = new Image();
      let done = false;
      const timer = setTimeout(() => {
        if (!done) { done = true; resolve({ ok: false, reason: "timeout" }); }
      }, 8000);
      img.onload = () => { if (!done) { done = true; clearTimeout(timer); resolve({ ok: true }); } };
      img.onerror = () => { if (!done) { done = true; clearTimeout(timer); resolve({ ok: false, reason: "onerror (404?)" }); } };
      img.src = url + (url.includes("?") ? "&" : "?") + "v=" + Date.now(); // omijamy cache
    });
  }

  function renderStats(summary) {
    statsBox.innerHTML = "";
    const make = (text, klass="") => {
      const b = document.createElement("span");
      b.className = "badge " + klass;
      b.textContent = text;
      return b;
    };
    statsBox.append(
      make(`Razem: ${summary.total}`),
      make(`OK: ${summary.ok}`, "ok"),
      make(`Brak image: ${summary.missing}`, summary.missing ? "err" : "ok"),
      make(`Błędne/404: ${summary.broken}`, summary.broken ? "err" : "ok"),
      make(`Ostrzeżenia (nazwa/znaki): ${summary.warn}`, summary.warn ? "warn" : "")
    );
    if (summary.duplicates && summary.duplicates.length) {
      const dup = make(`Duplikaty ścieżek: ${summary.duplicates.length}`, "warn");
      dup.title = summary.duplicates.map(d => `${d.path} → ${d.ids.join(", ")}`).join("\n");
      statsBox.append(dup);
    }
  }

  function toCsv(rows) {
    const header = ["id","italian_name","polish_name","category","image","status","details","absolute_url"];
    const escape = (s) => `"${String(s ?? "").replace(/"/g,'""')}"`;
    const lines = [header.map(escape).join(",")];
    rows.forEach(r => lines.push([
      r.id, r.it, r.pl, r.category, r.image || "", r.status, r.details || "", r.abs || ""
    ].map(escape).join(",")));
    return lines.join("\n");
  }

  function exportCsv(rows) {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "diagnostyka_zdjec_recipes.csv";
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(a.href);
    a.remove();
  }

  function applyFilter() {
    $$("#resultsBody tr").forEach(tr => {
      if (!onlyErrors) { tr.style.display = ""; return; }
      const isError = tr.classList.contains("err") || tr.classList.contains("warn");
      tr.style.display = isError ? "" : "none";
    });
  }

  async function runAudit() {
    const list = (window.recipesData || []);
    tbody.innerHTML = "";
    lastRows = [];

    // wykrywanie duplikatów ścieżek (opcjonalnie)
    const dupMap = {};
    if (dupCheck.checked) {
      list.forEach(r => {
        if (!r.image) return;
        const key = r.image.trim();
        dupMap[key] = dupMap[key] || [];
        dupMap[key].push(r.id);
      });
    }

    let total = list.length, ok=0, missing=0, broken=0, warn=0;
    const rows = await Promise.all(list.map(async (r) => {
      const abs = toAbs(r.image || "");
      const res = await testImage(abs);
      const issues = sanitizeIssues(r.image || "");
      const hasDup = dupCheck.checked && r.image && dupMap[r.image]?.length > 1;

      const row = {
        id: r.id,
        it: r.italian_name,
        pl: r.polish_name,
        category: r.category || "",
        image: r.image || "",
        status: res.ok ? (issues.length || hasDup ? "OK (z ostrzeżeniami)" : "OK") : (r.image ? "BŁĄD" : "BRAK"),
        details: res.ok ? [issues.length ? `nazwa: ${issues.join(", ")}` : "", hasDup ? `duplikat z ID: ${dupMap[r.image].filter(id=>id!==r.id).join(", ")}` : ""].filter(Boolean).join(" | ")
                         : (!r.image ? "brak pola image" : (res.reason || "onerror")),
        abs
      };

      // statystyki
      if (!r.image) missing++;
      else if (!res.ok) broken++;
      else if (issues.length || hasDup) warn++;
      else ok++;

      return row;
    }));

    // render
    rows.forEach(r => {
      lastRows.push(r);
      const tr = document.createElement("tr");
      if (r.status.startsWith("BŁĄD") || r.status === "BRAK") tr.classList.add("err");
      else if (r.status.includes("ostrzeżeniami")) tr.classList.add("warn");

      tr.innerHTML = `
        <td class="nowrap mono">#${r.id}</td>
        <td><strong>${r.it}</strong><br><span class="muted">${r.pl}</span></td>
        <td>${r.category || ""}</td>
        <td class="mono">${r.image || "<span class='muted'>—</span>"}</td>
        <td>${r.status}${r.details ? `<br><span class="muted">${r.details}</span>` : ""}</td>
        <td>${r.abs ? `<a href="${r.abs}" target="_blank" rel="noopener">Podgląd</a>` : "<span class='muted'>—</span>"}</td>
      `;
      tbody.appendChild(tr);
    });

    const duplicates = Object.entries(dupMap)
      .filter(([, ids]) => ids.length > 1)
      .map(([path, ids]) => ({ path, ids }));

    renderStats({ total, ok, missing, broken, warn, duplicates });
    applyFilter();
  }

  runBtn.addEventListener("click", runAudit);
  toggleErrorsBtn.addEventListener("click", () => { onlyErrors = !onlyErrors; toggleErrorsBtn.textContent = onlyErrors ? "Pokaż wszystkie" : "Pokaż tylko błędy"; applyFilter(); });
  exportCsvBtn.addEventListener("click", () => exportCsv(lastRows));

  // Expose initialization function so HTML can trigger the audit
  // after recipe data has been loaded via fetch.
  window.initDiagnostics = runAudit;
})();