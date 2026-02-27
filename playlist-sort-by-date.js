// playlist-sort-by-date.js
// MPV plugin to sort playlist entries by file modification date (newest first)
//
// Usage:
//   Place this file in ~/.config/mpv/scripts/ or ~/.mpv/scripts/
//   Run the command: script-message playlist-sort-by-date
//   Or bind to a key in input.conf: Ctrl+s script-message playlist-sort-by-date
//
// This plugin registers a 'playlist-sort-by-date' command that:
// - Sorts local files by modification date (newest first)
// - Skips URLs/streams (leaves them in place)
// - Preserves currently playing track position

var utils = require("mp.utils");

// Check if a path is a local file (not a URL/stream)
function isLocalFile(filepath) {
    if (!filepath) {
        return false;
    }

    // Check for common URL protocols
    var urlProtocols = ["http://", "https://", "ftp://", "ftps://", "rtmp://", "rtsp://", "mms://", "mmsh://"];
    var lowerPath = filepath.toLowerCase();

    for (var i = 0; i < urlProtocols.length; i++) {
        if (lowerPath.indexOf(urlProtocols[i]) === 0) {
            return false;
        }
    }

    return true;
}

// Get file modification time for a given filepath
// Returns mtime timestamp or null on failure
function getFileStat(filepath) {
    try {
        var fileInfo = utils.file_info(filepath);
        if (fileInfo && fileInfo.mtime !== undefined) {
            return fileInfo.mtime;
        }
        return null;
    } catch (e) {
        mp.msg.warn("Failed to stat " + filepath + ": " + e);
        return null;
    }
}

// Collect playlist entries with their stats
// Returns {entries: [...], currentIndex: N}
function getPlaylistWithStats() {
    var playlist = mp.get_property_native("playlist");
    var currentIndex = mp.get_property_number("playlist-pos", -1);

    if (!playlist || playlist.length === 0) {
        mp.msg.warn("Playlist is empty");
        return { entries: [], currentIndex: -1 };
    }

    var entries = [];

    for (var i = 0; i < playlist.length; i++) {
        var entry = playlist[i];
        var filename = entry.filename;
        var isLocal = isLocalFile(filename);
        var mtime = null;

        if (isLocal) {
            mtime = getFileStat(filename);
        }

        entries.push({
            index: i,
            filename: filename,
            mtime: mtime,
            isLocal: isLocal
        });
    }

    return {
        entries: entries,
        currentIndex: currentIndex
    };
}

// Calculate the new position for the currently playing file after sorting
function findNewIndex(currentFilename, sortedEntries) {
    for (var i = 0; i < sortedEntries.length; i++) {
        if (sortedEntries[i].filename === currentFilename) {
            return i;
        }
    }
    return -1;
}

// Apply playlist reordering by moving entries to their sorted positions
function applyPlaylistMoves(sortedEntries, originalEntries) {
    // Build a map of where each original index should end up
    var targetPositions = [];

    for (var i = 0; i < sortedEntries.length; i++) {
        targetPositions.push(sortedEntries[i].index);
    }

    // Apply moves to reorder the playlist
    // We need to move items one at a time, tracking position changes
    for (var targetPos = 0; targetPos < targetPositions.length; targetPos++) {
        var desiredOriginalIndex = targetPositions[targetPos];

        // Find where this original index is currently located
        var currentPos = -1;
        for (var j = 0; j < targetPositions.length; j++) {
            if (targetPositions[j] === desiredOriginalIndex) {
                currentPos = j;
                break;
            }
        }

        if (currentPos !== targetPos && currentPos !== -1) {
            // Move from currentPos to targetPos
            mp.commandv("playlist-move", currentPos, targetPos);

            // Update our tracking array to reflect the move
            var movedItem = targetPositions.splice(currentPos, 1)[0];
            targetPositions.splice(targetPos, 0, movedItem);
        }
    }
}

// Main sorting function
function sortPlaylistByDate() {
    mp.msg.info("Sorting playlist by date (newest first)...");

    var data = getPlaylistWithStats();

    if (data.entries.length === 0) {
        mp.msg.warn("No entries to sort");
        return;
    }

    // Remember the currently playing filename
    var currentFilename = null;
    if (data.currentIndex >= 0 && data.currentIndex < data.entries.length) {
        currentFilename = data.entries[data.currentIndex].filename;
    }

    // Separate local files and non-local entries
    var localEntries = [];
    var nonLocalEntries = [];

    for (var i = 0; i < data.entries.length; i++) {
        var entry = data.entries[i];
        if (entry.isLocal && entry.mtime !== null) {
            localEntries.push(entry);
        } else {
            nonLocalEntries.push(entry);
        }
    }

    // Sort local files by mtime (newest first - descending order)
    localEntries.sort(function(a, b) {
        if (a.mtime === null && b.mtime === null) return 0;
        if (a.mtime === null) return 1;
        if (b.mtime === null) return -1;
        return b.mtime - a.mtime; // Descending order (newest first)
    });

    // Combine: sorted local files first, then non-local entries
    var sortedEntries = localEntries.concat(nonLocalEntries);

    mp.msg.info("Sorted " + localEntries.length + " local files, " + nonLocalEntries.length + " URLs/streams remain");

    // Apply the reordering
    applyPlaylistMoves(sortedEntries, data.entries);

    // Restore playback position if there was a currently playing file
    if (currentFilename !== null) {
        var newIndex = findNewIndex(currentFilename, sortedEntries);
        if (newIndex >= 0 && newIndex !== data.currentIndex) {
            mp.set_property_number("playlist-pos", newIndex);
            mp.msg.info("Restored playback position to index " + newIndex);
        }
    }

    mp.msg.info("Playlist sorting complete");
}

// Register the command
mp.register_script_message("playlist-sort-by-date", sortPlaylistByDate);

mp.msg.info("playlist-sort-by-date plugin loaded. Use: script-message playlist-sort-by-date");
