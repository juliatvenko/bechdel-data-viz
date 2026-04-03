/* =============================================
   Chart 3 — Radial Bar Chart
   Genres arranged in a circle; bar length = % pass.
   Color encodes pass rate: red (low) → green (high).

   WHY THIS CHART:
   - Radial layout suits ~15 genres with no strict ranking;
     a straight bar chart would imply a more ordered comparison
   - Bar length and color encode the same value (pass rate),
     so the pattern reads quickly without a second legend
   - Only genres with 50+ films are included to avoid
     misleading percentages from small samples

   Data: first genre from Bechdel.csv genres column,
         aggregated in main.js → genreData global.
   Depends on: shared.js  (showTip, hideTip)
   ============================================= */

function drawRadial(data) {
  d3.select("#chart-radial").selectAll("*").remove();

  // Sort descending so the longest bars start at the top
  data = [...data].sort((a, b) => b.rate - a.rate);

  const el       = document.getElementById("chart-radial");
  const W        = el.clientWidth || 720;
  const isMobile = W < 480;
  // Keep the chart square-ish; cap height so it doesn't get too tall on wide screens
  const H  = Math.min(W * 0.85, 560);
  const cx = W / 2;
  const cy = H / 2;

  // innerR = hole in the middle; outerR = max bar length; labelR = label placement
  const innerR = Math.min(W, H) * 0.11;
  const outerR = Math.min(W, H) * 0.34;
  const labelR = outerR + (isMobile ? 14 : 22);

  const svg = d3.select("#chart-radial").append("svg")
    .attr("width", W).attr("height", H)
    .attr("viewBox", `0 0 ${W} ${H}`)
    .style("font-family", "'IBM Plex Sans', sans-serif");

  // All elements are translated to the centre of the SVG
  const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);

  // ---- Scales ----

  // Angle scale: maps each genre to an angular slot around 0–2π
  const angle = d3.scaleBand()
    .domain(data.map(d => d.genre))
    .range([0, 2 * Math.PI])
    .paddingInner(0.12)
    .paddingOuter(0.06);

  // Radius scale: pass rate 0–1 maps to innerR–outerR
  const r = d3.scaleLinear()
    .domain([0, 1])
    .range([innerR, outerR]);

  // Sequential color: red at 25% pass rate, green at 75%; clamped outside that range
  const colorScale = d3.scaleSequential()
    .domain([0.25, 0.75])
    .interpolator(d3.interpolateRgb("#C9503A", "#2D6A4F"))
    .clamp(true);

  // ---- Circular reference gridlines at 25 / 50 / 75 % ----
  [0.25, 0.5, 0.75].forEach(pct => {
    g.append("circle")
      .attr("r", r(pct))
      .attr("fill", "none")
      .attr("stroke", "#e0ddd6")
      .attr("stroke-dasharray", "3,4")
      .attr("stroke-width", 0.8);
    // Label placed just above each ring at the 12-o'clock position
    g.append("text")
      .attr("x", 3)
      .attr("y", -r(pct) + 3)
      .attr("font-size", isMobile ? 7 : 9)
      .attr("fill", "#ccc")
      .text(d3.format(".0%")(pct));
  });

  // ---- Background arcs (full outerR, light fill) ----
  // These show the maximum possible bar length for each genre slot
  const bgArc = d3.arc()
    .innerRadius(innerR)
    .outerRadius(outerR)
    .startAngle(d => angle(d.genre))
    .endAngle(d => angle(d.genre) + angle.bandwidth())
    .padAngle(0.02)
    .padRadius(innerR);

  g.selectAll(".bg-arc")
    .data(data)
    .join("path")
    .attr("d", bgArc)
    .attr("fill", "#f0ece4")
    .attr("opacity", 0.55);

  // ---- Data arcs — animated grow from innerR to r(pass rate) ----
  g.selectAll(".bar-arc")
    .data(data)
    .join("path")
    .attr("class", "bar-arc")
    .attr("fill", d => colorScale(d.rate))
    .attr("cursor", "pointer")
    .on("mousemove", (event, d) => showTip(event, `
      <div class="tooltip-title">${d.genre}</div>
      <div class="tooltip-row"><span>Pass rate</span><span>${(d.rate * 100).toFixed(1)}%</span></div>
      <div class="tooltip-row"><span>Films passing</span><span>${d.pass} of ${d.total}</span></div>`))
    .on("mouseleave", hideTip)
    // Start at innerR (zero-length bar)
    .attr("d", d => d3.arc()
      .innerRadius(innerR).outerRadius(innerR)
      .startAngle(angle(d.genre))
      .endAngle(angle(d.genre) + angle.bandwidth())
      .padAngle(0.02).padRadius(innerR)())
    .transition().duration(800)
    .delay((d, i) => i * 55)    // stagger each genre for a ripple effect
    .ease(d3.easeCubicOut)
    // attrTween interpolates outerRadius from innerR → r(d.rate) each frame
    .attrTween("d", function(d) {
      const interp = d3.interpolate(innerR, r(d.rate));
      return t => d3.arc()
        .innerRadius(innerR)
        .outerRadius(interp(t))
        .startAngle(angle(d.genre))
        .endAngle(angle(d.genre) + angle.bandwidth())
        .padAngle(0.02).padRadius(innerR)();
    });

  // ---- Genre labels outside each arc ----
  const genreFontSize = isMobile ? 8 : 11;
  const pctFontSize   = isMobile ? 7 : 10;

  g.selectAll(".label")
    .data(data)
    .join("text")
    .attr("class", "label")
    .attr("transform", d => {
      const mid = angle(d.genre) + angle.bandwidth() / 2;
      // Convert polar angle to Cartesian; sin/cos are swapped because 0° is at 12 o'clock
      return `translate(${Math.sin(mid) * labelR}, ${-Math.cos(mid) * labelR})`;
    })
    .attr("text-anchor", d => {
      const s = Math.sin(angle(d.genre) + angle.bandwidth() / 2);
      // Right-side labels: left-aligned; left-side: right-aligned; top/bottom: centred
      return s > 0.1 ? "start" : s < -0.1 ? "end" : "middle";
    })
    .attr("dy", "-0.25em")
    .each(function(d) {
      const mid    = angle(d.genre) + angle.bandwidth() / 2;
      const s      = Math.sin(mid);
      const anchor = s > 0.1 ? "start" : s < -0.1 ? "end" : "middle";

      // Two tspan lines: genre name + pass %
      d3.select(this).append("tspan")
        .attr("x", 0).attr("dy", "0em")
        .attr("font-size", genreFontSize).attr("fill", "#555")
        .attr("text-anchor", anchor)
        .text(d.genre);

      d3.select(this).append("tspan")
        .attr("x", 0).attr("dy", "1.3em")
        .attr("font-size", pctFontSize).attr("fill", "#aaa")
        .attr("text-anchor", anchor)
        .text(`${Math.round(d.rate * 100)}%`);
    });

  // ---- Centre text: average pass rate across all shown genres ----
  const avg = d3.mean(data, d => d.rate);
  g.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "-0.3em")
    .attr("font-size", Math.round(innerR * 0.55))
    .attr("font-weight", "700")
    .attr("fill", "#333")
    .text(`${Math.round(avg * 100)}%`);
  g.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "1.1em")
    .attr("font-size", isMobile ? 8 : 10)
    .attr("fill", "#aaa")
    .text("avg pass");
}
