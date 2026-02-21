// === CSV TRANSACTION CHECKER SCRIPT ===
// This script processes one or more CSV-like files, analyzes transactions,
// detects missing TRANSACTION_NO values, and allows downloading data as a CSV.

// ---------------------
// DOWNLOAD CHECKER FILE
// ---------------------
document.getElementById('downloadBtn').addEventListener('click', function () {
    const link = document.createElement('a');
    link.href = 'assets/file/Checker.xlsx'; // Updated to be relative to HTML file location
    link.download = `Checker.xlsx`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// ---------------------
// CLEAR OUTPUT FUNCTION
// ---------------------
document.getElementById('clear').addEventListener('click', function () {
    document.getElementById('output').innerHTML = '';           // Clear displayed data
    document.getElementById('fileInput').value = '';            // Reset file input
    document.getElementById('fileCount').innerText = '';        // Clear file count label
});

// ---------------------
// DISPLAY FILE COUNT ON SELECTION
// ---------------------
document.getElementById('fileInput').addEventListener('change', function () {
    const count = this.files.length;
    const label = count === 1 ? '1 file selected' : `${count} files selected`;
    document.getElementById('fileCount').innerText = label;
});

// ---------------------
// PROCESS UPLOADED FILES
// ---------------------
document.getElementById('processButton').addEventListener('click', function () {
    const fileInput = document.getElementById('fileInput');
    const files = fileInput.files;
    if (files.length === 0) {
        alert("Please upload at least one valid file.");
        return;
    }

    document.getElementById('output').innerHTML = ''; // Clear output area
    const allTransactions = [];                      // Array to store all transaction objects
    const allFields = {};                            // Map to store field-wise arrays
    const specialFields = {                          // Special fields with custom row logic
        CCCODE: [],
        MERCHANT_NAME: [],
        TRN_DATE: [],
        NO_TRN: []
    };

    let transactionId = 1;

    const readFiles = Array.from(files).map(file => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = function (event) {
                const fileContent = event.target.result;
                const lines = fileContent.split("\n").map(line => line.trim());

                let currentTransaction = {};
                let trxNo = 0;
                let groupValues = {};

                // Pre-process group metadata (NO_TRN, CCCODE, etc.)
                for (const line of lines) {
                    if (line) {
                        const parts = line.split(",", 2);
                        if (parts.length === 2) {
                            const key = parts[0].trim();
                            const value = parts[1].trim();
                            if (key === "NO_TRN") {
                                trxNo = parseInt(value, 10);
                                groupValues["NO_TRN"] = value;
                                break;
                            }
                            if (["CCCODE", "MERCHANT_NAME", "TRN_DATE"].includes(key)) {
                                groupValues[key] = value;
                            }
                        }
                    }
                }

                // Main line processing
                for (const line of lines) {
                    if (line) {
                        const parts = line.split(",", 2);
                        if (parts.length === 2) {
                            const key = parts[0].trim();
                            let value = parts[1].trim();

                            if (key === "Transaction") continue; // Skip footer line if present

                            // Insert special fields only once per group
                            if (["CCCODE", "MERCHANT_NAME", "TRN_DATE", "NO_TRN"].includes(key)) {
                                if (groupValues[key]) {
                                    let repeat = parseInt(groupValues["NO_TRN"] || "1", 10);
                                    specialFields[key].push(groupValues[key]);
                                    for (let i = 1; i < repeat; i++) specialFields[key].push("");
                                    groupValues[key] = undefined;
                                }
                                continue;
                            }

                            // Start new transaction block on CDATE
                            if (key === "CDATE" && Object.keys(currentTransaction).length > 0) {
                                allTransactions.push(currentTransaction);
                                currentTransaction = { "Transaction": "Transaction " + transactionId };
                                transactionId++;
                            }

                            currentTransaction[key] = value;
                        }
                    }
                }

                // Push the last transaction
                if (Object.keys(currentTransaction).length > 0) {
                    allTransactions.push(currentTransaction);
                }

                resolve(); // File processing done
            };

            reader.onerror = reject;
            reader.readAsText(file); // Read file as plain text
        });
    });

    // Process all files
    Promise.all(readFiles).then(() => {
        // Sort transactions by TRANSACTION_NO
        allTransactions.sort((a, b) => {
            const valA = parseInt(a["TRANSACTION_NO"] || "0", 10);
            const valB = parseInt(b["TRANSACTION_NO"] || "0", 10);
            return valA - valB;
        });

        // Detect missing TRANSACTION_NO values
        const transactionNumbers = allTransactions
            .map(trx => parseInt(trx["TRANSACTION_NO"] || "0", 10))
            .filter(num => !isNaN(num));
        const missingNumbers = [];
        if (transactionNumbers.length > 0) {
            const min = Math.min(...transactionNumbers);
            const max = Math.max(...transactionNumbers);
            for (let i = min; i <= max; i++) {
                if (!transactionNumbers.includes(i)) {
                    missingNumbers.push(i);
                }
            }
        }

        // Build the allFields map
        for (const key in allFields) allFields[key] = [];
        allTransactions.forEach(transaction => {
            for (const key in transaction) {
                if (!allFields[key]) {
                    allFields[key] = [];
                }
                allFields[key].push(transaction[key]);
            }
        });

        // Add special fields
        for (const key in specialFields) {
            allFields[key] = specialFields[key];
        }

        delete allFields["Transaction"]; // Remove unnecessary Transaction label
        displayData(allFields, missingNumbers);
    }).catch(error => {
        console.error("Error reading files:", error);
    });
});

