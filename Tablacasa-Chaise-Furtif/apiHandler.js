(function () {
    // === MAPPINGS ===
    // Mapping pour le produit principal (chaise)
    const chairProductMap = {
        "FUR-VR": 805,
        "FUR-RO": 804,
        "FUR-NR": 803,
        "FUR-JN": 802,
        "FUR-GR": 801,
        "FUR-MR": 800,
        "FUR-BL": 799,
    };

    // Mapping pour les pieds (article_component)
    // La clé ici est celle qu'on souhaite obtenir en fonction du type de pied.
    const chairComponentMap = {
        "PNP": "PIEDS NOIR PIVOTANT", // prix de base = 40,00 €
        "PBP": "PIEDS BOIS PIVOTANT",   // prix 45,00 € → +5 €
        "PNF": "PIEDS NOIR FIXE",       // prix 35,00 € → -5 €
        "PBF": "PIEDS BOIS FIXE",       // prix 40,00 € → équivalent à PNP
        // Ajoutez d'autres mappings si nécessaire
    };

    // Mapping pour les couleurs afin de mettre à jour la référence (span "ref C")
    const colorRefMap = {
        "Marron": "MR",
        "Jaune": "JN",
        "Gris": "GR",
        "Noir": "NR",
        "Rouge": "RO",
        "Bleu": "BL",
        "Vert": "VR",

    };

    // === Fonctions d'authentification et utilitaires ===
    async function fetchAuthToken() {
        const LOGIN_URL = "https://tablacasa.com/auth/api/v1/login/";
        const EMAIL = "client1@tablacasa.com";
        const PASSWORD = "k4o6o3p4";
        const formData = new FormData();
        formData.append("email", EMAIL);
        formData.append("password", PASSWORD);
        try {
            const response = await fetch(LOGIN_URL, { method: "POST", body: formData });
            if (!response.ok) throw new Error("Échec de l'authentification");
            const data = await response.json();
            console.log("Token reçu:", data.token);
            return data.token;
        } catch (error) {
            console.error("Erreur d'authentification:", error);
            return null;
        }
    }

    function getCoefFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        let coef = parseFloat(urlParams.get("coef"));
        return isNaN(coef) ? 1 : coef;
    }

    // === Fonctions pour récupérer les données de l'API ===
    async function fetchProductData(productId, token) {
        const PRODUCT_URL = `https://tablacasa.com/warehouse/api/v1/variant/${productId}/`;
        try {
            const response = await fetch(PRODUCT_URL, {
                method: "GET",
                headers: {
                    "Authorization": `Token ${token}`,
                    "Accept": "application/json"
                }
            });
            if (!response.ok) throw new Error("Erreur lors de la récupération du produit");
            const product = await response.json();
            product.id = productId;
            return product;
        } catch (error) {
            console.error("Erreur lors de la récupération du produit :", error);
            return null;
        }
    }

    const productCache = {};

    async function preloadAllProducts() {
        const TOKEN = await fetchAuthToken();
        if (!TOKEN) return;
        const ids = Object.values(chairProductMap);
        const promises = ids.map(id => fetchProductData(id, TOKEN));
        const results = await Promise.all(promises);
        results.forEach(product => {
            if (product) productCache[product.id] = product;
        });
    }

    // === Mise à jour de l'UI en se basant sur la référence affichée ===
    // La référence affichée se compose des spans "ref", "ref C", "ref P" et "ref P2"
    function updateChair() {
        const refMain = document.getElementById("ref").textContent.trim();      // ex: "HOL"
        const refC = document.getElementById("ref C").textContent.trim();         // ex: "OG", "JG", etc.
        const baseRef = `${refMain}-${refC}`;
        console.log("Base reference (produit principal):", baseRef);
        const productId = chairProductMap[baseRef];
        if (!productId) {
            console.error("Produit principal non trouvé pour la référence:", baseRef);
            return;
        }

        // Pour le pied, on déduit le code en fonction des boutons d'assise et de piètement
        const seatingActive = document.querySelector('.seating-options button.active2');
        const seatType = seatingActive ? seatingActive.id.toLowerCase() : "pivotante";

        const footingActive = document.querySelector('.footing-options button.active3');
        const footingId = footingActive ? footingActive.id.toLowerCase() : "noir";

        let compCode = "";
        if (seatType === "pivotante") {
            compCode = (footingId === "noir") ? "PNP" : "PBP";
        } else if (seatType === "fixe") {
            compCode = (footingId === "noir") ? "PNF" : "PBF";
        }
        console.log("Computed component code:", compCode);

        fetchChairInfo(productId, compCode);
    }

    async function fetchChairInfo(productId, compCode) {
        let product;
        if (productCache[productId]) {
            product = productCache[productId];
        } else {
            const TOKEN = await fetchAuthToken();
            product = await fetchProductData(productId, TOKEN);
            if (product) productCache[productId] = product;
            else return;
        }

        // --- Infos du produit principal ---
        let mainStock = 0;
        if (product.warehouse_inventory_object && product.warehouse_inventory_object.length > 0) {
            const entry = product.warehouse_inventory_object.find(item =>
                (typeof item.warehouse === "object" ? item.warehouse.id === 1 : item.warehouse === 1)
            );
            if (entry) mainStock = entry.in_available_stock;
        }
        const coef = getCoefFromUrl();
        const rawMainPrice = parseFloat(product.price) || 0;

        // --- Infos du composant (pieds) ---
        const compSKUExpected = chairComponentMap[compCode] || "";
        let currentCompPrice = null;
        let compStock = null;
        if (compSKUExpected && product.article_component && product.article_component.length > 0) {
            const compObj = product.article_component.find(comp =>
                comp.sku.trim().toUpperCase().replace(/\s+/g, "") === compSKUExpected.trim().toUpperCase().replace(/\s+/g, "")
            );
            if (compObj && compObj.warehouse_inventory_object && compObj.warehouse_inventory_object.length > 0) {
                const pedEntry = compObj.warehouse_inventory_object.find(item =>
                    (typeof item.warehouse === "object" ? item.warehouse.id === 1 : item.warehouse === 1)
                );
                if (pedEntry) compStock = pedEntry.in_available_stock;
            }
            if (compObj) {
                currentCompPrice = parseFloat(compObj.price) || 0;
            }
        }

        // Pour obtenir la majoration, nous prenons le prix de référence pour "PNP" (PIEDS NOIR PIVOTANT)
        let baseLegPrice = null;
        const baseCompExpected = chairComponentMap["PNP"];
        if (baseCompExpected && product.article_component && product.article_component.length > 0) {
            const baseCompObj = product.article_component.find(comp =>
                comp.sku.trim().toUpperCase().replace(/\s+/g, "") === baseCompExpected.trim().toUpperCase().replace(/\s+/g, "")
            );
            if (baseCompObj && baseCompObj.warehouse_inventory_object && baseCompObj.warehouse_inventory_object.length > 0) {
                const baseEntry = baseCompObj.warehouse_inventory_object.find(item =>
                    (typeof item.warehouse === "object" ? item.warehouse.id === 1 : item.warehouse === 1)
                );
                if (baseEntry) {
                    baseLegPrice = parseFloat(baseCompObj.price) || 0;
                }
            }
        }

        if (currentCompPrice === null || baseLegPrice === null) {
            console.error("Impossible de récupérer les informations de prix pour les pieds.");
            return;
        }

        // Calcul final : (rawMainPrice + (currentCompPrice - baseLegPrice)) * coef
        const finalPrice = Math.round((rawMainPrice + (currentCompPrice - baseLegPrice)) * coef);


        updateChairUI(finalPrice, parseFloat(product.eco_part) || 0, product.colour || "", mainStock);
    }

    function updateChairUI(price, ecoPart, colour, stock) {
        const priceEl = document.getElementById("price");
        if (priceEl) priceEl.textContent = `${price} €`;
        const ecoEl = document.getElementById("eco-part");
        if (ecoEl) ecoEl.textContent = ecoPart.toFixed(2);
        const stockEl = document.getElementById("stock-info");
        if (stockEl) {
            stockEl.innerHTML = `<span style="display:inline-block; width:12px; height:12px; border-radius:50%; background-color:${stock > 0 ? "green" : "red"};"></span>`;
        }
    }

    // === Fonction de chargement (loading state) ===
    function setLoadingState() {
        const priceEl = document.getElementById("price");
        if (priceEl) priceEl.textContent = "-";
        const ecoEl = document.getElementById("eco-part");
        if (ecoEl) ecoEl.textContent = "-";
        const stockEl = document.getElementById("stock-info");
        if (stockEl) {
            stockEl.innerHTML = `<span style="display:inline-block; width:12px; height:12px; border-radius:50%; background-color:gray;"></span>`;
        }
    }

    // === Initialisation ===
    document.addEventListener("DOMContentLoaded", async function () {
        setLoadingState();
        // Mise à jour lorsque n'importe quel bouton change, y compris la couleur
        const selectors = document.querySelectorAll('.formes-item, .ceramique-item, .pietement-item, .pietement-item2, .seating-options button, .footing-options button, .color-options button');
        selectors.forEach(item => {
            item.addEventListener('click', () => {
                // Si un bouton de couleur est cliqué, met à jour aussi le span "ref C"
                if (item.classList.contains('hover1')) {
                    const colorRef = colorRefMap[item.id];
                    if (colorRef) {
                        document.getElementById("ref C").textContent = colorRef;
                    }
                }
                setTimeout(updateChair, 50);
            });
        });
        await preloadAllProducts();
        updateChair();
    });
})();
