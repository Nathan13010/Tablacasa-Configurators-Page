/* __V3D_TEMPLATE__ - template-based file; delete this line to prevent this file from being updated */

'use strict';

window.addEventListener('load', e => {
    const params = v3d.AppUtils.getPageParams();
    createApp({
        containerId: 'v3d-container',
        fsButtonId: 'fullscreen-button',
        sceneURL: params.load || 'Concept Table 3.gltf',
        logicURL: params.logic || 'visual_logic.js',
    });
});

async function createApp({ containerId, fsButtonId = null, sceneURL, logicURL = '' }) {
    if (!sceneURL) {
        console.log('No scene URL specified');
        return;
    }

    v3d.Cache.enabled = true;

    let PL = null, PE = null;
    if (v3d.AppUtils.isXML(logicURL)) {
        const PUZZLES_DIR = '/puzzles/';
        const logicURLJS = logicURL.match(/(.*)\.xml$/)[1] + '.js';
        PL = await new v3d.PuzzlesLoader().loadEditorWithLogic(PUZZLES_DIR, logicURLJS);
        PE = v3d.PE;
    } else if (v3d.AppUtils.isJS(logicURL)) {
        PL = await new v3d.PuzzlesLoader().loadLogic(logicURL);
    }

    let initOptions = { useFullscreen: true };
    if (PL) {
        initOptions = PL.execInitPuzzles({ container: containerId }).initOptions;
    }
    sceneURL = initOptions.useCompAssets ? `${sceneURL}.xz` : sceneURL;

    const disposeFullscreen = prepareFullscreen(containerId, fsButtonId,
        initOptions.useFullscreen);
    const preloader = createPreloader(containerId, initOptions, PE);

    const app = createAppInstance(containerId, initOptions, preloader, PE);
    app.addEventListener('dispose', () => disposeFullscreen && disposeFullscreen());

    if (initOptions.preloaderStartCb) initOptions.preloaderStartCb();
    app.loadScene(sceneURL, () => {
        app.enableControls();
        app.run();

        if (PE) PE.updateAppInstance(app);
        if (PL) PL.init(app, initOptions);

        runCode(app, PL);
    }, null, () => {
        console.log(`Can't load the scene ${sceneURL}`);
    });

    return { app, PL };
}

function createPreloader(containerId, initOptions, PE) {
    const preloader = initOptions.useCustomPreloader
        ? createCustomPreloader(initOptions.preloaderProgressCb,
            initOptions.preloaderEndCb)
        : new v3d.SimplePreloader({ container: containerId });

    if (PE) puzzlesEditorPreparePreloader(preloader, PE);

    return preloader;
}

function createCustomPreloader(updateCb, finishCb) {
    function CustomPreloader() {
        v3d.Preloader.call(this);
    }

    CustomPreloader.prototype = Object.assign(Object.create(v3d.Preloader.prototype), {
        onUpdate: function (percentage) {
            v3d.Preloader.prototype.onUpdate.call(this, percentage);
            if (updateCb) updateCb(percentage);
        },
        onFinish: function () {
            v3d.Preloader.prototype.onFinish.call(this);
            if (finishCb) finishCb();
        }
    });

    return new CustomPreloader();
}

function puzzlesEditorPreparePreloader(preloader, PE) {
    const _onUpdate = preloader.onUpdate.bind(preloader);
    preloader.onUpdate = function (percentage) {
        _onUpdate(percentage);
        PE.loadingUpdateCb(percentage);
    }

    const _onFinish = preloader.onFinish.bind(preloader);
    preloader.onFinish = function () {
        _onFinish();
        PE.loadingFinishCb();
    }
}

function createAppInstance(containerId, initOptions, preloader, PE) {
    const ctxSettings = {};
    if (initOptions.useBkgTransp) ctxSettings.alpha = true;
    if (initOptions.preserveDrawBuf) ctxSettings.preserveDrawingBuffer = true;

    const app = new v3d.App(containerId, ctxSettings, preloader);
    if (initOptions.useBkgTransp) {
        app.clearBkgOnLoad = true;
        if (app.renderer) {
            app.renderer.setClearColor(0x000000, 0);
        }
    }

    app.ExternalInterface = {};
    prepareExternalInterface(app);
    if (PE) PE.viewportUseAppInstance(app);

    return app;
}

