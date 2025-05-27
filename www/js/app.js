// Load jsmediatags for metadata
const script = document.createElement('script');
script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.5/jsmediatags.min.js';
document.head.appendChild(script);

// Initialize app (for Cordova and browser testing)
function initApp() {
    // DOM elements
    const audioPlayer = document.getElementById('audio-player');
    const songList = document.getElementById('song-list');
    const uploadedSongs = document.getElementById('uploaded-songs');
    const playlistList = document.getElementById('playlist-list');
    const searchInput = document.getElementById('search');
    const filterBtn = document.getElementById('filter-btn');
    const filterOptions = document.getElementById('filter-options');
    const filterArtist = document.getElementById('filter-artist');
    const filterAlbum = document.getElementById('filter-album');
    const uploadArea = document.getElementById('upload-area');
    const uploadBtn = document.getElementById('upload-btn');
    const songUpload = document.getElementById('song-upload');
    const uploadProgress = document.getElementById('upload-progress');
    const uploadProgressBar = document.getElementById('upload-progress-bar');
    const uploadFileName = document.getElementById('upload-file-name');
    const createPlaylistBtn = document.getElementById('create-playlist');
    const miniPlayPauseBtn = document.getElementById('mini-play-pause-btn');
    const miniPrevBtn = document.getElementById('mini-prev-btn');
    const miniNextBtn = document.getElementById('mini-next-btn');
    const playPauseBtn = document.getElementById('play-pause-btn-large');
    const prevBtn = document.getElementById('prev-btn-large');
    const nextBtn = document.getElementById('next-btn-large');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const repeatBtn = document.getElementById('repeat-btn');
    const progressBar = document.getElementById('now-playing-progress');
    const currentTime = document.getElementById('now-playing-current');
    const duration = document.getElementById('now-playing-duration');
    const trackTitle = document.getElementById('now-playing-title');
    const trackArtist = document.getElementById('now-playing-artist');
    const trackAlbum = document.getElementById('now-playing-album');
    const albumArt = document.getElementById('now-playing-art');
    const miniTrackTitle = document.getElementById('mini-track-title');
    const miniTrackArtist = document.getElementById('mini-track-artist');
    const miniAlbumArt = document.getElementById('mini-album-art');
    const volumeBar = document.getElementById('volume-bar');
    const themeSelect = document.getElementById('theme-select');
    const playlistModal = document.getElementById('playlist-modal');
    const modalSongList = document.getElementById('modal-song-list');
    const modalCancel = document.getElementById('modal-cancel');
    const modalConfirm = document.getElementById('modal-confirm');

    let songs = [];
    let playlists = JSON.parse(localStorage.getItem('playlists')) || [];
    let currentSongIndex = -1;
    let currentPlaylist = null;
    let isPlaying = false;
    let isShuffle = false;
    let isRepeat = false;
    let selectedSongs = [];
    let currentPlaylistIndex = -1;

    // Theme switching
    themeSelect.addEventListener('change', () => {
        document.body.className = themeSelect.value;
        localStorage.setItem('theme', themeSelect.value);
    });

    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.className = savedTheme;
    themeSelect.value = savedTheme;

    // Navigation
    document.querySelectorAll('.sidebar li').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.sidebar li').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            const section = document.getElementById(item.dataset.section);
            if (section) {
                section.classList.add('active');
            } else {
                console.error(`Section ${item.dataset.section} not found`);
            }
            if (item.dataset.section !== 'playlists') {
                currentPlaylist = null;
                displaySongs(songs);
            }
        });
    });

    // Load songs and metadata
    function loadSongs() {
        if (!window.cordova) {
            console.log('Running in browser, file access disabled.');
            songs = [{ name: 'Sample Song.mp3', artist: 'Unknown Artist', album: 'Unknown Album', url: '' }];
            displaySongs(songs);
            updateFilters();
            return;
        }
        window.resolveLocalFileSystemURL(cordova.file.externalDataDirectory, dirEntry => {
            const reader = dirEntry.createReader();
            reader.readEntries(entries => {
                songs = entries.filter(entry => entry.isFile && entry.name.match(/\.(mp3|wav)$/i));
                songs.forEach(song => {
                    song.artist = 'Unknown Artist';
                    song.album = 'Unknown Album';
                    if (window.jsmediatags) {
                        window.jsmediatags.read(song.nativeURL, {
                            onSuccess: tag => {
                                song.artist = tag.tags.artist || 'Unknown Artist';
                                song.album = tag.tags.album || 'Unknown Album';
                                displaySongs(songs);
                                updateFilters();
                            },
                            onError: () => console.log('Metadata read error for', song.name)
                        });
                    }
                });
                displaySongs(songs);
                updateFilters();
            }, err => console.error('Error reading directory:', err));
        }, err => console.error('Error accessing directory:', err));
    }

    // Display songs
    function displaySongs(songsToDisplay) {
        songList.innerHTML = '';
        songsToDisplay.forEach((song, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <img src="assets/images/default-album.png" alt="Album">
                <div>
                    <span>${song.name}</span>
                    <p>${song.artist} - ${song.album}</p>
                </div>
            `;
            li.addEventListener('click', () => playSong(index, songsToDisplay));
            songList.appendChild(li);
        });
    }

    // Update artist and album filters
    function updateFilters() {
        const artists = [...new Set(songs.map(song => song.artist))];
        const albums = [...new Set(songs.map(song => song.album))];
        filterArtist.innerHTML = '<option value="">All Artists</option>' + artists.map(a => `<option value="${a}">${a}</option>`).join('');
        filterAlbum.innerHTML = '<option value="">All Albums</option>' + albums.map(a => `<option value="${a}">${a}</option>`).join('');
    }

    // Filter songs
    filterBtn.addEventListener('click', () => {
        filterOptions.style.display = filterOptions.style.display === 'none' ? 'flex' : 'none';
    });

    filterArtist.addEventListener('change', applyFilters);
    filterAlbum.addEventListener('change', applyFilters);

    function applyFilters() {
        let filteredSongs = songs;
        if (filterArtist.value) {
            filteredSongs = filteredSongs.filter(song => song.artist === filterArtist.value);
        }
        if (filterAlbum.value) {
            filteredSongs = filteredSongs.filter(song => song.album === filterAlbum.value);
        }
        displaySongs(filteredSongs);
    }

    // Upload songs
    uploadBtn.addEventListener('click', () => {
        if (window.cordova) {
            songUpload.click();
        } else {
            alert('Song upload only works on Android device.');
            uploadedSongs.innerHTML = '<li>Upload not supported in browser.</li>';
        }
    });

    uploadArea.addEventListener('dragover', e => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', e => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (!window.cordova) {
            alert('Drag-and-drop only works on Android device.');
            return;
        }
        const files = e.dataTransfer.files;
        uploadFiles(files);
    });

    songUpload.addEventListener('change', () => {
        const files = songUpload.files;
        uploadFiles(files);
    });

    function uploadFiles(files) {
        if (!window.cordova) return;
        Array.from(files).forEach((file, index) => {
            if (!file.name.match(/\.(mp3|wav)$/i)) {
                alert(`Invalid file: ${file.name}. Only MP3 and WAV are supported.`);
                return;
            }
            uploadProgress.style.display = 'block';
            uploadFileName.textContent = file.name;
            uploadProgressBar.value = 0;

            // Simulate progress
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                uploadProgressBar.value = progress;
                if (progress >= 100) clearInterval(interval);
            }, 200);

            window.resolveLocalFileSystemURL(cordova.file.externalDataDirectory, dirEntry => {
                dirEntry.getFile(file.name, { create: true }, fileEntry => {
                    fileEntry.createWriter(writer => {
                        writer.onwriteend = () => {
                            songs.push({ ...fileEntry, artist: 'Unknown Artist', album: 'Unknown Album' });
                            if (window.jsmediatags) {
                                window.jsmediatags.read(file, {
                                    onSuccess: tag => {
                                        fileEntry.artist = tag.tags.artist || 'Unknown Artist';
                                        fileEntry.album = tag.tags.album || 'Unknown Album';
                                        displaySongs(songs);
                                        updateFilters();
                                    }
                                });
                            }
                            uploadedSongs.innerHTML += `
                                <li>
                                    <img src="assets/images/default-album.png" alt="Album">
                                    <div>
                                        <span>Uploaded: ${file.name}</span>
                                        <p>${fileEntry.artist} - ${fileEntry.album}</p>
                                    </div>
                                </li>`;
                            displaySongs(songs);
                            if (index === files.length - 1) {
                                uploadProgress.style.display = 'none';
                            }
                        };
                        writer.write(file);
                    });
                });
            });
        });
    }

    // Playlist management
    createPlaylistBtn.addEventListener('click', () => {
        const name = prompt('Enter playlist name:');
        if (name) {
            playlists.push({ name, songs: [] });
            localStorage.setItem('playlists', JSON.stringify(playlists));
            displayPlaylists();
        }
    });

    function displayPlaylists() {
        playlistList.innerHTML = '';
        playlists.forEach((playlist, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <img src="assets/images/default-album.png" alt="Playlist">
                <div>
                    <span>${playlist.name}</span>
                    <p>${playlist.songs.length} songs</p>
                    <button onclick="openPlaylistModal(${index})">Add Songs</button>
                </div>
            `;
            li.addEventListener('click', () => {
                currentPlaylist = playlist;
                displayPlaylistSongs(index);
            });
            playlistList.appendChild(li);
        });
    }

    window.openPlaylistModal = function(index) {
        currentPlaylistIndex = index;
        selectedSongs = [];
        modalSongList.innerHTML = '';
        songs.forEach((song, i) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <input type="checkbox" id="song-${i}">
                <label for="song-${i}">
                    <img src="assets/images/default-album.png" alt="Album">
                    <div>
                        <span>${song.name}</span>
                        <p>${song.artist} - ${song.album}</p>
                    </div>
                </label>
            `;
            li.querySelector('input').addEventListener('change', e => {
                if (e.target.checked) {
                    selectedSongs.push(song);
                } else {
                    selectedSongs = selectedSongs.filter(s => s !== song);
                }
            });
            modalSongList.appendChild(li);
        });
        playlistModal.style.display = 'flex';
    };

    modalCancel.addEventListener('click', () => {
        playlistModal.style.display = 'none';
    });

    modalConfirm.addEventListener('click', () => {
        if (selectedSongs.length) {
            playlists[currentPlaylistIndex].songs.push(...selectedSongs);
            localStorage.setItem('playlists', JSON.stringify(playlists));
            displayPlaylists();
        }
        playlistModal.style.display = 'none';
    });

    function displayPlaylistSongs(playlistIndex) {
        songList.innerHTML = '';
        playlists[playlistIndex].songs.forEach((song, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <img src="assets/images/default-album.png" alt="Album">
                <div>
                    <span>${song.name}</span>
                    <p>${song.artist} - ${song.album}</p>
                </div>
            `;
            li.addEventListener('click', () => playSong(index, playlists[playlistIndex].songs));
            songList.appendChild(li);
        });
    }

    // Playback
    function playSong(index, songArray = songs) {
        currentSongIndex = index;
        const song = songArray[index];
        if (window.cordova) {
            audioPlayer.src = song.nativeURL || song.url;
            audioPlayer.play().catch(err => {
                console.error('Playback error:', err);
                alert('Cannot play this song.');
            });
        } else {
            console.log('Audio not supported in browser. Test on Android.');
            updateTrackInfo(song.name || 'No song selected', song.artist, song.album);
            return;
        }
        isPlaying = true;
        updatePlayPauseButtons('pause');
        updateTrackInfo(song.name, song.artist, song.album);
    }

    function updateTrackInfo(title, artist, album) {
        trackTitle.textContent = title;
        trackArtist.textContent = artist;
        trackAlbum.textContent = album;
        miniTrackTitle.textContent = title;
        miniTrackArtist.textContent = artist;
        albumArt.src = 'assets/images/default-album.png';
        miniAlbumArt.src = 'assets/images/default-album.png';
    }

    function updatePlayPauseButtons(state) {
        const src = state === 'pause' ? 'assets/icons/pause.svg' : 'assets/icons/play.svg';
        miniPlayPauseBtn.querySelector('img').src = src;
        playPauseBtn.querySelector('img').src = src;
    }

    miniPlayPauseBtn.addEventListener('click', togglePlayPause);
    playPauseBtn.addEventListener('click', togglePlayPause);

    function togglePlayPause() {
        if (isPlaying) {
            audioPlayer.pause();
            updatePlayPauseButtons('play');
        } else {
            audioPlayer.play().catch(err => console.error('Playback error:', err));
            updatePlayPauseButtons('pause');
        }
        isPlaying = !isPlaying;
    }

    miniPrevBtn.addEventListener('click', playPrevious);
    prevBtn.addEventListener('click', playPrevious);

    function playPrevious() {
        if (isShuffle) {
            playSong(Math.floor(Math.random() * (currentPlaylist || songs).length), currentPlaylist || songs);
        } else if (currentSongIndex > 0) {
            playSong(currentSongIndex - 1, currentPlaylist || songs);
        }
    }

    miniNextBtn.addEventListener('click', playNext);
    nextBtn.addEventListener('click', playNext);

    function playNext() {
        if (isShuffle) {
            playSong(Math.floor(Math.random() * (currentPlaylist || songs).length), currentPlaylist || songs);
        } else if (currentSongIndex < (currentPlaylist || songs).length - 1) {
            playSong(currentSongIndex + 1, currentPlaylist || songs);
        } else if (isRepeat) {
            playSong(0, currentPlaylist || songs);
        }
    }

    shuffleBtn.addEventListener('click', () => {
        isShuffle = !isShuffle;
        shuffleBtn.style.opacity = isShuffle ? '1' : '0.5';
    });

    repeatBtn.addEventListener('click', () => {
        isRepeat = !isRepeat;
        repeatBtn.style.opacity = isRepeat ? '1' : '0.5';
    });

    volumeBar.addEventListener('input', () => {
        audioPlayer.volume = volumeBar.value / 100;
    });

    audioPlayer.addEventListener('timeupdate', () => {
        const current = audioPlayer.currentTime;
        const dur = audioPlayer.duration;
        const progress = (current / dur) * 100 || 0;
        progressBar.value = progress;
        currentTime.textContent = formatTime(current);
        duration.textContent = formatTime(dur);
    });

    progressBar.addEventListener('input', () => {
        audioPlayer.currentTime = (progressBar.value / 100) * audioPlayer.duration;
    });

    function formatTime(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    }

    // Search
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        const filteredSongs = songs.filter(song =>
            song.name.toLowerCase().includes(query) ||
            song.artist.toLowerCase().includes(query) ||
            song.album.toLowerCase().includes(query)
        );
        displaySongs(filteredSongs);
        const filteredPlaylists = playlists.filter(playlist => playlist.name.toLowerCase().includes(query));
        playlistList.innerHTML = '';
        filteredPlaylists.forEach((playlist, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <img src="assets/images/default-album.png" alt="Playlist">
                <div>
                    <span>${playlist.name}</span>
                    <p>${playlist.songs.length} songs</p>
                    <button onclick="openPlaylistModal(${index})">Add Songs</button>
                </div>
            `;
            li.addEventListener('click', () => {
                currentPlaylist = playlist;
                displayPlaylistSongs(index);
            });
            playlistList.appendChild(li);
        });
    });

    // Initialize
    loadSongs();
    displayPlaylists();
}

// Handle Cordova and browser
if (window.cordova) {
    document.addEventListener('deviceready', initApp, false);
} else {
    document.addEventListener('DOMContentLoaded', initApp, false);
}