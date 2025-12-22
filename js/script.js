const API_BASE = "https://caps.ncbs.res.in/GRAYU";
const searchBtn = document.getElementById('searchBtn');
const tableBody = document.getElementById('tableBody');

searchBtn.addEventListener('click', async () => {
    const plantInput = document.getElementById('plantInput').value.trim();
    if (!plantInput) return;

    // Construct the endpoint
    const apiEndpoint = `${API_BASE}/api/plant-graph/${encodeURIComponent(plantInput)}`;
    
    try {
        const response = await fetch(apiEndpoint);
        if (!response.ok) throw new Error("Network response was not ok");
        const data = await response.json();
        renderTable(data, plantInput);
    } catch (error) {
        console.error("Fetch Error:", error);
        alert("Could not fetch data. Ensure you have a CORS extension enabled.");
    }
});

function renderTable(data, searchedTerm) {
    tableBody.innerHTML = ""; 

    // 1. Create a Lookup Map for Node Names
    const nodeLookup = {};
    if (data.nodes) {
        data.nodes.forEach(node => {
            // 1. Use 'let' instead of 'const' so we can update the value
            let displayName = "";

            // 2. Safely grab labels (handles missing data or missing Label key)
            // We force it to a string ("") so .toLowerCase() never fails
            const label = String(node.data?.label || node.label || "").toLowerCase();

            // 3. Perform the checks
            if (label === "Plant")
                displayName = node.data.plant_name || "Unknown Plant";
            if (label === "phytochemical")
                displayName = node.data?.compound_name || "Unknown Phytochemical";
            else if (label === "disease")
                displayName = node.data.name_display || "Unknown Disease"; 
            else if (label === "formulation") {
                displayName = node.data.formulation_name || "Unknown Formulation";
            }

            // 4. Fallback: if displayName is still empty, use the ID
            nodeLookup[node.data?.id] = displayName || node.data?.id || "Unknown ID";
        });
    }


    let phytochemicals = [];
    let diseases = [];
    let formulations = [];

    // 2. Map Edges to Names based on your confirmed Labels
    if (data.edges) {
        data.edges.forEach(edge => {
            const label = edge.data.label;
            const sourceName = nodeLookup[edge.data.source];
            const targetName = nodeLookup[edge.data.target];

            if (label === "FOUND_IN") {
                // Usually: [Phytochemical] FOUND_IN [Plant]
                if (sourceName) phytochemicals.push(sourceName);
            } 
            else if (label === "ASSOCIATED_WITH_DISEASE") {
                // Usually: [Plant] ASSOCIATED_WITH_DISEASE [Disease]
                if (targetName) diseases.push(targetName);
            } 
            else if (label === "IS_INGREDIENT_IN") {
                // Usually: [Plant] IS_INGREDIENT_IN [Formulation]
                if (targetName) formulations.push(targetName);
            }
        });
    }

    // 3. Remove duplicates and filter out "Unknown" or the plant name itself
    const clean = (list) => [...new Set(list)]
        .filter(n => n && n !== "Unknown")// && !n.toLowerCase().includes(searchedTerm.toLowerCase()))
        .sort();
    
    const pList = clean(phytochemicals);
    const dList = clean(diseases);
    const fList = clean(formulations);

    const maxRows = Math.max(pList.length, dList.length, fList.length);

    if (maxRows === 0) {
        tableBody.innerHTML = "<tr><td colspan='3' style='text-align:center;'>No specific data found for this entry.</td></tr>";
        return;
    }

    // 4. Build Table Rows
    for (let i = 0; i < maxRows; i++) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${pList[i] || ""}</td>
            <td>${fList[i] || ""}</td>
            <td>${dList[i] || ""}</td>
        `;
        tableBody.appendChild(row);
    }
}