function prepareFullscreen(containerId, fsButtonId, useFullscreen) {
    const container = document.getElementById(containerId);
    const fsButton = document.getElementById(fsButtonId);

    if (!fsButton) return null;
    if (!useFullscreen) {
        fsButton.style.display = 'none';
        return null;
    }

    const fsEnabled = () => document.fullscreenEnabled
        || document.webkitFullscreenEnabled
        || document.mozFullScreenEnabled
        || document.msFullscreenEnabled;
    const fsElement = () => document.fullscreenElement
        || document.webkitFullscreenElement
        || document.mozFullScreenElement
        || document.msFullscreenElement;
    const requestFs = elem => (elem.requestFullscreen
        || elem.mozRequestFullScreen
        || elem.webkitRequestFullscreen
        || elem.msRequestFullscreen).call(elem);
    const exitFs = () => (document.exitFullscreen
        || document.mozCancelFullScreen
        || document.webkitExitFullscreen
        || document.msExitFullscreen).call(document);
    const changeFs = () => {
        const elem = fsElement();
        fsButton.classList.add(elem ? 'fullscreen-close' : 'fullscreen-open');
        fsButton.classList.remove(elem ? 'fullscreen-open' : 'fullscreen-close');
    };

    function fsButtonClick(event) {
        event.stopPropagation();
        fsElement() ? exitFs() : requestFs(container);
    }

    if (fsEnabled()) fsButton.style.display = 'inline';

    fsButton.addEventListener('click', fsButtonClick);
    document.addEventListener('webkitfullscreenchange', changeFs);
    document.addEventListener('mozfullscreenchange', changeFs);
    document.addEventListener('msfullscreenchange', changeFs);
    document.addEventListener('fullscreenchange', changeFs);

    const disposeFullscreen = () => {
        fsButton.removeEventListener('click', fsButtonClick);
        document.removeEventListener('webkitfullscreenchange', changeFs);
        document.removeEventListener('mozfullscreenchange', changeFs);
        document.removeEventListener('msfullscreenchange', changeFs);
        document.removeEventListener('fullscreenchange', changeFs);
    }

    return disposeFullscreen;
}

function prepareExternalInterface(app) {
    // À personnaliser si nécessaire
}

function runCode(app, puzzles) {
    // À personnaliser si nécessaire
}

