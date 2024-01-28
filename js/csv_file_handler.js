document.addEventListener("DOMContentLoaded", function () {
    const weightsButton = document.getElementById("add-weights-button");
    weightsButton.addEventListener("click", addWeights);

    function addWeights() {
        const fileInput = document.getElementById('weights-file-input');
        const file = fileInput.files[0];

        if (!file) {
            alert("Please select a file.");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        fetch('https://pedroaraujo94.pythonanywhere.com/CSVtoJson', {
            method: 'POST',
            body: formData
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }
                return response.json();
            })
            .then((data) => {
                sessionStorage.setItem("configData", JSON.stringify(data));
            })
            .catch((error) => {
                console.error("Error:", error);
                alert("An error occurred while processing the file.");
            });
    };

});