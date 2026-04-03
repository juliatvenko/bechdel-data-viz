/* =============================================
   Chart 1 — 100% Stacked Bar
   Shows proportional rating breakdown per decade.
   Depends on: shared.js  (COLORS, M, showTip, hideTip)
   ============================================= */

function drawBar(data) {
  d3.select("#chart-bar").selectAll("*").remove();

  const margin = { top: 20, right: 24, bottom: 44, left: 58 };
  const W  = document.getElementById("chart-bar").clientWidth || 960;
  const H  = Math.min(420, window.innerHeight * 0.5);
  const iW = W - margin.left - margin.right;
  const iH = H - margin.top - margin.bottom;

  const svg = d3.select("#chart-bar").append("svg")
    .attr("width", W).attr("height", H)
    .attr("viewBox", `0 0 ${W} ${H}`)
    .style("font-family", "'IBM Plex Sans', sans-serif");

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // X scale: ordinal band for decades
  const x = d3.scaleBand()
    .domain(data.map(d => d.decade))
    .range([0, iW])
    .padding(0.18);

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
      .delay((d, i) => i * 25)
      .ease(d3.easeCubicOut)
      .attr("y",      d => y(d[1]))
      .attr("height", d => Math.max(0, y(d[0]) - y(d[1])));

  // X axis — tick repositioned to center of each bar
  g.append("g")
    .attr("transform", `translate(0,${iH})`)
    .call(d3.axisBottom(x).tickFormat(d => `${d}s`).tickSize(0))
    .call(g => g.select(".domain").attr("stroke","#e0ddd6"))
    .call(g => g.selectAll(".tick")
      .attr("transform", d => `translate(${x(d) + x.bandwidth() / 2}, 0)`))
    .call(g => g.selectAll("text")
      .attr("fill","#999").attr("font-size",11)
      .attr("dy","1.4em")
      .attr("text-anchor","middle"));

  // Y axis — percentage format
  g.append("g")
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => d === 0 ? "" : d3.format(".0%")(d)))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line").remove())
    .call(g => g.selectAll("text").attr("fill","#aaa").attr("font-size",11));

  // % pass label above each bar
  g.selectAll(".pct").data(data).join("text")
    .attr("x", d => x(d.decade) + x.bandwidth() / 2)
    .attr("y", y(1) - 4)
    .attr("text-anchor","middle")
    .attr("font-size", 10).attr("fill","#bbb")
    .text(d => `${Math.round(d[3]*100)}%`);
}
