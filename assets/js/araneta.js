document.addEventListener("DOMContentLoaded", function () {
  const fileInput = document.getElementById("fileInput");
  const uploadBtn = document.getElementById("uploadBtn");
  const headerRow = document.getElementById("headerRow");
  const tableBody = document.getElementById("tableBody");
  const downloadBtn = document.getElementById("downloadBtn");
  const clearBtn = document.getElementById("clear");

  let selectedFiles = [];

  fileInput.addEventListener("change", function (event) {
    selectedFiles = Array.from(event.target.files);
    document.getElementById("fileCount").innerText =
      selectedFiles.length + " file(s) selected";
  });

  uploadBtn.addEventListener("click", function () {
    if (selectedFiles.length === 0) {
      alert("Please select file(s) first.");
      return;
    }

    // Clear old headers except the first one
    while (headerRow.children.length > 1) {
      headerRow.removeChild(headerRow.lastChild);
    }

    // Clear existing data cells
    const rows = tableBody.querySelectorAll("tr");
    rows.forEach(row => {
      while (row.children.length > 1) {
        row.removeChild(row.lastChild);
      }
    });

    let filesRead = 0;

    selectedFiles.forEach((file, fileIndex) => {
      const reader = new FileReader();

      reader.onload = function (e) {
        const lines = e.target.result.trim().split("\n");

        lines.forEach((line, lineIndex) => {
          const values = line.split(",");

          // Add header column: filename - line #
          const th = document.createElement("th");
          th.textContent = `${file.name} - Line ${lineIndex + 1}`;
          headerRow.appendChild(th);

          const rows = tableBody.querySelectorAll("tr");
          for (let i = 0; i < rows.length; i++) {
            const cell = document.createElement("td");
            cell.textContent = values[i] || "";
            rows[i].appendChild(cell);
          }
        });

        filesRead++;
      };

      reader.readAsText(file);
    });
  });

  downloadBtn.addEventListener("click", function () {
    const rows = document.querySelectorAll("table tr");
    let csvContent = "";

    rows.forEach(row => {
      const cells = row.querySelectorAll("th, td");
      const rowData = Array.from(cells).map(cell =>
        `"${cell.textContent.replace(/"/g, '""')}"`
      );
      csvContent += rowData.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "table_export.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  clearBtn.addEventListener("click", function () {
    fileInput.value = "";
    selectedFiles = [];
    document.getElementById("fileCount").innerText = "";

    while (headerRow.children.length > 1) {
      headerRow.removeChild(headerRow.lastChild);
    }

    const rows = tableBody.querySelectorAll("tr");
    rows.forEach(row => {
      while (row.children.length > 1) {
        row.removeChild(row.lastChild);
      }
    });
  });
});
