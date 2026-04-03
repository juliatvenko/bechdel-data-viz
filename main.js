/* =============================================
   main.js — Data loading, aggregation, UI wiring
   Depends on: charts/shared.js, charts/bar.js,
               charts/line.js, charts/scatter.js
   ============================================= */

// ====================================================
// LOAD DATA
// Chart 1 & 2: data/Bechdel.csv  (year, title, rating)
// Chart 3:     FiveThirtyEight   (title, year, budget_2013, domgross_2013, binary)
// ====================================================
Promise.all([
  d3.csv("data/Bechdel.csv", d => ({
    year:   +d.year,
    title:  d.title,
    rating: +d.rating
  })),
  d3.csv("https://raw.githubusercontent.com/fivethirtyeight/data/master/bechdel/movies.csv", d => ({
    title:   d.title,
    year:    +d.year,
    budget:  +d["budget_2013$"],    // inflation-adjusted to 2013 USD
    gross:   +d["domgross_2013$"],
    pass:    d.binary === "PASS"    // PASS = rating 3
  })).catch(() => [])               // scatter falls back gracefully if blocked
]).then(([raw, fte]) => {

  // ====================================================
  // AGGREGATE BY DECADE
  // ====================================================
  function aggregate(data) {
    const map = d3.rollup(
      data,
      values => {
        const total = values.length;
        const counts = d3.rollup(values, g => g.length, d => d.rating);
        return {
          total,
          0: (counts.get(0) ?? 0) / total,
          1: (counts.get(1) ?? 0) / total,
          2: (counts.get(2) ?? 0) / total,
          3: (counts.get(3) ?? 0) / total,
          n0: counts.get(0) ?? 0,
          n1: counts.get(1) ?? 0,
          n2: counts.get(2) ?? 0,
          n3: counts.get(3) ?? 0,
        };
      },
      d => Math.floor(d.year / 10) * 10
    );
    return Array.from(map, ([decade, v]) => ({ decade, ...v }))
      .sort((a, b) => a.decade - b.decade);
  }

  // allData is global so line.js can reference it directly
  allData = aggregate(raw.filter(d => d.year >= 1870 && d.year <= 2029));

  // ====================================================
  // FILTER BUTTONS
  // ====================================================
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", function() {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      const filtered = allData.filter(d =>
        d.decade >= +this.dataset.from && d.decade <= +this.dataset.to
      );
      drawBar(filtered);
    });
  });

  // ====================================================
  // SCROLL REVEAL
  // ====================================================
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        revealObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));

  // ====================================================
  // ANIMATED COUNTERS
  // ====================================================
  function animateCounter(el) {
    const target = +el.dataset.target;
    const start = performance.now();
    const duration = 1200;
    (function update(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(eased * target).toLocaleString("en");
      if (t < 1) requestAnimationFrame(update);
    })(start);
  }

  const statsObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.querySelectorAll(".stat-num").forEach(animateCounter);
        statsObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });
  const statsSection = document.querySelector(".stats-section");
  if (statsSection) statsObserver.observe(statsSection);

  // ====================================================
  // INIT
  // ====================================================
  drawBar(allData);
  drawLine();
  drawScatter(fte);

  // Redraw on resize
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const activeBtn = document.querySelector(".filter-btn.active");
      const from = activeBtn ? +activeBtn.dataset.from : 1870;
      const to   = activeBtn ? +activeBtn.dataset.to   : 2030;
      drawBar(allData.filter(d => d.decade >= from && d.decade <= to));
      d3.select("#chart-line").selectAll("*").remove();
      drawLine();
      d3.select("#chart-scatter").selectAll("*").remove();
      drawScatter(fte);
    }, 200);
  });

}).catch(err => {
  ["chart-bar","chart-line","chart-scatter"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<p style="color:#bbb;padding:1.5rem 0;font-size:13px">
      ⚠️ Place <code>Bechdel.csv</code> in the <code>data/</code> folder<br>
      and open via: <code>python3 -m http.server 8000</code></p>`;
  });
  console.error("Data load error:", err);
});
