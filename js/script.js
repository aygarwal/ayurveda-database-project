const API_BASE = "https://caps.ncbs.res.in/GRAYU";
const searchBtn = document.getElementById('searchBtn');
const tableBody = document.getElementById('tableBody');

searchBtn.addEventListener('click', async () => {
    const plantInput = document.getElementById('plantInput').value.trim();
    if (!plantInput) return;

    // UNCOMMENT THIS BLOCK TO USE GRAYU API ENDPOINT
    /* 
    // -------------------------------------------------

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

    // -------------------------------------------------
    */


    // UNCOMMENT THIS BLOCK TO USE LOCAL JSON FILE
    // -------------------------------------------------

    // Moringa oleifera
    try {
        const response = await fetch('../example_json_files/plant_example.json');
        
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        const data = await response.json();

        // Now 'data' is accessible here
        console.log(data);
        renderTable(data, plantInput);

    } catch (error) {
        // Standard alert or console.error
        console.error('Error:', error);
        alert("Data fetch error: " + error.message);
    }

    // -------------------------------------------------

});

/**
 * This function populates the map nodeLookup using the data in the json file `data`
 * nodeLookup maps a node's hash ID to the displayName of that node
 * @param {json} data 
 * @param {map} nodeLookup 
 * @returns {map} nodeLookup
 */
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

/**
 * 
 * @param {json} data 
 * @param {map} nodeLookup 
 * @param {list} phytochemicals 
 * @param {list} diseases 
 * @param {list} formulations 
 */
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

/**
 * Remove duplicates and filters out "Unknown" or the name itself
 * @param {list} phytochemicals 
 * @param {list} diseases 
 * @param {list} formulations 
 * @returns {list}
 */
function cleanLists (phytochemicals, diseases, formulations) {
    const clean = (list) => [...new Set(list)]
                .filter(n => n && n !== "Unknown")
                .sort();
    
    const pList = clean(phytochemicals);
    const dList = clean(diseases);
    const fList = clean(formulations);

    return [pList, dList, fList];
}

/**
 * This function gets the json files for all the
 * diseases associated with each plant in a pList
 * @param {list} pList 
 */
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

/**
 * This function rendes the table to the screen
 * @param {json} data 
 * @param {string} searchedTerm 
 * @returns 
 */
function renderTable(data, searchedTerm) {
    tableBody.innerHTML = ""; 

    // Create a Lookup Map for Node Names: id -> displayName
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