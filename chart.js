/* =============================================
   BECHDEL TEST — chart.js v3
   D3 v7 | Bar + Line + Scatter
   ============================================= */

const COLORS = { 0:"#C9503A", 1:"#E8A838", 2:"#74C69D", 3:"#2D6A4F" };
const M = { top: 20, right: 24, bottom: 44, left: 58 };

// ---- TOOLTIP ----
const tooltip = d3.select("#tooltip");
function showTip(event, html) {
  tooltip.classed("visible", true)
    .style("left", (event.clientX + 16) + "px")
    .style("top",  (event.clientY - 48) + "px")
    .html(html);
}
function hideTip() { tooltip.classed("visible", false); }

// ====================================================
// LOAD DATA
// Chart 1 & 2: data/Bechdel.csv  (year, title, rating)
// Chart 3:     FiveThirtyEight   (title, year, budget_2013, domgross_2013, binary)
// ====================================================
Promise.all([
  d3.csv("Bechdel.csv", d => ({
    year:   +d.year,
    title:  d.title,
    rating: +d.rating
  })),
  d3.csv("https://raw.githubusercontent.com/fivethirtyeight/data/master/bechdel/movies.csv", d => ({
    title:   d.title,
    year:    +d.year,
    budget:  +d.budget_2013$,    // inflation-adjusted to 2013 USD
    gross:   +d.domgross_2013$,
    pass:    d.binary === "PASS" // PASS = rating 3
  })).catch(() => [])            // scatter falls back gracefully if blocked
]).then(([raw, fte]) => {

  // ---- AGGREGATE BY DECADE ----
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

  const allData = aggregate(raw.filter(d => d.year >= 1900 && d.year <= 2029));

  // ====================================================
  // CHART 1 — 100% STACKED BAR
  // Shows proportional breakdown of ratings per decade
  // ====================================================
  function drawBar(data) {
    d3.select("#chart-bar").selectAll("*").remove();

    const W  = document.getElementById("chart-bar").clientWidth || 960;
    const H  = Math.min(400, window.innerHeight * 0.48);
    const iW = W - M.left - M.right;
    const iH = H - M.top - M.bottom;

    const svg = d3.select("#chart-bar").append("svg")
      .attr("width", W).attr("height", H)
      .attr("viewBox", `0 0 ${W} ${H}`);
    const g = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);

    // X scale: ordinal band for decades
    const x = d3.scaleBand()
      .domain(data.map(d => d.decade))
      .range([0, iW])
      .padding(0.15);

    // Y scale: linear 0–1 (proportions)
    const y = d3.scaleLinear().domain([0, 1]).range([iH, 0]);

    // Stack order bottom→top: 3 (pass) at bottom, 0 (fail) at top
    const stacked = d3.stack()
      .keys([3, 2, 1, 0])
      .value((d, k) => d[k])
      (data);

    // Gridlines
    g.append("g")
      .call(d3.axisLeft(y).ticks(5).tickSize(-iW).tickFormat(""))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").attr("stroke","#e8e5de").attr("stroke-dasharray","3,3"));

    // Bars with stagger animation on enter
    g.selectAll(".layer")
      .data(stacked)
      .join("g")
        .attr("fill", d => COLORS[d.key])
      .selectAll("rect")
      .data(d => d.map(pt => ({ ...pt, key: d.key })))
      .join("rect")
        .attr("x",      d => x(d.data.decade))
        .attr("width",  x.bandwidth())
        .attr("y",      iH)          // start collapsed at bottom
        .attr("height", 0)
        .on("mousemove", (event, d) => {
          showTip(event, `
            <div class="tooltip-title">${d.data.decade}s · ${d.data.total} films</div>
            ${[3,2,1,0].map(r => `
              <div class="tooltip-row">
                <span>${r === 3 ? "Passes" : r === 2 ? "Talks about men" : r === 1 ? "One woman" : "No women"}</span>
                <span>${(d.data[r]*100).toFixed(1)}% · ${d.data["n"+r]}</span>
              </div>`).join("")}`);
        })
        .on("mouseleave", hideTip)
        .transition().duration(600)
        .delay((d, i) => i * 25)
        .ease(d3.easeCubicOut)
        .attr("y",      d => y(d[1]))
        .attr("height", d => Math.max(0, y(d[0]) - y(d[1])));

    // X axis — tick label centered under each bar
    g.append("g")
      .attr("transform", `translate(0,${iH})`)
      .call(d3.axisBottom(x).tickFormat(d => `${d}s`).tickSize(0))
      .call(g => g.select(".domain").attr("stroke","#e0ddd6"))
      .call(g => g.selectAll("text")
        .attr("fill","#999").attr("font-size",11)
        .attr("font-family","'IBM Plex Sans',sans-serif")
        .attr("dy","1.4em")
        .attr("dx", x.bandwidth() / 2)
        .attr("text-anchor","middle"));

    // Y axis — percentage format
    g.append("g")
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => d === 0 ? "" : d3.format(".0%")(d)))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").remove())
      .call(g => g.selectAll("text").attr("fill","#aaa").attr("font-size",11)
        .attr("font-family","'IBM Plex Sans',sans-serif"));

    // % pass label above each bar
    g.selectAll(".pct").data(data).join("text")
      .attr("x", d => x(d.decade) + x.bandwidth() / 2)
      .attr("y", y(1) - 4)
      .attr("text-anchor","middle")
      .attr("font-size", 10).attr("fill","#bbb")
      .attr("font-family","'IBM Plex Sans',sans-serif")
      .text(d => `${Math.round(d[3]*100)}%`);
  }

  // ====================================================
  // CHART 2 — LINE CHART
  // Trend of % passing (rating 3) since 1960s
  // ====================================================
  function drawLine() {
    const data = allData.filter(d => d.decade >= 1960);

    const W  = document.getElementById("chart-line").clientWidth || 960;
    const H  = 280;
    const iW = W - M.left - M.right;
    const iH = H - M.top - M.bottom;

    const svg = d3.select("#chart-line").append("svg")
      .attr("width", W).attr("height", H)
      .attr("viewBox", `0 0 ${W} ${H}`);
    const g = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);

    // X: linear scale for decade values
    const x = d3.scaleLinear()
      .domain(d3.extent(data, d => d.decade))
      .range([0, iW]);

    // Y: proportion 0–1
    const y = d3.scaleLinear().domain([0.3, 0.75]).range([iH, 0]);

    // Gridlines
    g.append("g")
      .call(d3.axisLeft(y).ticks(5).tickSize(-iW).tickFormat(""))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").attr("stroke","#e8e5de").attr("stroke-dasharray","3,3"));

    // Shaded area under line
    const area = d3.area()
      .x(d => x(d.decade)).y0(iH).y1(d => y(d[3]))
      .curve(d3.curveMonotoneX);

    g.append("path").datum(data)
      .attr("fill","#2D6A4F").attr("fill-opacity", 0.07)
      .attr("d", area);

    // Line with draw-on animation
    const line = d3.line()
      .x(d => x(d.decade)).y(d => y(d[3]))
      .curve(d3.curveMonotoneX);

    const path = g.append("path").datum(data)
      .attr("fill","none").attr("stroke","#2D6A4F")
      .attr("stroke-width", 2).attr("d", line);

    const len = path.node().getTotalLength();
    path.attr("stroke-dasharray", len).attr("stroke-dashoffset", len)
      .transition().duration(1400).ease(d3.easeLinear)
      .attr("stroke-dashoffset", 0);

    // Dots with tooltip
    g.selectAll(".dot").data(data).join("circle")
      .attr("cx", d => x(d.decade)).attr("cy", d => y(d[3]))
      .attr("r", 4).attr("fill","#2D6A4F")
      .attr("stroke","#fafaf8").attr("stroke-width", 1.5)
      .style("cursor","pointer")
      .on("mousemove", (event, d) => showTip(event, `
        <div class="tooltip-title">${d.decade}s</div>
        <div class="tooltip-row"><span>Pass rate</span><span>${(d[3]*100).toFixed(1)}%</span></div>
        <div class="tooltip-row"><span>Films passing</span><span>${d.n3} of ${d.total}</span></div>`))
      .on("mouseleave", hideTip);

    // Axes
    g.append("g").attr("transform", `translate(0,${iH})`)
      .call(d3.axisBottom(x).tickValues(data.map(d => d.decade)).tickFormat(d => `${d}s`).tickSize(0))
      .call(g => g.select(".domain").attr("stroke","#e0ddd6"))
      .call(g => g.selectAll("text").attr("fill","#999").attr("font-size",11)
        .attr("font-family","'IBM Plex Sans',sans-serif").attr("dy","1.4em"));

    g.append("g")
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => d3.format(".0%")(d)))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").remove())
      .call(g => g.selectAll("text").attr("fill","#aaa").attr("font-size",11)
        .attr("font-family","'IBM Plex Sans',sans-serif"));
  }

  // ====================================================
  // CHART 3 — SCATTER PLOT
  // Budget (x) vs domestic gross (y), colored by pass/fail
  // Data source: FiveThirtyEight (films up to 2013)
  // ====================================================
  function drawScatter(data) {
    // Filter: need both budget and gross to be positive
    const clean = data.filter(d =>
      d.budget > 0 && d.gross > 0 &&
      d.budget < 4e8 && d.gross < 8e8  // remove extreme outliers
    );

    if (clean.length === 0) {
      document.getElementById("chart-scatter").innerHTML =
        `<p style="color:#bbb;font-size:13px;padding:1rem 0">
          Scatter plot requires the FiveThirtyEight dataset.<br>
          It loads automatically from GitHub — check your network connection.
        </p>`;
      return;
    }

    const W  = document.getElementById("chart-scatter").clientWidth || 960;
    const H  = Math.min(440, window.innerHeight * 0.5);
    const iW = W - M.left - M.right - 20;
    const iH = H - M.top - M.bottom;

    const svg = d3.select("#chart-scatter").append("svg")
      .attr("width", W).attr("height", H)
      .attr("viewBox", `0 0 ${W} ${H}`);
    const g = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);

    // X: budget (log scale handles wide range better)
    const x = d3.scaleLog()
      .domain(d3.extent(clean, d => d.budget))
      .range([0, iW]).nice();

    // Y: domestic gross (log scale)
    const y = d3.scaleLog()
      .domain(d3.extent(clean, d => d.gross))
      .range([iH, 0]).nice();

    // Gridlines
    g.append("g")
      .call(d3.axisLeft(y).ticks(5).tickSize(-iW).tickFormat(""))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").attr("stroke","#e8e5de").attr("stroke-dasharray","3,3"));

    // Reference line: gross = budget (break-even)
    const breakEvenMin = Math.max(x.domain()[0], y.domain()[0]);
    const breakEvenMax = Math.min(x.domain()[1], y.domain()[1]);
    g.append("line")
      .attr("x1", x(breakEvenMin)).attr("y1", y(breakEvenMin))
      .attr("x2", x(breakEvenMax)).attr("y2", y(breakEvenMax))
      .attr("stroke","#ccc").attr("stroke-dasharray","4,4")
      .attr("stroke-width", 1);

    g.append("text")
      .attr("x", x(breakEvenMax) - 8).attr("y", y(breakEvenMax) - 6)
      .attr("text-anchor","end").attr("font-size", 10)
      .attr("fill","#bbb").attr("font-family","'IBM Plex Sans',sans-serif")
      .text("break even");

    // Dots — fail first (behind), pass on top
    const sorted = [...clean].sort((a, b) => a.pass - b.pass);

    g.selectAll(".dot").data(sorted).join("circle")
      .attr("cx", d => x(d.budget))
      .attr("cy", d => y(d.gross))
      .attr("r",  3.5)
      .attr("fill", d => d.pass ? "#2D6A4F" : "#C9503A")
      .attr("fill-opacity", 0.55)
      .attr("stroke", "none")
      .style("cursor","pointer")
      .on("mousemove", (event, d) => showTip(event, `
        <div class="tooltip-title">${d.title} (${d.year})</div>
        <div class="tooltip-row"><span>Budget</span><span>$${d3.format(",.0f")(d.budget)}</span></div>
        <div class="tooltip-row"><span>Domestic gross</span><span>$${d3.format(",.0f")(d.gross)}</span></div>
        <div class="tooltip-row"><span>Bechdel</span><span>${d.pass ? "✓ Pass" : "✗ Fail"}</span></div>`))
      .on("mouseleave", hideTip);

    // X axis — log scale with dollar format
    g.append("g").attr("transform", `translate(0,${iH})`)
      .call(d3.axisBottom(x).ticks(6,"$~s").tickSize(0))
      .call(g => g.select(".domain").attr("stroke","#e0ddd6"))
      .call(g => g.selectAll("text").attr("fill","#999").attr("font-size",10)
        .attr("font-family","'IBM Plex Sans',sans-serif").attr("dy","1.4em"));

    // Y axis
    g.append("g")
      .call(d3.axisLeft(y).ticks(5,"$~s"))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").remove())
      .call(g => g.selectAll("text").attr("fill","#aaa").attr("font-size",10)
        .attr("font-family","'IBM Plex Sans',sans-serif"));

    // Axis labels
    svg.append("text").attr("x", M.left + iW/2).attr("y", H - 4)
      .attr("text-anchor","middle").attr("font-size",11).attr("fill","#bbb")
      .attr("font-family","'IBM Plex Sans',sans-serif")
      .text("Production budget (inflation-adjusted to 2013 USD)");

    svg.append("text")
      .attr("transform","rotate(-90)")
      .attr("x", -(M.top + iH/2)).attr("y", 14)
      .attr("text-anchor","middle").attr("font-size",11).attr("fill","#bbb")
      .attr("font-family","'IBM Plex Sans',sans-serif")
      .text("Domestic gross (2013 USD)");
  }

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
      const from = activeBtn ? +activeBtn.dataset.from : 1900;
      const to   = activeBtn ? +activeBtn.dataset.to   : 2020;
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
      and open via: <code>npx serve .</code></p>`;
  });
  console.error("Data load error:", err);
});
