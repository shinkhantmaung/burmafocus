// js/app.js

// --- Timer Configuration & State ---
const WORK_DURATION = 25; // minutes
const SHORT_BREAK_DURATION = 5; // minutes
const LONG_BREAK_DURATION = 15; // minutes
const POMODOROS_BEFORE_LONG_BREAK = 4; // Number of work sessions before a long break

var Clock = {
    totalSeconds: WORK_DURATION * 60, // Initial time in seconds for work session
    interval: null,
    currentMode: 'work', // 'work', 'shortBreak', 'longBreak'
    pomodoroCount: 0, // Number of completed work sessions

    lofiPlayer: null, // YouTube player object
    isLofiPlaying: false, // Track if lofi music is playing
    isPlayerReady: false, // Track if YouTube player is ready
    isBackgroundVisible: true, // Track background visibility
    
    // --- Data from JSON ---
    allVideosData: [], // To store video info loaded from JSON
    videoIds: [],      // To store just video IDs for random selection

    // --- Core Timer Logic ---
    startTimer: function () {
        if (!this.interval && this.totalSeconds > 0) {
            var self = this;
            function pad(val) { return val > 9 ? val : "0" + val; }

            // Ensure correct buttons are shown
            document.getElementById("startbtn").style.display = "none";
            document.getElementById("pausebtn").style.display = "inline-block";

            this.interval = setInterval(function () {
                self.totalSeconds -= 1;

                const currentMinutes = Math.floor(self.totalSeconds / 60);
                const currentSeconds = self.totalSeconds % 60;
                
                document.getElementById("minutes").innerHTML = pad(currentMinutes);
                document.getElementById("seconds").innerHTML = pad(currentSeconds);
                document.title = pad(currentMinutes) + ':' + pad(currentSeconds) + ' | Pomodoro Timer';

                if (self.totalSeconds <= 0) {
                    self.handleSessionEnd();
                }
            }, 1000);

            // Auto-play lofi music when timer starts if not already playing
            // IMPORTANT: Browsers block autoplay with sound unless user interacted.
            // We'll try to play, but it might be muted by browser or require a click.
            if (this.lofiPlayer && !this.isLofiPlaying && this.isPlayerReady) {
                // If music was explicitly paused (e.g., by user) and timer starts, play it.
                // If it was paused due to browser autoplay policy, this will attempt to play.
                this.lofiPlayer.playVideo();
                // onPlayerStateChange will update isLofiPlaying
            }
        }
    },

    // Pause Timer (only when user clicks pause button)
    pauseTimer: function () {
        document.getElementById("startbtn").style.display = "inline-block";
        document.getElementById("pausebtn").style.display = "none";
        clearInterval(this.interval);
        this.interval = null; 

        // Explicitly pause lofi music only if the user presses the pause button
        if (this.lofiPlayer && this.isLofiPlaying) { 
            this.lofiPlayer.pauseVideo();
            // The onPlayerStateChange will update Clock.isLofiPlaying to false
        }
    },

    // Reset Timer
    resetTimer: function () {
        // When resetting, we also want to pause the music.
        // So, we'll explicitly call pauseVideo here.
        if (this.lofiPlayer && this.isLofiPlaying) {
            this.lofiPlayer.pauseVideo();
        }
        this.pauseTimer(); // This handles timer interval clear and button display
        this.updateModeDisplay(this.currentMode); 
    },

    // Handle end of a work/break session
    handleSessionEnd: function () {
        clearInterval(this.interval);
        this.interval = null;
        
        // Play bell sound
        bellSound.play().catch(e => console.error("Error playing bell sound:", e)); 

        // Temporarily mute YouTube player for bell sound, then resume
        if (this.lofiPlayer && this.isLofiPlaying) {
            const originalVolume = this.lofiPlayer.getVolume(); // Get current volume
            this.lofiPlayer.setVolume(0); // Set volume to 0
            this.lofiPlayer.mute(); // Explicitly mute the player

            // Set timeout to unmute and restore volume after bell sound finishes
            // Use a default duration if bellSound.duration is not immediately available
            const bellDurationMs = (bellSound.duration && bellSound.duration > 0) ? bellSound.duration * 1000 + 500 : 2500; // bell duration + 0.5s buffer, or 2.5s default

            setTimeout(() => {
                this.lofiPlayer.unMute(); // Unmute
                this.lofiPlayer.setVolume(originalVolume); // Restore original volume
                updateMuteUnmuteIcon(false); // Update icon to show it's unmuted
            }, bellDurationMs);
        }

        // Switch to next mode
        if (this.currentMode === 'work') {
            this.pomodoroCount++;
            if (this.pomodoroCount >= POMODOROS_BEFORE_LONG_BREAK) {
                this.pomodoroCount = 0; // Reset count after long break
                this.switchMode('longBreak');
            } else {
                this.switchMode('shortBreak');
            }
        } else { // It's a break (short or long)
            this.switchMode('work'); // Always go back to work after any break
        }
        this.startTimer(); // Auto-start the next session
    },

    // Switch between Pomodoro modes
    switchMode: function (mode) {
        this.currentMode = mode;
        this.pauseTimer(); // Ensure timer is paused and music stopped/paused

        let duration;
        // Remove 'active' from all mode buttons
        document.querySelectorAll('.pomodoro-btn').forEach(btn => btn.classList.remove('active'));

        switch (mode) {
            case 'work':
                duration = WORK_DURATION;
                document.getElementById('modeWork').classList.add('active');
                break;
            case 'shortBreak':
                duration = SHORT_BREAK_DURATION;
                document.getElementById('modeShortBreak').classList.add('active');
                break;
            case 'longBreak':
                duration = LONG_BREAK_DURATION;
                document.getElementById('modeLongBreak').classList.add('active');
                break;
        }
        this.totalSeconds = duration * 60;
        this.updateDisplay(); // Update display with new mode's time
    },

    // Helper to update display immediately (e.g., after mode switch or reset)
    updateDisplay: function () {
        function pad(val) { return val > 9 ? val : "0" + val; }
        const currentMinutes = Math.floor(this.totalSeconds / 60);
        const currentSeconds = this.totalSeconds % 60;
        document.getElementById("minutes").innerHTML = pad(currentMinutes);
        document.getElementById("seconds").innerHTML = pad(currentSeconds);
    },

    // Method to update mode display (buttons) for initial load or manual reset
    updateModeDisplay: function (mode) {
        document.querySelectorAll('.pomodoro-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`mode${mode.charAt(0).toUpperCase() + mode.slice(1)}`).classList.add('active');
        this.totalSeconds = (mode === 'work' ? WORK_DURATION : mode === 'shortBreak' ? SHORT_BREAK_DURATION : LONG_BREAK_DURATION) * 60;
        this.updateDisplay();
    }
};

// --- Audio for notifications ---
// IMPORTANT: Ensure 'assets/sounds/bell.mp3' file exists!
const bellSound = new Audio('assets/sounds/bell.mp3'); 


// --- Background Image Changer ---
// Randomize image selection
const backgroundImages = [
    "assets/img/bg1.jpg",
    "assets/img/bg2.jpg",
    "assets/img/bg3.jpg",
    "assets/img/bg4.jpg",
    "assets/img/bg5.jpg",
    "assets/img/bg6.jpg",
    "assets/img/bg7.jpg",
    "assets/img/bg8.jpg",
    "assets/img/bg9.jpg",
    "assets/img/bg10.jpg",
    "assets/img/bg11.jpg",
    "assets/img/bg12.jpg",
    "assets/img/bg13.jpg",
    "assets/img/bg14.jpg",
    "assets/img/bg15.jpg",
    "assets/img/bg16.jpg",
    "assets/img/bg17.jpg",
    "assets/img/bg18.jpg",
    "assets/img/bg19.jpg",
    "assets/img/bg20.jpg"
    // Add more image paths here as needed
];

function getRandomBackgroundImage() {
    const randomIndex = Math.floor(Math.random() * backgroundImages.length);
    return backgroundImages[randomIndex];
}

function changeBackgroundImage(imageUrl = getRandomBackgroundImage()) { // Default to random
    const backgroundContainer = document.getElementById('background-container');
    const backgroundImage = document.getElementById('background-image');
    backgroundImage.src = imageUrl; // Set the new image source

    // Ensure the background is visible when a new image is selected
    if (!Clock.isBackgroundVisible) {
        backgroundContainer.classList.remove('hidden');
        Clock.isBackgroundVisible = true;
    }
}


// --- YouTube Lofi Integration ---
var player; 

// Function to update video credit and title from loaded data
function updateVideoInfo(videoId) {
    // Find the video data from Clock.allVideosData
    const info = Clock.allVideosData.find(video => video.id === videoId);
    const videoTitleElement = document.getElementById('video-title');
    const creditElement = document.getElementById('video-credit');

    if (info) {
        videoTitleElement.textContent = info.title;
        if (info.creditUrl) {
            creditElement.innerHTML = `Music by: <a href="${info.creditUrl}" target="_blank" rel="noopener noreferrer">${info.credit}</a>`;
        } else {
            creditElement.textContent = `Music by: ${info.credit}`;
        }
    } else {
        // Fallback for when videoId is not found in loaded data
        videoTitleElement.textContent = 'Lofi Radio'; 
        creditElement.textContent = 'Unknown Artist';
        console.warn(`Video info not found for ID: ${videoId}`);
    }
}


// This function creates an <iframe> (and YouTube player)
// after the API code downloads.
function onYouTubeIframeAPIReady() {
    // Check if videoIds are loaded, if not, load them first
    if (Clock.videoIds.length === 0) {
        console.warn("videoIds not loaded yet. Attempting to load...");
        loadVideoDataAndInitializePlayer();
        return; // Exit to avoid creating player without data
    }

    const initialVideoId = Clock.videoIds[Math.floor(Math.random() * Clock.videoIds.length)];

    player = new YT.Player('player', {
        videoId: initialVideoId,
        playerVars: {
            'autoplay': 0,      // IMPORTANT: Autoplay should be handled by user interaction.
            'controls': 0,      // Hide player controls
            // 'loop': 1,           // This line should be commented out or removed for consistent auto-play next logic
            'playlist': Clock.videoIds.join(','), // This ensures all videos are pre-loaded
            'modestbranding': 1, // Hide YouTube logo
            'fs': 0,            // Disable fullscreen button
            'rel': 0,           // Do not show related videos
            'showinfo': 0,      // Hide video title and uploader info
            'iv_load_policy': 3 // Do not show video annotations
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
    Clock.lofiPlayer = player; // Assign the player object to Clock for global access
}

// The API will call this function when the video player is ready.
function onPlayerReady(event) {
    Clock.isPlayerReady = true; // Set player ready flag

    // Set initial volume from slider value
    const initialVolume = document.getElementById('volumeSlider').value;
    event.target.setVolume(initialVolume);
    updateMuteUnmuteIcon(initialVolume == 0); // Update mute icon if volume is 0

    // Update music info for the initial video
    // Use a timeout to ensure getVideoData is populated
    setTimeout(() => {
        const currentVideoData = event.target.getVideoData();
        if (currentVideoData && currentVideoData.video_id) {
            updateVideoInfo(currentVideoData.video_id);
        } else {
            console.warn("Initial video data not available after ready.");
        }
    }, 200); // Slightly increased delay for data to populate
    
    // Player is paused initially, so ensure play icon is shown
    updatePlayPauseIcon(false); 
}

// The API calls this function when the player's state changes.
function onPlayerStateChange(event) {
    // State 0 (ENDED) - Video ended, play next random
    if (event.data === YT.PlayerState.ENDED) {
        playNextVideo();
        changeBackgroundImage(); // Change background image to a random one
    } 
    // State 1 (PLAYING) - Video is playing
    else if (event.data === YT.PlayerState.PLAYING) {
        updatePlayPauseIcon(true);
        Clock.isLofiPlaying = true;
        
        // Update credit and title every time a new video starts playing
        const currentVideoData = event.target.getVideoData();
        if (currentVideoData && currentVideoData.video_id) {
            updateVideoInfo(currentVideoData.video_id);
            // Also change background image to a random one when a new track starts
            changeBackgroundImage(); 
        } else {
            // Fallback if data isn't immediately available
            console.warn("Video data not immediately available on PLAYING state change.");
            setTimeout(() => {
                const retryVideoData = event.target.getVideoData();
                if (retryVideoData && retryVideoData.video_id) {
                    updateVideoInfo(retryVideoData.video_id);
                    changeBackgroundImage();
                }
            }, 500); // Retry after 500ms
        }
    } 
    // State 2 (PAUSED) - Video is paused
    else if (event.data === YT.PlayerState.PAUSED) {
        updatePlayPauseIcon(false);
        Clock.isLofiPlaying = false;
    }
    // Other states like BUFFERING, CUED might also occur
}

// Function to update the play/pause icon
function updatePlayPauseIcon(isPlaying) {
    const icon = document.getElementById('playPauseIcon');
    if (isPlaying) {
        icon.classList.remove('fa-play');
        icon.classList.add('fa-pause');
    } else {
        icon.classList.remove('fa-pause');
        icon.classList.add('fa-play');
    }
}

// Function to update the mute/unmute icon
function updateMuteUnmuteIcon(isMuted) {
    const icon = document.getElementById('muteUnmuteIcon');
    if (isMuted) {
        icon.classList.remove('fa-volume-up');
        icon.classList.add('fa-volume-mute');
    } else {
        icon.classList.remove('fa-volume-mute');
        icon.classList.add('fa-volume-up');
    }
}

// Event Listeners for Lofi Controls
document.getElementById('playPauseBtn').addEventListener('click', function() {
    if (Clock.lofiPlayer && Clock.isPlayerReady) {
        if (Clock.lofiPlayer.getPlayerState() === YT.PlayerState.PLAYING || Clock.lofiPlayer.getPlayerState() === YT.PlayerState.BUFFERING) {
            Clock.lofiPlayer.pauseVideo();
        } else {
            // When play button is pressed, ensure it's unmuted if it was muted
            if (Clock.lofiPlayer.isMuted()) {
                Clock.lofiPlayer.unMute();
                updateMuteUnmuteIcon(false);
                // Restore slider value if it was 0 due to mute
                document.getElementById('volumeSlider').value = Clock.lofiPlayer.getVolume();
            }
            Clock.lofiPlayer.playVideo();
        }
    } else if (Clock.isPlayerReady === false) {
        console.warn("YouTube Player is not yet ready. Please wait or refresh.");
    }
});

document.getElementById('volumeSlider').addEventListener('input', function() {
    if (Clock.lofiPlayer && Clock.isPlayerReady) {
        const newVolume = this.value;
        Clock.lofiPlayer.setVolume(newVolume);
        updateMuteUnmuteIcon(newVolume == 0);

        // If user drags volume up from 0, unmute
        if (newVolume > 0 && Clock.lofiPlayer.isMuted()) {
            Clock.lofiPlayer.unMute();
            updateMuteUnmuteIcon(false);
        }
    }
});

document.getElementById('muteUnmuteBtn').addEventListener('click', function() {
    if (Clock.lofiPlayer && Clock.isPlayerReady) {
        if (Clock.lofiPlayer.isMuted()) {
            Clock.lofiPlayer.unMute();
            updateMuteUnmuteIcon(false);
            // Restore volume slider to the player's current volume
            document.getElementById('volumeSlider').value = Clock.lofiPlayer.getVolume();
        } else {
            Clock.lofiPlayer.mute();
            updateMuteUnmuteIcon(true);
            document.getElementById('volumeSlider').value = 0; // Set slider to 0 visually
        }
    }
});

function playNextVideo() {
    if (Clock.lofiPlayer && Clock.isPlayerReady && Clock.videoIds.length > 0) {
        const randomIndex = Math.floor(Math.random() * Clock.videoIds.length);
        const newVideoId = Clock.videoIds[randomIndex];
        Clock.lofiPlayer.loadVideoById(newVideoId);
        // Info and background will be updated in onPlayerStateChange when it starts playing
    } else if (Clock.videoIds.length === 0) {
        console.warn("No video IDs loaded to play next.");
    }
}

document.getElementById('nextVideoBtn').addEventListener('click', playNextVideo);


// --- Event Listeners for Timer and Pomodoro Buttons ---
document.getElementById("startbtn").addEventListener("click", function () { Clock.startTimer(); });
document.getElementById("pausebtn").addEventListener("click", function () { Clock.pauseTimer(); });
document.getElementById("resetbtn").addEventListener("click", function () { Clock.resetTimer(); });

// Pomodoro Mode Selection Buttons
document.getElementById('modeWork').addEventListener('click', function() {
    Clock.switchMode('work');
});
document.getElementById('modeShortBreak').addEventListener('click', function() {
    Clock.switchMode('shortBreak');
});
document.getElementById('modeLongBreak').addEventListener('click', function() {
    Clock.switchMode('longBreak');
});


// --- Background Toggle Button ---
const toggleBgBtn = document.getElementById('toggleBgBtn');
const backgroundContainer = document.getElementById('background-container');

toggleBgBtn.addEventListener('click', function() {
    Clock.isBackgroundVisible = !Clock.isBackgroundVisible; // Toggle the state
    if (Clock.isBackgroundVisible) {
        backgroundContainer.classList.remove('hidden');
    } else {
        backgroundContainer.classList.add('hidden');
    }
});

// --- Initial Data Load and Setup ---
// Function to load video data from JSON
async function loadVideoDataAndInitializePlayer() {
    try {
        const response = await fetch('assets/data/videos.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        Clock.allVideosData = data; // Store all video details
        Clock.videoIds = data.map(video => video.id); // Extract only IDs for player

        // Now that data is loaded, try to initialize the YouTube player
        // This makes sure onYouTubeIframeAPIReady is called only after data is ready
        if (typeof YT !== 'undefined' && typeof YT.Player !== 'undefined') {
            onYouTubeIframeAPIReady();
        } else {
            // If YT API not loaded yet, it will call onYouTubeIframeAPIReady when it's ready.
            // But we need to make sure our data is available then.
            // No direct action needed here, as the global onYouTubeIframeAPIReady will access Clock.videoIds
        }
        console.log("Video data loaded:", Clock.allVideosData.length, "videos.");

    } catch (error) {
        console.error("Failed to load video data:", error);
        // Fallback or error message to user
        document.getElementById('video-title').textContent = 'Error loading music.';
        document.getElementById('video-credit').textContent = 'Please check console.';
    }
}


// Initial load: Set default mode to work and update display
$(document).ready(function(){
    Clock.updateModeDisplay('work'); // Set initial mode and display time
    changeBackgroundImage(); // Set initial random background image
    
    // Load video data and then initialize the player
    loadVideoDataAndInitializePlayer();
});