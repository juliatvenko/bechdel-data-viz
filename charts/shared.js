/* =============================================
   Shared constants and tooltip helpers
   Used by bar.js, line.js, scatter.js
   ============================================= */

const COLORS = { 0:"#C9503A", 1:"#E8A838", 2:"#74C69D", 3:"#2D6A4F" };
const M = { top: 20, right: 24, bottom: 44, left: 58 };

const tooltip = d3.select("#tooltip");

function showTip(event, html) {
  tooltip.classed("visible", true)
    .style("left", (event.clientX + 16) + "px")
    .style("top",  (event.clientY - 48) + "px")
    .html(html);
}

function hideTip() { tooltip.classed("visible", false); }
