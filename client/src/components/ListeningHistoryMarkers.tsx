import React from 'react';
import {ListeningHistoryEntry} from '../interfaces/listeningHistory';

interface ListeningHistoryMarkersProps {
    duration: number;
    entries: ListeningHistoryEntry[];
    compact?: boolean;
}

function ListeningHistoryMarkers({duration, entries, compact = false}: ListeningHistoryMarkersProps) {
    if (!duration || entries.length === 0) return null;

    const visibleEntries = entries
        .filter(entry => entry.fromPosition > 0 && entry.fromPosition < duration)
        .slice(0, 24)
        .reverse();

    return (
        <div className={`pointer-events-none absolute inset-x-0 z-20 ${compact ? 'top-0 h-2' : 'top-0 h-1.5'}`} aria-hidden="true">
            {visibleEntries.map(entry => (
                <span
                    key={entry.id}
                    className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border shadow-sm ${
                        entry.reason === 'deviceSync'
                            ? 'h-2.5 w-2.5 border-sky-200 bg-sky-400'
                            : 'h-2 w-2 border-[#17191e] bg-orange-200'
                    }`}
                    style={{left: `${Math.min(100, Math.max(0, (entry.fromPosition / duration) * 100))}%`}}
                />
            ))}
        </div>
    );
}

export default ListeningHistoryMarkers;
