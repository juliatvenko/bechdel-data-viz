/* =============================================
   Chart 1 — 100% Stacked Bar
   Shows proportional rating breakdown per decade.

   WHY THIS CHART:
   - 100% stacked bars make decades comparable regardless of total film count
   - Green anchored at bottom so the eye tracks the pass rate across time
   - Filter buttons let the viewer focus on modern cinema only

   Depends on: shared.js  (COLORS, M, showTip, hideTip)
   ============================================= */

function drawBar(data) {
  d3.select("#chart-bar").selectAll("*").remove();

  const W        = document.getElementById("chart-bar").clientWidth || 960;
  const isMobile = W < 520;
  // Extra bottom margin on mobile to accommodate rotated x-axis labels
  const margin   = { top: 20, right: 12, bottom: isMobile ? 72 : 44, left: isMobile ? 38 : 58 };
  const H        = Math.min(isMobile ? 300 : 420, window.innerHeight * 0.5);
  const iW = W - margin.left - margin.right;
  const iH = H - margin.top - margin.bottom;

  const svg = d3.select("#chart-bar").append("svg")
    .attr("width", W).attr("height", H)
    .attr("viewBox", `0 0 ${W} ${H}`)
    .style("font-family", "'IBM Plex Sans', sans-serif");

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // Ordinal band scale — one slot per decade
  const x = d3.scaleBand()
    .domain(data.map(d => d.decade))
    .range([0, iW])
    .padding(0.18);

  // Y always 0–1 because bars are proportions, not counts
  const y = d3.scaleLinear().domain([0, 1]).range([iH, 0]);

  // d3.stack converts each decade row into [y0, y1] segments per rating key
  // Keys ordered 3→0 so rating 3 (pass) sits at the bottom of each bar
  const stacked = d3.stack()
    .keys([3, 2, 1, 0])
    .value((d, k) => d[k])
    (data);

  // Horizontal gridlines (no labels, purely visual guide)
  g.append("g")
    .call(d3.axisLeft(y).ticks(5).tickSize(-iW).tickFormat(""))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line").attr("stroke","#e8e5de").attr("stroke-dasharray","3,3"));

  // One <g> layer per rating key, each filled with the matching color
  g.selectAll(".layer")
    .data(stacked)
    .join("g")
      .attr("fill", d => COLORS[d.key])
    .selectAll("rect")
    // Spread key onto each bar's datum so the tooltip can read it
    .data(d => d.map(pt => ({ ...pt, key: d.key })))
    .join("rect")
      .attr("x",      d => x(d.data.decade))
      .attr("width",  x.bandwidth())
      // Start bars at the bottom for the grow-up animation
      .attr("y",      iH)
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
      .delay((d, i) => i * 25)   // stagger bars left-to-right
      .ease(d3.easeCubicOut)
      .attr("y",      d => y(d[1]))
      .attr("height", d => Math.max(0, y(d[0]) - y(d[1])));

  // X axis — D3 places ticks at band start by default;
  // manually shift each tick to the center of its bar
  g.append("g")
    .attr("transform", `translate(0,${iH})`)
    .call(d3.axisBottom(x).tickFormat(d => `${d}s`).tickSize(0))
    .call(g => g.select(".domain").attr("stroke","#e0ddd6"))
    .call(g => g.selectAll(".tick")
      .attr("transform", d => `translate(${x(d) + x.bandwidth() / 2}, 0)`))
    .call(g => g.selectAll("text")
      .attr("fill","#999")
      .attr("font-size", isMobile ? 9 : 11)
      // On mobile rotate -50° so labels don't overlap
      .attr("dy", isMobile ? "0.4em" : "1.4em")
      .attr("dx", isMobile ? "-0.5em" : "0")
      .attr("text-anchor", isMobile ? "end" : "middle")
      .attr("transform", isMobile ? "rotate(-50)" : null));

  // Y axis — suppress the 0% label to reduce clutter at the baseline
  g.append("g")
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => d === 0 ? "" : d3.format(".0%")(d)))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line").remove())
    .call(g => g.selectAll("text").attr("fill","#aaa").attr("font-size", isMobile ? 9 : 11));

  // Small % pass label above each bar — skipped on mobile (too crowded)
  if (!isMobile) {
    g.selectAll(".pct").data(data).join("text")
      .attr("x", d => x(d.decade) + x.bandwidth() / 2)
      .attr("y", y(1) - 4)
      .attr("text-anchor","middle")
      .attr("font-size", 10).attr("fill","#bbb")
      .text(d => `${Math.round(d[3]*100)}%`);
  }
}
