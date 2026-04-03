/* =============================================
   Chart 4 — Scatter Plot
   IMDb rating (X) vs Bechdel rating band (Y).
   Dot size = numVotes · color = Bechdel rating.
   Median IMDb rating per Bechdel group marked.

   WHY THIS CHART:
   - Tests whether IMDb audience ratings differ by Bechdel score
   - 10 000+ points: overplotting handled with low opacity (0.28),
     small dots, and sqrt size scale (area ∝ votes, not radius)
   - Jitter is deterministic (derived from IMDb rating value)
     so dots stay stable across redraws and filter changes
   - Median lines summarise each group without hiding the spread

   Depends on: shared.js  (COLORS, M, showTip, hideTip)
               main.js    (raw Bechdel data passed as arg)
   ============================================= */

const SCATTER_LABELS = {
  0: "0 — no women",
  1: "1 — one woman",
  2: "2 — talk about men",
  3: "3 — passes test"
};

function drawScatter(data) {
  d3.select("#chart-scatter").selectAll("*").remove();

  // Only keep films that have a valid IMDb entry
  const clean = data.filter(d => d.imdbRating >= 1 && d.numVotes > 0);

  if (clean.length === 0) {
    document.getElementById("chart-scatter").innerHTML =
      `<p style="color:#bbb;font-size:13px;padding:1rem 0">No IMDb data available.</p>`;
    return;
  }

  const W        = document.getElementById("chart-scatter").clientWidth || 960;
  const isMobile = W < 520;
  // On mobile the Y-axis labels are replaced with small inline numbers,
  // so the left margin can shrink from 140px to 28px
  const margin   = { top: 24, right: 16, bottom: 44, left: isMobile ? 28 : 140 };
  const H        = Math.min(isMobile ? 260 : 380, window.innerHeight * 0.46);
  const iW = W - margin.left - margin.right;
  const iH = H - margin.top - margin.bottom;

  const svg = d3.select("#chart-scatter").append("svg")
    .attr("width", W).attr("height", H)
    .attr("viewBox", `0 0 ${W} ${H}`)
    .style("font-family", "'IBM Plex Sans', sans-serif");

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // X: IMDb rating 1–10
  const x = d3.scaleLinear().domain([1, 10]).range([0, iW]).nice();

  // Y: band scale — Bechdel 3 at top, 0 at bottom
  const y = d3.scaleBand()
    .domain([3, 2, 1, 0])
    .range([0, iH])
    .padding(0.25);

  // Sqrt scale so dot area (not radius) is proportional to vote count.
  // Domain capped at the 98th percentile to prevent one blockbuster dot from dominating.
  const sizeScale = d3.scaleSqrt()
    .domain([0, d3.quantile(clean.map(d => d.numVotes).sort(d3.ascending), 0.98)])
    .range([1.5, isMobile ? 4 : 6])
    .clamp(true);

  // Pre-compute stable jitter: derived from the film's own IMDb rating
  // so the position is consistent across redraws (not random each time)
  clean.forEach(d => {
    d._jitter = ((d.imdbRating * 137) % 1 - 0.5) * y.bandwidth() * 0.75;
  });

  // Vertical gridlines (no labels — X axis handles those)
  g.append("g")
    .call(d3.axisBottom(x).ticks(9).tickSize(iH).tickFormat(""))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line")
      .attr("stroke", "#e8e5de").attr("stroke-dasharray", "3,3"));

  // Dots — sorted so rating 0 (fail) renders first and rating 3 sits on top
  g.selectAll(".dot")
    .data([...clean].sort((a, b) => a.rating - b.rating))
    .join("circle")
    .attr("cx", d => x(d.imdbRating))
    .attr("cy", d => y(d.rating) + y.bandwidth() / 2 + d._jitter)
    .attr("r",  d => sizeScale(d.numVotes))
    .attr("fill", d => COLORS[d.rating])
    .attr("fill-opacity", 0.28)   // low opacity reduces overplotting visually
    .attr("stroke", "none")
    .style("cursor", "pointer")
    .on("mousemove", (event, d) => showTip(event, `
      <div class="tooltip-title">${d.title} (${d.year})</div>
      <div class="tooltip-row"><span>IMDb rating</span><span>${d.imdbRating.toFixed(1)}</span></div>
      <div class="tooltip-row"><span>Votes</span><span>${d3.format(",d")(d.numVotes)}</span></div>
      <div class="tooltip-row"><span>Bechdel</span><span>${d.rating} — ${d.rating === 3 ? "passes" : "fails"}</span></div>`))
    .on("mouseleave", hideTip);

  // Median marker per Bechdel group: vertical dashed line spanning the band height
  [0, 1, 2, 3].forEach(r => {
    const med = d3.median(clean.filter(d => d.rating === r), d => d.imdbRating);
    if (med == null) return;
    const bandY = y(r);
    const bw    = y.bandwidth();

    g.append("line")
      .attr("x1", x(med)).attr("x2", x(med))
      .attr("y1", bandY + bw * 0.08).attr("y2", bandY + bw * 0.92)
      .attr("stroke", COLORS[r]).attr("stroke-width", 2)
      .attr("stroke-dasharray", "4,3").attr("opacity", 0.9);

    // Small "med X.X" label just above the band
    g.append("text")
      .attr("x", x(med)).attr("y", bandY - 4)
      .attr("text-anchor", "middle").attr("font-size", isMobile ? 8 : 9)
      .attr("fill", COLORS[r])
      .text(`med ${med.toFixed(1)}`);
  });

  // X axis
  g.append("g")
    .attr("transform", `translate(0,${iH})`)
    .call(d3.axisBottom(x).ticks(isMobile ? 5 : 9).tickSize(0))
    .call(g => g.select(".domain").attr("stroke", "#e0ddd6"))
    .call(g => g.selectAll("text")
      .attr("fill", "#999").attr("font-size", isMobile ? 9 : 11).attr("dy", "1.4em"));

  // Centred "IMDb rating" label below the X axis
  svg.append("text")
    .attr("x", margin.left + iW / 2).attr("y", H - 4)
    .attr("text-anchor", "middle").attr("font-size", isMobile ? 9 : 11).attr("fill", "#bbb")
    .text("IMDb rating");

  // Y axis — on mobile, draw small colored numbers inside each band row;
  // on desktop, draw full descriptive labels on the left axis
  if (isMobile) {
    [3, 2, 1, 0].forEach(r => {
      g.append("text")
        .attr("x", 4)
        .attr("y", y(r) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("font-size", 9)
        .attr("fill", COLORS[r])
        .attr("opacity", 0.7)
        .text(r);
    });
  } else {
    g.append("g")
      .call(d3.axisLeft(y).tickFormat(d => SCATTER_LABELS[d]).tickSize(0))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick text")
        .attr("fill", d => COLORS[d]).attr("font-size", 11).attr("dx", "-8"));
  }
}