// ---------------------
// DISPLAY TRANSACTION DATA IN TABLE
// ---------------------
function displayData(allFields, missingNumbers) {
    const outputDiv = document.getElementById('output');
    outputDiv.innerHTML = '';

    // ---- Display missing TRANSACTION_NO if any ----
    if (missingNumbers && missingNumbers.length > 0) {
        const missingBox = document.createElement('div');
        Object.assign(missingBox.style, {
            position: 'absolute',
            top: '30px',
            right: '30px',
            background: 'white',
            border: '2px solid #dc3545',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(220,53,69,0.15)',
            padding: '16px',
            zIndex: '10',
            minWidth: '220px',
            maxHeight: '300px',
            overflowY: 'auto'
        });

        const missingMsg = document.createElement('div');
        missingMsg.style.color = '#dc3545';
        missingMsg.style.marginBottom = '10px';
        missingMsg.style.fontWeight = 'bold';
        missingMsg.innerHTML = `Missing TRANSACTION_NO count: ${missingNumbers.length}`;
        missingBox.appendChild(missingMsg);

        const missingTable = document.createElement('table');
        missingTable.style.width = '100%';
        const headerRow = document.createElement('tr');
        ['#', 'Missing TRANSACTION_NO'].forEach(title => {
            const th = document.createElement('th');
            th.innerText = title;
            th.style.background = '#dc3545';
            th.style.color = 'white';
            headerRow.appendChild(th);
        });
        missingTable.appendChild(headerRow);

        missingNumbers.forEach((num, idx) => {
            const row = document.createElement('tr');
            [idx + 1, num].forEach(val => {
                const td = document.createElement('td');
                td.innerText = val;
                td.style.textAlign = 'center';
                row.appendChild(td);
            });
            missingTable.appendChild(row);
        });

        missingBox.appendChild(missingTable);
        outputDiv.appendChild(missingBox);
    } else if (missingNumbers) {
        const missingMsg = document.createElement('div');
        missingMsg.style.color = 'green';
        missingMsg.style.marginBottom = '10px';
        missingMsg.innerHTML = `<b>No missing TRANSACTION_NO found.</b>`;
        outputDiv.appendChild(missingMsg);
    }

    // ---- CSV DOWNLOAD LINK ----
    const downloadLink = document.createElement('a');
    downloadLink.href = '#';
    downloadLink.classList.add("download-csv");
    downloadLink.innerText = 'Download CSV';
    downloadLink.addEventListener('click', function () {
        downloadCSV(allFields);
    });
    outputDiv.appendChild(downloadLink);
    outputDiv.appendChild(document.createElement('br'));

    // ---- Table Generation ----
    const table = document.createElement('table');
    const headerRow = document.createElement('tr');
    headerRow.appendChild(document.createElement('th')).innerText = 'FIELD';

    const actualTransactionCount = Math.max(...Object.values(allFields).map(values => values.length));
    for (let i = 1; i <= actualTransactionCount; i++) {
        const cell = document.createElement('th');
        cell.innerText = 'Transaction ' + i;
        headerRow.appendChild(cell);
    }
    table.appendChild(headerRow);

    // Preferred order for top fields
    const specialOrder = ["CCCODE", "MERCHANT_NAME", "TRN_DATE", "NO_TRN"];

    // Add special fields first
    specialOrder.forEach(key => {
        if (allFields[key]) {
            const row = document.createElement('tr');
            const fieldCell = document.createElement('td');
            fieldCell.innerText = key;
            row.appendChild(fieldCell);
            for (let i = 0; i < actualTransactionCount; i++) {
                const cell = document.createElement('td');
                cell.innerText = (allFields[key][i] || '').replace(/,/g, '');
                row.appendChild(cell);
            }
            table.appendChild(row);
        }
    });

    // Add other fields
    for (const key in allFields) {
        if (!specialOrder.includes(key)) {
            const row = document.createElement('tr');
            const fieldCell = document.createElement('td');
            fieldCell.innerText = key;
            row.appendChild(fieldCell);
            for (let i = 0; i < actualTransactionCount; i++) {
                const cell = document.createElement('td');
                cell.innerText = (allFields[key][i] || '').replace(/,/g, '');
                row.appendChild(cell);
            }
            table.appendChild(row);
        }
    }

    outputDiv.appendChild(table);
}

// ---------------------
// CSV DOWNLOAD FUNCTION
// ---------------------
function downloadCSV(allFields) {
    let csvContent = "";
    const specialOrder = ["CCCODE", "MERCHANT_NAME", "TRN_DATE", "NO_TRN"];

    // Add special fields
    specialOrder.forEach(key => {
        if (allFields[key]) {
            csvContent += key + "," + allFields[key].join(",") + "\n";
        }
    });

    // Add rest of the fields
    for (const key in allFields) {
        if (!specialOrder.includes(key)) {
            csvContent += key + "," + allFields[key].join(",") + "\n";
        }
    }

    const blob = new Blob([csvContent], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "downloadedcsv.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
