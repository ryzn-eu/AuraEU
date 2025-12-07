// media-controller.js
// Gestisce SOLO i metadati, senza toccare il playback

class AuraMediaController {
    constructor(audioElement) {
        this.audio = audioElement;
        this.currentMeta = null;
        
        if ('mediaSession' in navigator) {
            this.initHandlers();
        }
    }

    updateMetadata(track) {
        if (!('mediaSession' in navigator)) return;
        
        this.currentMeta = track;
        
        // Aggiornamento "passivo": diciamo solo al sistema cosa stiamo suonando
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.artist,
            album: track.albumTitle || 'Aura Music',
            artwork: [
                { src: track.cover, sizes: '96x96', type: 'image/png' },
                { src: track.cover, sizes: '128x128', type: 'image/png' },
                { src: track.cover, sizes: '192x192', type: 'image/png' },
                { src: track.cover, sizes: '256x256', type: 'image/png' },
                { src: track.cover, sizes: '384x384', type: 'image/png' },
                { src: track.cover, sizes: '512x512', type: 'image/png' },
            ]
        });
    }

    updateState() {
        if (!('mediaSession' in navigator)) return;
        
        // Sincronizza lo stato (playing/paused) senza forzare comandi
        try {
            navigator.mediaSession.playbackState = !this.audio.paused ? 'playing' : 'paused';
        } catch(e) {
            console.warn("MediaSession state update error", e);
        }
    }

    initHandlers() {
        // Questi handler chiamano le funzioni globali definite in index.html
        // Usiamo window.functionName per collegarci al codice principale
        
        // 1. DISABILITIAMO ESPLICITAMENTE Play e Pause nel sistema in background
        // Impostandoli a null, i bottoni verranno disabilitati o nascosti nel control center
        try {
            navigator.mediaSession.setActionHandler('play', null);
            navigator.mediaSession.setActionHandler('pause', null);
        } catch (error) {
            console.log("Play/Pause disable not supported");
        }

        // 2. Manteniamo attivi solo Skip e Seek
        const actions = [
            ['previoustrack', () => { if(window.skipBackward) window.skipBackward(); }],
            ['nexttrack', () => { if(window.skipForward) window.skipForward(); }],
            ['seekto', (details) => { 
                if (this.audio && details.seekTime) {
                    this.audio.currentTime = details.seekTime;
                }
            }]
        ];

        for (const [action, handler] of actions) {
            try {
                navigator.mediaSession.setActionHandler(action, handler);
            } catch (error) {
                console.log(`Action ${action} not supported`);
            }
        }
    }
}

// Esporta un'istanza globale per facilitare l'uso
window.AuraMedia = null;

function initMediaController(audioId) {
    const el = document.getElementById(audioId);
    if(el) {
        window.AuraMedia = new AuraMediaController(el);
        // Ascolta eventi passivi per aggiornare lo stato play/pause
        el.addEventListener('play', () => window.AuraMedia.updateState());
        el.addEventListener('pause', () => window.AuraMedia.updateState());
    }
}
