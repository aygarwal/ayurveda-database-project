const API_BASE = "https://caps.ncbs.res.in/GRAYU";
const searchBtn = document.getElementById('searchBtn');
const searchCategory = document.getElementById('searchCategory');
const tabHeader = document.getElementById('tabHeader');
const tabContentContainer = document.getElementById('tabContentContainer');

const ALL_CATEGORIES = {
    plant: "Plants",
    disease: "Diseases",
    formulation: "Formulations",
    phytochemical: "Phytochemicals"
};

searchBtn.addEventListener('click', async () => {
    const userInput = document.getElementById('plantInput').value.trim();
    const category = searchCategory.value; // 'plant', 'disease', etc.
    if (!userInput) return;

    let response; // Declare variable here so it's accessible throughout the function

    try {

        // UNCOMMENT THIS BLOCK TO USE GRAYU API ENDPOINT
        /* 
        // -------------------------------------------------
        // Construct the endpoint
        const apiEndpoint = `${API_BASE}/api/plant-graph/${encodeURIComponent(plantInput)}`;
        const response = await fetch(apiEndpoint);
        // -------------------------------------------------
        */


        // UNCOMMENT THIS BLOCK TO USE LOCAL JSON FILE
        // -------------------------------------------------
        const fileMap = {
            'plant': '../example_json_files/plant_example.json',
            'disease': '../example_json_files/disease_example.json',
            'formulation': '../example_json_files/formulation_example.json',
            'phytochemical': '../example_json_files/phytochemical_example.json'
        };
        const filePath = fileMap[category];
        response = await fetch(filePath);
        // -------------------------------------------------

        if (!response.ok) throw new Error(`File not found: ${filePath}`);

        const data = await response.json();
        renderDynamicTabs(data, category);

    } catch (error) {
        console.error('Error:', error);
        alert("Search 1error: " + error.message);
    }
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

            if (label === "plant")
                displayName = node.data?.plant_name || "Unknown Plant";
            else if (label === "phytochemical")
                displayName = node.data?.compound_name || "Unknown Phytochemical";
            else if (label === "disease")
                displayName = node.data?.name_display || "Unknown Disease";
            else if (label === "formulation")
                displayName = node.data?.formulation_name || "Unknown Formulation";

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
function populateLists(data, nodeLookup, phytochemicals, diseases, formulations, plants) {
    if (data.edges) {
        data.edges.forEach(edge => {
            const label = edge.data.label;
            const sourceId = edge.data.source;
            const targetId = edge.data.target;

            if (label === "FOUND_IN") {
                // [Phytochemical] FOUND_IN [Plant]
                phytochemicals.push(sourceId);
                plants.push(targetId); 
            } 
            else if (label === "ASSOCIATED_WITH_DISEASE") {
                // [Plant] ASSOCIATED_WITH_DISEASE [Disease]
                plants.push(sourceId);
                diseases.push(targetId);
            } 
            else if (label === "IS_INGREDIENT_IN") {
                // [Plant] IS_INGREDIENT_IN [Formulation]
                plants.push(sourceId);
                formulations.push(targetId);
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
    let cids = [];
    for (let i = 0; i<pList.length; i++) {
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
function renderDynamicTabs(data, selectedCategory) {
    // which 3 categories to show
    const otherCategories = Object.keys(ALL_CATEGORIES).filter(cat => cat !== selectedCategory);

    // Clear existing tabs
    tabHeader.innerHTML = "";
    tabContentContainer.innerHTML = "";

    // Setup data structures
    let nodeLookup = {};
    nodeLookup = createNodeLookupFromPlantJSON(data, nodeLookup);
    
    let results = {
        plant: [],
        phytochemical: [],
        disease: [],
        formulation: []
    };
    
    populateLists(
        data, 
        nodeLookup, 
        results.phytochemical, 
        results.disease, 
        results.formulation, 
        results.plant
    );
    // Create the Tabs and Tables
    otherCategories.forEach((cat, index) => {
        // Create Button
        const btn = document.createElement('button');
        btn.className = `tab-btn ${index === 0 ? 'active' : ''}`;
        btn.textContent = ALL_CATEGORIES[cat];
        btn.onclick = () => switchTab(cat);
        tabHeader.appendChild(btn);

        // Create Table Content Div
        const contentDiv = document.createElement('div');
        contentDiv.id = `tab-${cat}`;
        contentDiv.className = `tab-content ${index === 0 ? 'active' : ''}`;
        
        // Clean and Unique list
        const displayList = [...new Set(results[cat])].filter(n => n && n !== "Unknown").sort();

        // Build Table HTML
        let tableHTML = `<table><thead><tr><th>${ALL_CATEGORIES[cat]} Name</th></tr></thead><tbody>`;
        if (displayList.length === 0) {
            tableHTML += `<tr><td>No related data found.</td></tr>`;
        } else {
            displayList.forEach(id => {
                tableHTML += `<tr><td>${nodeLookup[id] || id}</td></tr>`;
            });
        }
        tableHTML += `</tbody></table>`;
        
        contentDiv.innerHTML = tableHTML;
        tabContentContainer.appendChild(contentDiv);
    });
}

function switchTab(category) {
    // UI logic to toggle classes
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent === ALL_CATEGORIES[category]);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${category}`);
    });
}