document.addEventListener("DOMContentLoaded", function () {
    const plotButton = document.getElementById("plot-btn");
    plotButton.addEventListener("click", scaleData);

    let svgContainer = null; // Variable to store the SVG container

    const additionalBarWidth = 5;
    const spacingBetweenBars = 2;

    // Function to create plots based on featureDataArray
    function createPlots() {
        const plotData = JSON.parse(sessionStorage.getItem("plotData"));
        const data = plotData['data'];
        const scaledData = plotData['scaled_data'];
        const smoothedIndexes = plotData['smoothed_data'];

        const tuples = plotData['data']['tuples'];

        // Extract x_values and feature data
        const xValues = data["x_values"];
        const features = Object.keys(data).filter(key => key !== "x_values" && key !== "tuples");

        // Set up the dimensions of your subplots
        const margin = { top: 20, right: 20, bottom: 30, left: 40 }; // Adjust the margins as needed

        // Calculate the maximum width of the parent container
        const parentContainer = document.querySelector(".plot-container");
        const parentWidth = parentContainer.clientWidth;

        // Calculate the total height required for all subplots
        const fixedSubplotHeight = 200; // Set your desired fixed height here
        const totalHeight = fixedSubplotHeight * features.length;

        // Create a color scale using Viridis
        const colorScale = d3.scaleSequential(d3.interpolateViridis)
            .domain([0, features.length]);

        // If the SVG container doesn't exist, create it
        if (!svgContainer) {
            // Create an SVG container to hold all the subplots
            svgContainer = d3.select(".plot-container").append("svg")
                .attr("width", parentWidth)
                .attr("height", totalHeight);
        } else {
            // Clear the existing content in the SVG container
            svgContainer.selectAll("*").remove();
        }

        // Define the scales for your subplots (x and y scales)
        const xScale = d3.scaleLinear()
            .domain([0, d3.max(xValues)])
            .range([margin.left, parentWidth - margin.right]);

        // Create x-axis only once since it's shared among subplots
        const xAxis = d3.axisBottom(xScale);

        // Create a group for each subplot
        const subplotGroup = svgContainer.selectAll(".subplot")
            .data(features)
            .enter().append("g")
            .attr("class", "subplot")
            .attr("transform", (d, i) => `translate(0,${i * fixedSubplotHeight})`);

        // Function to check if a feature exists in scaledData
        function featureExistsInScaledData(feature) {
            return scaledData.hasOwnProperty(feature);
        }

        // Define an area generator function for shading
        const area = d3.area()
            .x((d, i) => xScale(d[0]))
            .y0(0)
            .y1(fixedSubplotHeight - margin.top - margin.bottom);

        // Add text label for the feature name inside each subplot
        subplotGroup.each(function (feature, index) {
            // Add text label for the feature name
            d3.select(this).append("text")
                .attr("x", -1)
                .attr("y", 15)
                .text(feature)
                .style("fill", colorScale(index));

            // Create a path element for the line and fill the area under the curve
            const yValues = data[feature];
            const yScale = d3.scaleLinear()
                .domain([0, d3.max(yValues)])
                .range([fixedSubplotHeight - margin.top - margin.bottom, 0]);

            const line = d3.line()
                .x((d, i) => xScale(xValues[i]))
                .y(d => yScale(d));

            d3.select(this).append("path")
                .attr("class", "line")
                .style("stroke", colorScale(index))
                .style("fill", colorScale(index))
                .attr("d", line(yValues))
                .style("stroke-opacity", 0.5)
                .style("fill-opacity", 0.5);

            // Check if the feature exists in scaledData
            if (featureExistsInScaledData(feature)) {
                const scaledYValues = scaledData[feature];

                // Create a path element for the scaled data with a different alpha value
                const scaledLine = d3.line()
                    .x((d, i) => xScale(xValues[i]))
                    .y(d => yScale(d));

                // Plot data from scaledData with a different alpha value
                d3.select(this).append("path")
                    .attr("class", "line")
                    .attr("d", scaledLine(scaledYValues))
                    .style("stroke", colorScale(index))
                    .style("fill", colorScale(index));
            }

            // Create filled areas based on the x-axis intervals
            const xIntervals = tuples[feature];
            if (Array.isArray(xIntervals)) {
                xIntervals.forEach(interval => {
                    const x1 = xScale(interval[0]);
                    const x2 = xScale(interval[1]);

                    d3.select(this).append("rect")
                        .attr("x", x1)
                        .attr("y", 0)
                        .attr("width", x2 - x1)
                        .attr("height", fixedSubplotHeight - margin.top - margin.bottom)
                        .style("fill", "lightgray")
                        .style("fill-opacity", 0.35);
                });
            }
        });

        // Create x-axis line only for the last subplot
        const lastSubplot = d3.select(subplotGroup.nodes()[features.length - 1]);
        lastSubplot.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${fixedSubplotHeight - margin.top - margin.bottom})`)
            .call(xAxis);

        function featureExistsInSmoothedData(feature) {
            return smoothedIndexes.hasOwnProperty(feature);
        }

        features.forEach((feature) => {
            console.log('feature: ' + feature);

            // Function to check if a feature exists in smoothedData
            function featureExistsInSmoothedData(feature) {
                return smoothedIndexes.hasOwnProperty(feature);
            }

            features.forEach((feature) => {
                if (featureExistsInSmoothedData(feature)) {
                    const indexes = smoothedIndexes[feature];
                    const yValues = scaledData[feature];
                    console.log('YVALUES: ' + yValues.slice(0, 5));
                    console.log('SCALED YVALUES: ' + yValues.slice(0, 5));
                    const barWidth = 10;

                    const yScale = d3.scaleLinear()
                        .domain([0, d3.max(yValues)])
                        .range([fixedSubplotHeight - margin.top - margin.bottom, 0]);

                    indexes.forEach((index) => {
                        const xValue = xValues[index];
                        const barHeight = yScale(yValues[index]);

                        // Create a bar for the feature at the given index
                        const barGroup = subplotGroup.filter((d, i) => d === feature);
                        barGroup.append("rect")
                            .attr("class", "bar")
                            .attr("x", xScale(xValue) - barWidth / 2)
                            .attr("y", barHeight)
                            .attr("width", barWidth)
                            .attr("height", fixedSubplotHeight - margin.top - margin.bottom - barHeight)
                            .style("fill", "lightgray")
                            .style("fill-opacity", 0.5);

                        barGroup.append("rect")
                            .attr("class", "left-bar")
                            .attr("x", xScale(xValue) - barWidth / 2 - additionalBarWidth - spacingBetweenBars)
                            .attr("y", barHeight)
                            .attr("width", additionalBarWidth)
                            .attr("height", fixedSubplotHeight - margin.top - margin.bottom - barHeight)
                            .style("fill", "red")
                            .style("fill-opacity", 0.5);


                        // Create the right bar
                        barGroup.append("rect")
                            .attr("class", "right-bar")
                            .attr("x", xScale(xValue) + barWidth / 2 + spacingBetweenBars)
                            .attr("y", barHeight)
                            .attr("width", additionalBarWidth)
                            .attr("height", fixedSubplotHeight - margin.top - margin.bottom - barHeight)
                            .style("fill", "red")
                            .style("fill-opacity", 0.5);
                    });
                }
            });
        });
    };

    function scaleData(data) {
        const selectedData = JSON.parse(sessionStorage.getItem("selectedData"));
        const featuresWeights = JSON.parse(sessionStorage.getItem("features_weights"));

        const requestData = {
            data: selectedData,
            features_weights: featuresWeights
        };
        return fetch('http://127.0.0.1:5000/scale', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        })
            .then(response => response.json())
            .then(result => {
                plotData = { 'data': selectedData, 'scaled_data': result.scaled_data, 'smoothed_data': result.smoothed_data }
                sessionStorage.setItem("plotData", JSON.stringify(plotData));
                createPlots();
            })
            .catch(error => {
                console.error('Error scaling data:', error);
            });
    };
});
