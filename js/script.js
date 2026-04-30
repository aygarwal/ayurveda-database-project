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

function createNodeLookupFromPlantJSON (data, nodeLookup) {
    if (data.nodes) {
        data.nodes.forEach(node => {
            let displayName = "";

            // Safely grab labels (handles missing data or missing Label key)
            const label = String(node.data?.label || node.label || "").toLowerCase();

            // Check type
            if (label === "Plant")
                displayName = node.data.plant_name || "Unknown Plant";
            if (label === "phytochemical")
                displayName = node.data?.compound_name || "Unknown Phytochemical";
            else if (label === "disease")
                displayName = node.data.name_display || "Unknown Disease"; 
            else if (label === "formulation") {
                displayName = node.data.formulation_name || "Unknown Formulation";
            }

            // Fallback: if displayName is still empty, use the ID
            nodeLookup[node.data?.id] = displayName || node.data?.id || "Unknown ID";
        });
    }

    return nodeLookup;
}

function populateLists (data, nodeLookup, phytochemicals, diseases, formulations) {
    if (data.edges) {
        data.edges.forEach(edge => {
            const label = edge.data.label;
            const sourceName = nodeLookup[edge.data.source];
            const targetName = nodeLookup[edge.data.target];

            if (label === "FOUND_IN") {
                // [Phytochemical] FOUND_IN [Plant]
                if (sourceName) phytochemicals.push(edge.data.source);
            } 
            else if (label === "ASSOCIATED_WITH_DISEASE") {
                // [Plant] ASSOCIATED_WITH_DISEASE [Disease]
                if (targetName) diseases.push(edge.data.target);
            } 
            else if (label === "IS_INGREDIENT_IN") {
                // [Plant] IS_INGREDIENT_IN [Formulation]
                if (targetName) formulations.push(edge.data.target);
            }
        });
    }
}

function cleanLists (phytochemicals, diseases, formulations) {
    // Remove duplicates and filter out "Unknown" or the plant name itself
    const clean = (list) => [...new Set(list)]
                .filter(n => n && n !== "Unknown")
                .sort();
    

    const pList = clean(phytochemicals);
    const dList = clean(diseases);
    const fList = clean(formulations);

    return [pList, dList, fList];
}

async function getDiseaseList(pList) {
    cids = [];
    for (i = 0; i<pList.length; i++) {
        cids[i] = pList[i].cid;
    }

    // Create an array of promises (the calls start immediately)
    const promises = cids.map(async (item) => {
        const response = await fetch(`https://api.example.com/data/${item}`);
        return response.json();
    });

    // Wait for all of them to settle
    const results = await Promise.all(promises);
    
    console.log("All results received:", results);
}

function renderTable(data, searchedTerm) {
    tableBody.innerHTML = ""; 

    // Create a Lookup Map for Node Names
    // id -> displayName
    let nodeLookup = {};
    nodeLookup = createNodeLookupFromPlantJSON(data, nodeLookup);

    // Create and populate lists of phytochemicals, diseases and formulations using edges
    let phytochemicals = [];
    let diseases = [];
    let formulations = [];
    populateLists(data, nodeLookup, phytochemicals, diseases, formulations)

    // Clean the lists
    let listOfLists = cleanLists(phytochemicals, diseases, formulations);
    pList = listOfLists[0];
    dList = listOfLists[1];
    fList = listOfLists[2];

    const numRows = pList.length;

    // If pList is empty, there is an error. Handle it
    if (numRows === 0) {
        tableBody.innerHTML = "<tr><td colspan='3' style='text-align:center;'>No specific data found for this entry.</td></tr>";
        return;
    }

    // Look up phytochemical graph and get data from _that_ json
    // Disease
    getDiseaseList(pList);
    // Formulation

    // Actually build table rows
    for (let i = 0; i < numRows; i++) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${nodeLookup[pList[i]] || ""}</td>
            
        `;
        tableBody.appendChild(row);
    }
}