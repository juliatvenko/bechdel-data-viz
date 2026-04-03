/* =============================================
   Chart 2 — Line Chart
   Trend of % passing (rating 3) per year since 1960.
   Includes OLS regression line.
   Depends on: shared.js  (M, showTip, hideTip)
               main.js    (yearData — global)
   ============================================= */

// Ordinary least-squares linear regression
// Returns { slope, intercept, predict(x) }
function linearRegression(data, xKey, yKey) {
  const n  = data.length;
  const mx = d3.mean(data, d => d[xKey]);
  const my = d3.mean(data, d => d[yKey]);
  const slope = d3.sum(data, d => (d[xKey] - mx) * (d[yKey] - my)) /
                d3.sum(data, d => (d[xKey] - mx) ** 2);
  const intercept = my - slope * mx;
  return { slope, intercept, predict: x => slope * x + intercept };
}

function drawLine() {
  const data = yearData;

  const W  = document.getElementById("chart-line").clientWidth || 960;
  const H  = 280;
  const iW = W - M.left - M.right;
  const iH = H - M.top - M.bottom;

  const svg = d3.select("#chart-line").append("svg")
    .attr("width", W).attr("height", H)
    .attr("viewBox", `0 0 ${W} ${H}`);
  const g = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);

  // X: linear scale over years
  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.year))
    .range([0, iW]);

  // Y: dynamic domain with padding so all values fit
  const [yMin, yMax] = d3.extent(data, d => d[3]);
  const y = d3.scaleLinear()
    .domain([Math.max(0, yMin - 0.05), Math.min(1, yMax + 0.05)])
    .range([iH, 0])
    .nice();

  // Gridlines
  g.append("g")
    .call(d3.axisLeft(y).ticks(5).tickSize(-iW).tickFormat(""))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line").attr("stroke","#e8e5de").attr("stroke-dasharray","3,3"));

  // Shaded area under line
  const area = d3.area()
    .x(d => x(d.year)).y0(iH).y1(d => y(d[3]))
    .curve(d3.curveMonotoneX);

  g.append("path").datum(data)
    .attr("fill","#2D6A4F").attr("fill-opacity", 0.07)
    .attr("d", area);

  // Line with draw-on animation
  const line = d3.line()
    .x(d => x(d.year)).y(d => y(d[3]))
    .curve(d3.curveMonotoneX);

  const path = g.append("path").datum(data)
    .attr("fill","none").attr("stroke","#2D6A4F")
    .attr("stroke-width", 1.5).attr("d", line);

  const len = path.node().getTotalLength();
  path.attr("stroke-dasharray", len).attr("stroke-dashoffset", len)
    .transition().duration(1400).ease(d3.easeLinear)
    .attr("stroke-dashoffset", 0);

  // ---- OLS regression line ----
  const reg = linearRegression(data, "year", 3);
  const [x0, x1] = d3.extent(data, d => d.year);
  const slope_pct = (reg.slope * 10 * 100).toFixed(2); // % change per decade

  g.append("line")
    .attr("x1", x(x0)).attr("y1", y(reg.predict(x0)))
    .attr("x2", x(x1)).attr("y2", y(reg.predict(x1)))
    .attr("stroke", "#E8A838")
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", "5,4")
    .attr("opacity", 0.85);

  // Regression label at the right end
  g.append("text")
    .attr("x", x(x1) + 4)
    .attr("y", y(reg.predict(x1)))
    .attr("dy", "0.35em")
    .attr("font-size", 10)
    .attr("fill", "#E8A838")
    .attr("font-family", "'IBM Plex Sans', sans-serif")
    .text(`${slope_pct > 0 ? "+" : ""}${slope_pct}% / decade`);

  // Dots — small since there are many years
  g.selectAll(".dot").data(data).join("circle")
    .attr("cx", d => x(d.year)).attr("cy", d => y(d[3]))
    .attr("r", 2.5).attr("fill","#2D6A4F")
    .attr("stroke","#fafaf8").attr("stroke-width", 1)
    .style("cursor","pointer")
    .on("mousemove", (event, d) => showTip(event, `
      <div class="tooltip-title">${d.year}</div>
      <div class="tooltip-row"><span>Pass rate</span><span>${(d[3]*100).toFixed(1)}%</span></div>
      <div class="tooltip-row"><span>Films passing</span><span>${d.n3} of ${d.total}</span></div>`))
    .on("mouseleave", hideTip);

  // X axis — tick every 5 years to avoid crowding
  const tickYears = d3.range(
    Math.ceil(d3.min(data, d => d.year) / 5) * 5,
    d3.max(data, d => d.year) + 1,
    5
  );

  g.append("g").attr("transform", `translate(0,${iH})`)
    .call(d3.axisBottom(x).tickValues(tickYears).tickFormat(d => d).tickSize(0))
    .call(g => g.select(".domain").attr("stroke","#e0ddd6"))
    .call(g => g.selectAll("text").attr("fill","#999").attr("font-size",11)
      .attr("font-family","'IBM Plex Sans',sans-serif").attr("dy","1.4em"));

  // Y axis
  g.append("g")
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => d3.format(".0%")(d)))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line").remove())
    .call(g => g.selectAll("text").attr("fill","#aaa").attr("font-size",11)
      .attr("font-family","'IBM Plex Sans',sans-serif"));
}
