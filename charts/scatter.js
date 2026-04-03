/* =============================================
   Chart 3 — Scatter Plot
   Budget (x) vs domestic gross (y), colored by pass/fail.
   Source: FiveThirtyEight dataset (films up to 2013).
   Depends on: shared.js  (M, showTip, hideTip)
   ============================================= */

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
