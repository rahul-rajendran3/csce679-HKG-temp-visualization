// set the dimensions and margins of the graph
const margin = { top: 100, right: 100, bottom: 100, left: 100 },
  width = 1000 - margin.left - margin.right,
  height = 1000 - margin.top - margin.bottom;

// append the svg to the body of the page
const svg = d3
  .select("#hkg_temp_data")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

// read the data
d3.csv("temperature_daily.csv").then(function (data) {
  data = data
    .map((entry) => ({
      date: new Date(entry.date),
      max_temperature: +entry.max_temperature,
      min_temperature: +entry.min_temperature,
    }))
    .filter((entry) => entry.date.getFullYear() >= 2008);

  // group data by year and month. calculate max and min temperatures for each month
  const aggregatedData = d3.rollup(
    data,
    (v) => ({
      max_temperature: d3.max(v, (d) => d.max_temperature),
      min_temperature: d3.min(v, (d) => d.min_temperature),
      daily_values: v,
    }),
    (d) => d.date.getUTCFullYear(),
    (d) => d.date.getUTCMonth(),
  );

  const finalData = [];
  aggregatedData.forEach((months, year) => {
    months.forEach((temps, month) => {
      finalData.push({
        year: year,
        month: month,
        max_temperature: temps.max_temperature,
        min_temperature: temps.min_temperature,
        daily_values: temps.daily_values,
      });
    });
  });

  const years = Array.from(new Set(data.map((d) => d.date.getUTCFullYear())));
  const months = d3
    .range(12)
    .map(
      (i) =>
        `${new Date(2008, i).toLocaleDateString("default", { month: "long" })}`,
    );

  // build X scales and axis:
  const x = d3.scaleBand().range([0, width]).domain(years).padding(0.25);
  svg.append("g").call(d3.axisTop(x));

  // build Y scales and axis:
  const y = d3.scaleBand().range([0, height]).domain(months).padding(0.25);
  svg.append("g").call(d3.axisLeft(y));

  // build color scale
  const color = d3
    .scaleThreshold()
    .domain(d3.range(0, 44, 4))
    .range(d3.schemeSpectral[11].reverse());

  // create a tooltip
  const tooltip = d3
    .select("#hkg_temp_data")
    .append("div")
    .attr("class", "tooltip");

  const mouseover = function (event, d) {
    tooltip.style("opacity", 1);
    const monthFormat = (d.month + 1).toString().padStart(2, "0");
    tooltip
      .html(
        `Date: ${d.year}-${monthFormat}, max: ${d.max_temperature}, min: ${d.min_temperature}`,
      )
      .style("left", event.pageX + 10 + "px")
      .style("top", event.pageY - 10 + "px");
  };

  // create a group for each cell
  const cells = svg
    .selectAll(".cell-group")
    .data(finalData)
    .join("g")
    .attr("class", "cell-group")
    .attr("transform", (d) => `translate(${x(d.year)}, ${y(months[d.month])})`);

  // create the rect for each cell
  const cellRects = cells
    .append("rect")
    .attr("width", x.bandwidth() + 10)
    .attr("height", y.bandwidth())
    .style("opacity", 0.8)
    .on("mouseover", mouseover)
    .on("mousemove", (event) => {
      tooltip
        .style("left", event.pageX + "px")
        .style("top", event.pageY + "px");
    })
    .on("mouseleave", () => tooltip.style("opacity", 0));

  const updateCellColors = () => {
    const useMin = document.getElementById("toggleMinMax")?.checked;
    cellRects.style("fill", (d) =>
      color(useMin ? d.min_temperature : d.max_temperature),
    );
  };

  updateCellColors();
  document
    .getElementById("toggleMinMax")
    ?.addEventListener("change", updateCellColors);

  // scale for line charts
  const xLine = d3
    .scaleLinear()
    .domain([0, 31])
    .range([2, x.bandwidth() + 10 - 2]);
  const yLine = d3
    .scaleLinear()
    .domain([0, 44])
    .range([y.bandwidth() - 2, 2]);

  const lineMax = d3
    .line()
    .x((d, i) => xLine(i))
    .y((d) => yLine(d.max_temperature));

  const lineMin = d3
    .line()
    .x((d, i) => xLine(i))
    .y((d) => yLine(d.min_temperature));

  // max temp line
  cells
    .append("path")
    .attr("class", "cell-line")
    .attr("d", (d) => lineMax(d.daily_values));

  // min temp line
  cells
    .append("path")
    .attr("class", "cell-line-min")
    .attr("d", (d) => lineMin(d.daily_values));

  // legend
  const legendItemHeight = 20;

  const legend = svg.append("g").attr("transform", `translate(${width}, 30)`);

  legend
    .selectAll("rect")
    .data(color.range())
    .join("rect")
    .attr("y", (d, i) => i * legendItemHeight)
    .attr("width", 20)
    .attr("height", legendItemHeight)
    .style("fill", (d) => d);

  // add labels for the top and bottom
  legend
    .append("text")
    .attr("x", 25)
    .attr("y", 15)
    .text("0 Celsius")
    .style("font-size", "12px");

  legend
    .append("text")
    .attr("x", 25)
    .attr("y", color.range().length * legendItemHeight)
    .text("40 Celsius")
    .style("font-size", "12px");
});

// title
svg
  .append("text")
  .attr("x", 0)
  .attr("y", -50)
  .attr("text-anchor", "left")
  .style("font-size", "22px")
  .text("HKG Monthly Temperature Data (2008-2017)");
