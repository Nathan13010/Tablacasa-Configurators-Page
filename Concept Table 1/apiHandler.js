// apiHandler.js – version 16 juin 2025
// ------------------------------------------------------------------
// • Le prix net affiché est exactement celui renvoyé par l’API.
// • Le coefficient perso (?coef=) s’applique sur le net API.
// • Le supplément piètement PV (+50 € HT) s’ajoute APRÈS le coefficient
//   — le coefficient ne s’applique donc PAS sur ces 50 €.
// • Aucune valeur de prix n’est codée en dur.
// ------------------------------------------------------------------

// --------------------------------------------------
// 0. UTILITAIRES GÉNÉRAUX
// --------------------------------------------------
async function fetchAuthToken() {
    const LOGIN_URL = "https://tablacasa.com/auth/api/v1/login/";
    const EMAIL = "client1@tablacasa.com";   // ⚠️ à adapter
    const PASSWORD = "k4o6o3p4";

    const formData = new FormData();
    formData.append("email", EMAIL);
    formData.append("password", PASSWORD);

    const resp = await fetch(LOGIN_URL, { method: "POST", body: formData });
    if (!resp.ok) throw new Error("Échec de l’authentification");
    const data = await resp.json();
    return data.token;
}

function getCoefFromUrl() {
    const p = new URLSearchParams(window.location.search);
    const c = parseFloat(p.get("coef"));
    return isNaN(c) ? 1 : c;
}

function shouldHidePrice() {
    return new URLSearchParams(window.location.search).has("hideprice");
}

function setLoadingState() {
    const priceEl = document.getElementById("product-price");
    if (priceEl) priceEl.textContent = shouldHidePrice() ? "" : "- €";

    const stockEl = document.getElementById("stock-status");
    if (stockEl) {
        stockEl.innerHTML =
            '<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:gray;"></span>';
    }
}

// --------------------------------------------------
// 1. MAPPING RÉF. → ID (extrait)
// --------------------------------------------------
const productMap = {
    "RE.160-CMN": 1386,
    "RE.160-CBB": 1436,
    "RE.160-CGA": 1389,
    "RE.160-CB": 1388,
    "RE.160-CMB": 1387,
    "RE.160-CT": 1387,

    "RE.180-CMN": 1385,
    "RE.180-CBB": 1437,
    "RE.180-CB": 1384,
    "RE.180-CMB": 1383,
    "RE.180-CGA": 1382,
    "RE.180-CT": 1382,

    "RE.200-CMN": 1379,
    "RE.200-CBB": 1438,
    "RE.200-CGA": 1381,
    "RE.200-CB": 1378,
    "RE.200-CT": 1378,

    "TO.160-CBB": 1430,
    "TO.160-CGA": 1369,
    "TO.160-CB": 1368,
    "TO.160-CMB": 1367,
    "TO.160-CMN": 1366,
    "TO.160-CT": 1366,

    "TO.180-CBB": 1431,
    "TO.180-CGA": 1370,
    "TO.180-CB": 1372,
    "TO.180-CMB": 1373,
    "TO.180-CMN": 1371,
    "TO.180-CT": 1371,

    "TO.200-CBB": 1432,
    "TO.200-CGA": 1376,
    "TO.200-CB": 1377,
    "TO.200-CMB": 1375,
    "TO.200-CMN": 1374,
    "TO.200-CT": 1374,

    "OV.160-CBB": 1433,
    "OV.160-CGA": 1390,
    "OV.160-CB": 1393,
    "OV.160-CMB": 1392,
    "OV.160-CMN": 1391,
    "OV.160-CT": 1391,

    "OV.180-CBB": 1434,
    "OV.180-CGA": 1397,
    "OV.180-CB": 1396,
    "OV.180-CMB": 1394,
    "OV.180-CMN": 1395,
    "OV.180-CT": 1395,

    "OV.200-CBB": 1435,
    "OV.200-CGA": 1398,
    "OV.200-CB": 1399,
    "OV.200-CMB": 1400,
    "OV.200-CMN": 1401,
    "OV.200-CT": 1401,
};

// --------------------------------------------------
// 2. CACHE & APPELS API
// --------------------------------------------------
const productCache = {};

async function fetchProductData(productId, token) {
    const URL = `https://tablacasa.com/warehouse/api/v1/variant/${productId}/`;
    const resp = await fetch(URL, {
        headers: {
            "Authorization": `Token ${token}`,
            "Accept": "application/json"
        }
    });
    if (!resp.ok) throw new Error("Erreur produit");
    return resp.json();
}

async function preloadAllProducts() {
    const token = await fetchAuthToken();
    await Promise.all(
        Object.values(productMap).map(async id => {
            productCache[id] = await fetchProductData(id, token);
        })
    );
}

