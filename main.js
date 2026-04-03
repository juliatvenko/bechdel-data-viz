/* =============================================
   main.js — Data loading, aggregation, UI wiring
   Depends on: charts/shared.js, charts/bar.js,
               charts/line.js, charts/radial.js
   ============================================= */

// ====================================================
// LOAD DATA
// Chart 1 & 2: data/Bechdel.csv  (year, title, rating, genre)
// Chart 3:     aggregated from same CSV by first genre
// ====================================================
Promise.all([
  d3.csv("data/Bechdel.csv", d => ({
    year:        +d.year,
    title:        d.title,
    rating:      +d.rating,
    genre:        d.genres ? d.genres.split(",")[0].trim() : "",
    imdbRating:  +d.averageRating || 0,
    numVotes:    +d.numVotes      || 0
  }))
]).then(([raw]) => {

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

  // allData is global so bar.js can reference it directly
  allData = aggregate(raw.filter(d => d.year >= 1870 && d.year <= 2029));

  // yearData — same stats but per calendar year, used by line chart
  function aggregateByYear(data) {
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
      d => d.year
    );
    return Array.from(map, ([year, v]) => ({ year, ...v }))
      .sort((a, b) => a.year - b.year);
  }

  yearData = aggregateByYear(raw.filter(d => d.year >= 1960 && d.year <= 2029));

  // genreData — pass rate per first genre, used by radial chart
  // titleType values (movie, short, …) are excluded as non-genres
  const NON_GENRES = new Set(["movie", "short", "Short", "tvShort", "tvMovie", "tvEpisode", ""]);
  function aggregateByGenre(data) {
    const map = d3.rollup(
      data.filter(d => d.genre && !NON_GENRES.has(d.genre)),
      values => {
        const total = values.length;
        const pass  = values.filter(d => d.rating === 3).length;
        return { total, pass, rate: pass / total };
      },
      d => d.genre
    );
    return Array.from(map, ([genre, v]) => ({ genre, ...v }))
      .filter(d => d.total >= 50)
      .sort((a, b) => b.rate - a.rate);
  }

  genreData = aggregateByGenre(raw);

  // ====================================================
  // FILTER BUTTONS
  // ====================================================
  function setupFilterGroup(selector, onFilter) {
    document.querySelectorAll(selector).forEach(btn => {
      btn.addEventListener("click", function() {
        document.querySelectorAll(selector).forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        onFilter(+this.dataset.from, +this.dataset.to);
      });
    });
  }

  setupFilterGroup(".filter-btn-bar", (from, to) => {
    drawBar(allData.filter(d => d.decade >= from && d.decade <= to));
  });

  setupFilterGroup(".filter-btn-radial", (from, to) => {
    drawRadial(aggregateByGenre(raw.filter(d => d.year >= from && d.year <= to)));
  });

  setupFilterGroup(".filter-btn-scatter", (from, to) => {
    drawScatter(raw.filter(d => d.year >= from && d.year <= to));
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
  drawRadial(genreData);
  drawScatter(raw);

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
      d3.select("#chart-radial").selectAll("*").remove();
      drawRadial(genreData);
      d3.select("#chart-scatter").selectAll("*").remove();
      drawScatter(raw);
    }, 200);
  });

}).catch(err => {
  ["chart-bar","chart-line","chart-radial","chart-scatter"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<p style="color:#bbb;padding:1.5rem 0;font-size:13px">
      ⚠️ Place <code>Bechdel.csv</code> in the <code>data/</code> folder<br>
      and open via: <code>python3 -m http.server 8000</code></p>`;
  });
  console.error("Data load error:", err);
});
