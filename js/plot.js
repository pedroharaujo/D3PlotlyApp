document.addEventListener("DOMContentLoaded", function () {
    const dataDropdown = document.getElementById("data-dropdown");
    const peaksSlider = document.getElementById("peaks-distance-slider");
    const storedDataSets = JSON.parse(localStorage.getItem("dataSets")) || {};
    const fixedSubplotHeight = 125;
    const plotButton = document.getElementById("plot-btn");
    const features_to_exclude_list = ["General KDE", "KDE's sum", "KDE's top"];

    var data = {};
    var scaledData = {};
    var peaksData = {};
    let subplotRefs = {};
    let indexRefs = {};
    let svgContainer = null;
    let xValues, colorScale, xScale, margin, parentContainer, parentWidth, totalHeight, features, colorScaleDefault;


    plotButton.addEventListener("click", function () {
        const configData = JSON.parse(sessionStorage.getItem('configData'));
        if (configData) {
            const defaultWeights = configData['weights'];
            const colors = configData['color'];
            const keyValueArray = Object.keys(colors).map(key => ({ key, value: colors[key] }));
            // Sort the array based on the values
            keyValueArray.sort((a, b) => a.value.localeCompare(b.value));
            // Extract keys from the sorted array
            features = keyValueArray.map(item => item.key);
            features = features.concat(features_to_exclude_list);
        }
        createPlots();
        features.forEach(function (feature, index) {
            if (defaultWeights) {
                if (feature in defaultWeights) {
                    initialValue = defaultWeights[feature];
                }
                else {
                    initialValue = 1;
                }
            }
            else {
                initialValue = 1;
            }
            if (!features_to_exclude_list.includes(feature)) {
                scaleData(feature, initialValue);
                updateSinglePlot(feature, index);
            }
        });
        findPeaks();
    });

    dataDropdown.addEventListener("change", function () {
        const selectedDataset = dataDropdown.value;
        if (selectedDataset) {
            // Update the session storage with the selected dataset
            sessionStorage.setItem("selectedData", JSON.stringify(storedDataSets[selectedDataset]));
            data = storedDataSets[selectedDataset];
            features = Object.keys(data).filter(key => key !== "x_values" && key !== "tuples");
            console.log("features: ", features);
        }
    });

    peaksSlider.addEventListener("change", function () {
        if (Object.keys(subplotRefs).length !== 0 || subplotRefs.constructor !== Object) {
            console.log(peaksSlider.value);
            findPeaks(distance = peaksSlider.value);
        }
    });

    function createPlots() {
        const configData = JSON.parse(sessionStorage.getItem('configData'));
        if (configData) {
            defaultWeights = configData['weights'];
            colorScaleDefault = configData['hex_color'];
        }
        else {
            colorScaleDefault = {};
            defaultWeights = {};
        }
        const tuples = data['tuples'];
        xValues = data["x_values"];
        margin = { top: 20, right: 20, bottom: 30, left: 40 };

        // Calculate the maximum width of the parent container
        parentContainer = document.querySelector(".svg-container");
        parentWidth = parentContainer.clientWidth;

        // Calculate the total height required for all subplots
        totalHeight = fixedSubplotHeight * features.length;

        // Create a color scale using Viridis
        colorScale = d3.scaleSequential(d3.interpolateViridis)
            .domain([0, features.length]);


        // If the SVG container doesn't exist, create it
        if (!svgContainer) {
            // Create an SVG container to hold all the subplots
            svgContainer = d3.select(".svg-container").append("svg")
                .attr("width", parentWidth)
                .attr("height", totalHeight);
            slidersContainer = d3.select(".sliders-container")
                .attr("class", "sliders-container")
                .style("height", totalHeight);
        } else {
            // Clear the existing content in the SVG container
            svgContainer.selectAll("*").remove();
            const slidersContainer = document.querySelector(".sliders-container");
            slidersContainer.innerHTML = '';
        }

        // Define the scales for your subplots (x and y scales)
        xScale = d3.scaleLinear()
            .domain([0, d3.max(xValues)])
            .range([margin.left, parentWidth - margin.right]);

        // Create x-axis only once since it's shared among subplots
        const xAxis = d3.axisBottom(xScale);

        // Create a group for each subplot
        const subplotGroup = svgContainer.selectAll(".subplot")
            .data(features)
            .enter().append("g")
            .attr("class", "subplot")
            .attr("width", parentWidth * 0.7)
            .attr("transform", (d, i) => `translate(0,${i * fixedSubplotHeight})`);

        subplotGroup.each(function (feature, index) {
            if (colorScaleDefault[feature]) {
                color = colorScaleDefault[feature];
            }
            else {
                color = colorScale(index);
            }
            indexRefs[index] = d3.select(this);
            // Add text label for the feature name
            d3.select(this).append("text")
                .attr("x", -1)
                .attr("y", 15)
                .text(feature)
                .style("fill", color);

            // Create a path element for the line and fill the area under the curve
            const yValues = data[feature];
            const yScale = d3.scaleLinear()
                .domain([0, d3.max(yValues)])
                .range([fixedSubplotHeight - margin.top - margin.bottom, 0]);

            subplotRefs[feature] = { element: d3.select(this), yScale: yScale };

            const line = d3.line()
                .x((d, i) => xScale(xValues[i]))
                .y(d => yScale(d));

            d3.select(this).append("path")
                .attr("class", "original-line")
                .style("stroke", color)
                .style("fill", color)
                .attr("d", line(yValues))
                .style("stroke-opacity", 0.5)
                .style("fill-opacity", 0.5);

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
                        .style("fill-opacity", 0.7);
                });
            }

            if (!features_to_exclude_list.includes(feature)) {
                if (defaultWeights) {
                    if (feature in defaultWeights) {
                        initialValue = defaultWeights[feature];
                    }
                    else {
                        initialValue = "1";
                    }
                }
                else {
                    initialValue = "1";
                }
                createSlider(feature, index, initialValue);
            }
        });

        // Create x-axis line only for the last subplot
        const lastSubplot = d3.select(subplotGroup.nodes()[features.length - 1]);
        lastSubplot.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${fixedSubplotHeight - margin.top - margin.bottom})`)
            .call(xAxis);
    };

    function createSlider(feature, index, initialValue) {
        const slidersContainer = document.querySelector(".sliders-container");

        // Create a div with class "feature-slider"
        const featureSliderDiv = document.createElement("div");
        featureSliderDiv.className = "feature-slider";
        featureSliderDiv.style.height = fixedSubplotHeight + "px";

        // Create the range slider
        const label = document.createElement("label");
        label.textContent = feature;

        const valueDisplay = document.createElement("input");
        valueDisplay.className = "text-input";
        valueDisplay.type = "text";
        valueDisplay.value = initialValue;

        if (colorScaleDefault[feature]) {
            color = colorScaleDefault[feature];
        }
        else {
            color = colorScale(index);
        }

        const slider = document.createElement("input");
        slider.className = "slider-input";
        slider.type = "range";
        slider.min = 0;
        slider.max = 1;
        slider.step = 0.01;
        slider.value = valueDisplay.value;
        slider.style.accentColor = color;
        slider.style.setProperty("--track-color", "green");

        // Append the slider to the feature-slider div
        featureSliderDiv.appendChild(label);
        featureSliderDiv.appendChild(slider);
        featureSliderDiv.appendChild(valueDisplay);

        // Append the feature-slider div to the sliders-container
        slidersContainer.appendChild(featureSliderDiv);

        // Add an event listener to handle slider changes
        slider.addEventListener("input", function () {
            const sliderValue = parseFloat(this.value);
            const peaksSlider = document.getElementById("peaks-distance-slider");
            const peaksDistance = peaksSlider.value;
            valueDisplay.value = sliderValue.toFixed(2);
            scaleData(feature, sliderValue);
            updateSinglePlot(feature, index);
            findPeaks(distance = peaksDistance);
        });

        valueDisplay.addEventListener("change", function () {
            const textValue = parseFloat(this.value);
            const peaksSlider = document.getElementById("peaks-distance-slider");
            const peaksDistance = peaksSlider.value;
            slider.value = textValue.toFixed(2);
            scaleData(feature, textValue);
            updateSinglePlot(feature, index);
            findPeaks(distance = peaksDistance);
        });
    };

    function scaleData(feature, weight) {
        scaledData[feature] = data[feature].map(value => value * weight);

        // Update "KDE's sum"
        const sumFeatures = Object.keys(scaledData).filter(key =>
            !features_to_exclude_list.includes(key)
        );
        scaledData["KDE's sum"] = sumFeatures.reduce((acc, curr) =>
            acc.map((value, i) => value + scaledData[curr][i]), new Array(scaledData[feature].length).fill(0)
        );

        // Update "KDE's top"
        const topFeatures = Object.keys(scaledData).filter(key =>
            !features_to_exclude_list.includes(key)
        );
        scaledData["KDE's top"] = topFeatures.reduce((acc, curr) =>
            acc.map((value, i) => Math.max(value, scaledData[curr][i])), new Array(scaledData[feature].length).fill(-Infinity)
        );

        sessionStorage.setItem("scaledData", JSON.stringify(scaledData));
    };

    function updateSinglePlot(feature, index) {
        const configData = JSON.parse(sessionStorage.getItem('configData'));
        if (configData) {
            defaultWeights = configData['weights'];
            colorScaleDefault = configData['hex_color'];
        }
        const featuresToUpdate = [feature, "KDE's sum", "KDE's top"];
        featuresToUpdate.forEach((featureToUpdate) => {
            if (featureToUpdate === "KDE's sum") {
                index = features.length - 2;
            } else if (featureToUpdate === "KDE's top") {
                index = features.length - 1;
            }
            const scaledYValues = scaledData[featureToUpdate];

            // REDEFINING NEEDED VARIABLES
            const subplot = subplotRefs[featureToUpdate];
            const yScale = subplot.yScale;

            const scaledLine = d3.line()
                .x((d, i) => xScale(xValues[i]))
                .y(d => yScale(d));

            // Select and remove only the lines with the class "line"
            subplot.element.select(".line").remove();

            // Plot data from scaledData with a different alpha value
            if (colorScaleDefault[featureToUpdate]) {
                color = colorScaleDefault[featureToUpdate];
            }
            else {
                color = colorScale(index);
            }
            subplot.element.append("path")
                .attr("class", "line")
                .attr("d", scaledLine(scaledYValues))
                .style("stroke", color)
                .style("fill", color);
        });
    };

    function findPeaks(distance = 0) {
        const scaledData = JSON.parse(sessionStorage.getItem("scaledData"));
        const selectedData = JSON.parse(sessionStorage.getItem("selectedData"));
        const x_values = selectedData['x_values'];
        const range = x_values.length;
        let calculatedDistance = 0;

        if (distance !== 0) {
            calculatedDistance = (range * (distance / 100)) / 2;
            if (calculatedDistance < 1) {
                calculatedDistance = 1;
            }
        }

        const requestData = {
            data: scaledData,
            distance: calculatedDistance
        };
        return fetch('https://flask-api-efnqmcjjla-ew.a.run.app/findPeaks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        })
            .then(response => response.json())
            .then(result => {
                peaksData = result.peaks_data;
                sessionStorage.setItem("peaksData", JSON.stringify(peaksData));
                plotPeaks();
            })
            .catch(error => {
                console.error('Error scaling data:', error);
            });
    };

    function plotPeaks() {
        const featuresToUpdate = ["KDE's sum", "KDE's top"];
        featuresToUpdate.forEach((featureToUpdate) => {
            if (featureToUpdate === "KDE's sum") {
                plotIndex = features.length - 2;
            } else if (featureToUpdate === "KDE's top") {
                plotIndex = features.length - 1;
            }

            const subplot = subplotRefs[featureToUpdate];
            const indexes = peaksData[featureToUpdate];
            const yValues = scaledData[featureToUpdate];
            const barWidth = 10;

            const yScale = subplot.yScale

            const xScale = d3.scaleLinear()
                .domain([0, d3.max(xValues)])
                .range([margin.left, parentWidth - margin.right]);

            subplot.element.selectAll(".bars").remove();

            indexes.forEach((index) => {
                const xValue = xValues[index];
                const barHeight = yScale(yValues[index]);

                subplot.element.append("rect")
                    .attr("class", "bars")
                    .attr("x", xScale(xValue) - barWidth / 2)
                    .attr("y", barHeight)
                    .attr("width", barWidth)
                    .attr("height", fixedSubplotHeight - margin.top - margin.bottom - barHeight)
                    .style("fill", "lightgray")
                    .style("fill-opacity", 0.85);
            });
        });
    };

});
