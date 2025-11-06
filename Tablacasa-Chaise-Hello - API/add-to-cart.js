document.addEventListener("DOMContentLoaded", function () {
  const addToCartBtn = document.getElementById("add-to-cart");
  if (!addToCartBtn) {
    console.warn("[add-to-cart] Bouton non trouvé (id='add-to-cart').");
    return;
  }

  addToCartBtn.addEventListener("click", function () {
    const selection = window.currentSelection;
    console.log("Configuration actuelle :", selection);
    if (!selection) {
      console.warn("Aucune configuration disponible au moment du clic.");
      return;
    }
    window.parent.postMessage(selection, "*");
    console.log("Payload envoyé au parent :", selection);
  });
});
