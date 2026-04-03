/* =============================================
   Chart 2 — Line Chart
   Trend of % passing (rating 3) since the 1960s.
   Depends on: shared.js  (M, showTip, hideTip)
               main.js    (allData — global)
   ============================================= */

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
