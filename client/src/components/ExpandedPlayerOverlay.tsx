import React, {useEffect} from 'react';
import {usePlayer} from '../contexts/PlayerContext';
import PlayerView from './PlayerView';

function ExpandedPlayerOverlay() {
    const {activeBook, isExpanded, closeExpandedPlayer} = usePlayer();

    useEffect(() => {
        if (!isExpanded) return;
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') closeExpandedPlayer();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isExpanded, closeExpandedPlayer]);

    if (!activeBook || !isExpanded) return null;

    return <PlayerView isOverlay onClose={closeExpandedPlayer} />;
}

export default ExpandedPlayerOverlay;