// --------------------------------------------------
// 3. LISTENERS UI
// --------------------------------------------------
function attachOptionListeners() {
    const groups = [
        [".formes-item", "active"],
        [".dimension-button", "active"],
        [".ceramique-item", "active"],
        [".pietement-item", "active"]
    ];
    groups.forEach(([selector, cls]) => {
        const items = document.querySelectorAll(selector);
        items.forEach(el => {
            el.addEventListener("click", function () {
                items.forEach(e => e.classList.remove(cls));
                this.classList.add(cls);
                updateProduct();
            });
        });
    });
}

// --------------------------------------------------
// 4. CONSTRUCTION DE LA RÉF. + RÉCUP PRODUIT
// --------------------------------------------------
function updateProduct() {
    // -- Forme
    const shapeEl = document.querySelector(".formes-item.active");
    let shapeCode = "";
    if (shapeEl) {
        const id = shapeEl.id.toLowerCase();
        shapeCode = id.includes("rectangle") ? "RE"
            : id.includes("ovale") ? "OV"
                : id.includes("tonneau") ? "TO" : "";
    }

    // -- Dimension
    const dimEl = document.querySelector(".dimension-button.active");
    let dimensionCode = "";
    if (dimEl) {
        const m = (dimEl.id.match(/^\d+$/) || dimEl.textContent.match(/\d+/));
        if (m) dimensionCode = m[0];
    }

    // -- Céramique
    const matEl = document.querySelector(".ceramique-item.active");
    let materialCode = "";
    if (matEl) materialCode = matEl.id.replace(/2$/, "");

    // -- Piètement
    const pedEl = document.querySelector(".pietement-item.active");
    let pedestalCode = "";
    if (pedEl) pedestalCode = pedEl.id.replace(/2$/, "");

    // -- Affichage ref live (facultatif)
    document.getElementById("1").textContent = shapeCode;
    document.getElementById("2").textContent = dimensionCode;
    document.getElementById("3").textContent = materialCode;
    document.getElementById("4").textContent = pedestalCode;

    // -- ID API
    const refSansPietement = `${shapeCode}.${dimensionCode}-${materialCode}`;
    const productId = productMap[refSansPietement];
    if (!productId) {
        console.error("Produit non trouvé :", refSansPietement);
        return;
    }

    fetchProductInfoWithPedestalCached(productId, pedestalCode);
}

// --------------------------------------------------
// 5. PRIX FINAL + STOCK
// --------------------------------------------------
async function fetchProductInfoWithPedestalCached(productId, pedestalCode = "") {
    // 5.1 Produit (cache → API si besoin)
    let product = productCache[productId];
    if (!product) {
        const token = await fetchAuthToken();
        product = await fetchProductData(productId, token);
        productCache[productId] = product;
    }

    // 5.2 Prix net de l’API
    let netPrice = parseFloat(product.price);
    if (isNaN(netPrice) || netPrice <= 0) {
        const sales = parseFloat(product.sales_price) || 0;
        const sug = parseFloat(product.suggested_sales_coefficient) || 1;
        netPrice = sales && sug ? sales / sug : 0;
    }

    // 5.3 Coefficient personnalisé
    const coef = getCoefFromUrl();
    let finalPrice = Math.round(netPrice * coef);

    // 5.4 Supplément PV (+50 € HT, NON coéfficienté)
    if (pedestalCode === "PV") finalPrice += 50;

    // 5.5 Stock plateau (entrepôt 1)
    let tableStock = 0;
    const wh = product.warehouse_inventory_object || [];
    const entry = wh.find(w => {
        const id = typeof w.warehouse === "object" ? w.warehouse.id : w.warehouse;
        return id === 1;
    });
    if (entry) tableStock = entry.in_available_stock || 0;

    // (optionnel) stock piètement …
    const available = tableStock > 0;

    // 5.6 Mise à jour UI
    updateConfiguratorUI(finalPrice,
        parseFloat(product.eco_part) || 0,
        product.sku || "N/A",
        available ? tableStock : 0);
}

// --------------------------------------------------
// 6. MISE À JOUR DE L’INTERFACE
// --------------------------------------------------
function updateConfiguratorUI(price, ecoPart, reference, stock) {
    const priceEl = document.getElementById("product-price");
    if (priceEl) priceEl.textContent = shouldHidePrice() ? "" : `${price} €`;

    const ecoEl = document.getElementById("eco-part");
    if (ecoEl) ecoEl.textContent = ecoPart.toFixed(2);

    const refEl = document.getElementById("product-ref");
    if (refEl) refEl.textContent = reference;

    const stockEl = document.getElementById("stock-status");
    if (stockEl) {
        const color = stock > 0 ? "green" : "red";
        stockEl.innerHTML =
            `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${color};"></span>`;
    }
}

// --------------------------------------------------
// 7. INITIALISATION
// --------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
    setLoadingState();
    attachOptionListeners();
    await preloadAllProducts();  // optionnel mais conseillé
    updateProduct();             // chargement initial
});