document.addEventListener('DOMContentLoaded', function () {
    // Gestion commune pour l'état actif des items
    const manageActiveState = (items) => {
        items.forEach(item => {
            item.addEventListener('click', function () {
                items.forEach(i => i.classList.remove('active'));
                this.classList.add('active');
            });
        });
    };

    manageActiveState(document.querySelectorAll('.dimension-button')); // S'applique aux deux versions
    manageActiveState(document.querySelectorAll('.formes-item'));    // S'applique aux deux versions
    manageActiveState(document.querySelectorAll('.ceramique-item')); // S'applique aux deux versions
    manageActiveState(document.querySelectorAll('.pietement-item'));  // S'applique aux deux versions

    // Gestion version desktop : sections accordéon
    const desktopSectionHeaders = document.querySelectorAll('.desktop-version .section-header');
    desktopSectionHeaders.forEach(header => {
        header.addEventListener('click', function () {
            const toggleButton = this.querySelector('.toggle-btn');
            const sectionContent = this.nextElementSibling;
            sectionContent.classList.toggle('collapsed');
            if (toggleButton) { // Vérifier si le bouton existe (bonne pratique)
                toggleButton.textContent = sectionContent.classList.contains('collapsed') ? '+' : '-';
            }
        });
    });

    // Gestion version mobile
    const mobileSectionHeaders = document.querySelectorAll('.mobile-version .section-header[data-section]');
    const v3dContainer = document.getElementById('v3d-container');
    const mobileCloseSectionButton = document.querySelector('.mobile-version .close-section');
    const uiContainer = document.querySelector('.container');
    const closeContainerArrow = document.querySelector('.close-container-arrow');
    const openContainerBtn = document.querySelector('.open-container-btn');

    const isMobileSmallScreen = () => window.matchMedia('(max-width: 500px) and (max-height: 1000px)').matches;

    const updateMobileUI = () => {
        const activeMobileSectionContent = document.querySelector('.mobile-version .section-content.active');

        if (mobileCloseSectionButton) {
            mobileCloseSectionButton.style.display = activeMobileSectionContent ? 'block' : 'none';
        }

        if (v3dContainer && isMobileSmallScreen()) {
            v3dContainer.classList.toggle('shifted', !!activeMobileSectionContent);
        }

        // Gestion de la visibilité de la flèche et du bouton "Configurer"
        if (closeContainerArrow && openContainerBtn && uiContainer) {
            if (uiContainer.classList.contains('closed')) {
                closeContainerArrow.style.display = 'none';
                openContainerBtn.style.display = 'block'; // ou 'flex' ou 'inline-block' selon le style désiré
            } else {
                openContainerBtn.style.display = 'none';
                // La flèche ne s'affiche que si aucune section n'est ouverte dans le conteneur UI mobile
                closeContainerArrow.style.display = activeMobileSectionContent ? 'none' : 'block';
            }
        }
        updateArrowPosition(); // Mettre à jour la position de la flèche
    };

    if (mobileSectionHeaders.length > 0) { // S'assurer que les éléments existent
        mobileSectionHeaders.forEach(header => {
            header.addEventListener('click', function () {
                const sectionId = this.getAttribute('data-section');
                const sectionContent = document.getElementById(`${sectionId}-content`);

                // Fermer la section active précédente et désactiver son header
                const currentActiveHeader = document.querySelector('.mobile-version .section-header.active');
                const currentActiveContent = document.querySelector('.mobile-version .section-content.active');

                if (currentActiveHeader && currentActiveHeader !== this) {
                    currentActiveHeader.classList.remove('active');
                }
                if (currentActiveContent && currentActiveContent !== sectionContent) {
                    currentActiveContent.classList.remove('active');
                }

                // Gérer la section cliquée
                if (sectionContent) {
                    this.classList.toggle('active');
                    sectionContent.classList.toggle('active');
                }
                updateMobileUI();
            });
        });
    }

    if (mobileCloseSectionButton) {
        mobileCloseSectionButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Empêcher la propagation au document
            document.querySelectorAll('.mobile-version .section-content.active').forEach(c => c.classList.remove('active'));
            document.querySelectorAll('.mobile-version .section-header.active').forEach(h => h.classList.remove('active'));
            updateMobileUI();
        });
    }

    // Fermeture/Ouverture du container UI principal en mode mobile
    if (closeContainerArrow) {
        closeContainerArrow.addEventListener('click', () => {
            if (uiContainer) uiContainer.classList.add('closed');
            if (v3dContainer) v3dContainer.style.height = '100vh'; // Le conteneur 3D prend toute la hauteur
            updateMobileUI();
        });
    }

    if (openContainerBtn) {
        openContainerBtn.addEventListener('click', () => {
            if (uiContainer) uiContainer.classList.remove('closed');
            if (v3dContainer) v3dContainer.style.height = ''; // Rétablir la hauteur CSS par défaut
            updateMobileUI();
        });
    }

    // Gestion du clic sur le bouton "Ouvrir/Fermer" de la table (prix section)
    const tableButton = document.getElementById('table-button');
    if (tableButton) {
        tableButton.addEventListener('click', () => {
            if (tableButton.textContent.trim().toLowerCase() === 'fermer') {
                tableButton.textContent = 'Ouvrir';
            } else {
                tableButton.textContent = 'Fermer';
            }
        });
    }

    // Appel initial pour mettre à jour l'UI mobile (surtout pour la flèche et le bouton configurer)
    if (window.matchMedia('(max-width: 1050px)').matches) {
        updateMobileUI();
    }
});


function updateArrowPosition() {
    const container = document.querySelector('.container');
    const arrow = document.querySelector('.close-container-arrow');

    if (container && arrow && window.matchMedia('(max-width: 1050px)').matches) {
        if (!container.classList.contains('closed')) { // Seulement si le conteneur est visible
            const containerRect = container.getBoundingClientRect();
            // Positionner la flèche X pixels au-dessus du conteneur. Ajustez '40' au besoin.
            // Cette valeur doit être suffisante pour que la flèche soit visible au-dessus du conteneur.
            arrow.style.top = (containerRect.top - 35) + 'px'; // 30px hauteur de la flèche + 5px d'espace
            arrow.style.display = 'block'; // S'assurer qu'elle est visible si elle doit l'être
        } else {
            arrow.style.display = 'none'; // Cacher la flèche si le conteneur est fermé
        }
    } else if (arrow) {
        arrow.style.display = 'none'; // Cacher sur les grands écrans ou si le conteneur n'existe pas
    }
}


// Mettre à jour la position de la flèche au chargement et lors du redimensionnement/scroll
window.addEventListener('load', updateArrowPosition);
window.addEventListener('resize', updateArrowPosition);
window.addEventListener('scroll', updateArrowPosition, true); // Utiliser la capture pour les événements de scroll