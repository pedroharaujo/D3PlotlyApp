document.addEventListener("DOMContentLoaded", function () {
    const processButton = document.getElementById("process-button");
    processButton.addEventListener("click", processData);

    const storedDataSets = JSON.parse(localStorage.getItem("dataSets")) || {};
    populateDropdown(storedDataSets);
    updateDataLoggingDiv();

    function processData() {
        const fileInput = document.getElementById("file-input");
        const file = fileInput.files[0];

        if (!file) {
            alert("Please select a file.");
            return;
        }

        // Show the loader when processing starts
        const loader = document.getElementById("loader");
        loader.style.display = "inline";

        const formData = new FormData();
        formData.append("file", file);

        fetch("http://127.0.0.1:5000/process", {
            method: "POST",
            body: formData,
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }
                return response.json();
            })
            .then((data) => {
                // Store the processed data in dataSets with the associated file name
                const fileName = file.name;
                storedDataSets[fileName] = data['data'];

                // Save dataSets in localStorage
                localStorage.setItem("dataSets", JSON.stringify(storedDataSets));

                // Handle the response data here
                alert("Received data from the server: " + JSON.stringify(data['message']));

                updateDataLoggingDiv();

                populateDropdown(storedDataSets);

                loader.style.display = "none";
            })
            .catch((error) => {
                console.error("Error:", error);
                alert("An error occurred while processing the file.");

                // Hide the loader in case of an error
                loader.style.display = "none";
            });
    }

    function updateDataLoggingDiv() {
        const dataLoggingContainer = document.querySelector(".logging-data-container");

        // Clear existing content
        dataLoggingContainer.innerHTML = "";

        // Create and append a list to display the datasets names
        const list = document.createElement("ul");

        for (const dataset in storedDataSets) {
            const listItem = document.createElement("li");

            // Create a span for the dataset name
            const datasetNameSpan = document.createElement("span");
            datasetNameSpan.textContent = dataset;
            listItem.appendChild(datasetNameSpan);

            // Create a button to remove the entry with a class
            const removeButton = document.createElement("button");
            removeButton.textContent = "Remove";
            removeButton.classList.add("remove-button"); // Add the class here

            removeButton.addEventListener("click", () => {
                // Identify the dataset associated with the button
                const datasetName = datasetNameSpan.textContent;

                // Remove the dataset from the storedDataSets object
                delete storedDataSets[datasetName];

                localStorage.setItem("dataSets", JSON.stringify(storedDataSets));

                // Update the data logging div after removal
                updateDataLoggingDiv();
                populateDropdown(storedDataSets);

            });

            listItem.appendChild(removeButton);
            list.appendChild(listItem);
        }

        dataLoggingContainer.appendChild(list);
    }

    function populateDropdown(dataSets) {
        const dataDropdown = document.getElementById("data-dropdown");

        // Clear existing options
        dataDropdown.innerHTML = "";
        option = document.createElement("option");
        option.value = null;
        option.textContent = 'Please select a dataset';
        dataDropdown.appendChild(option);

        // Add options based on available datasets
        for (const fileName in dataSets) {
            if (dataSets.hasOwnProperty(fileName)) {
                const option = document.createElement("option");
                option.value = fileName;
                option.textContent = fileName;
                dataDropdown.appendChild(option);
            }
        }
    }
});
