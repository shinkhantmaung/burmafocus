const WORK_DURATION = 25;
const SHORT_BREAK_DURATION = 5;
const LONG_BREAK_DURATION = 15;
const POMODOROS_BEFORE_LONG_BREAK = 4;

var Clock = {
    totalSeconds: WORK_DURATION * 60,
    interval: null,
    currentMode: 'work',
    pomodoroCount: 0,

    lofiPlayer: null,
    isLofiPlaying: false,
    isPlayerReady: false,
    isBackgroundVisible: true,
    
    allVideosData: [],
    videoIds: [],

    startTimer: function () {
        if (!this.interval && this.totalSeconds > 0) {
            var self = this;
            function pad(val) { return val > 9 ? val : "0" + val; }

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
            }
        }
    },

    pauseTimer: function () {
        document.getElementById("startbtn").style.display = "inline-block";
        document.getElementById("pausebtn").style.display = "none";
        clearInterval(this.interval);
        this.interval = null; 

        if (this.lofiPlayer && this.isLofiPlaying) { 
            this.lofiPlayer.pauseVideo();
        }
    },
    //Reset Timer
    resetTimer: function () {
        if (this.lofiPlayer && this.isLofiPlaying) {
            this.lofiPlayer.pauseVideo();
        }
        this.pauseTimer();
        this.updateModeDisplay(this.currentMode); 
    },

    handleSessionEnd: function () {
        clearInterval(this.interval);
        this.interval = null;
        
        bellSound.play().catch(e => console.error("Error playing bell sound:", e)); 

        if (this.lofiPlayer && this.isLofiPlaying) {
            const originalVolume = this.lofiPlayer.getVolume();
            this.lofiPlayer.setVolume(0);
            this.lofiPlayer.mute();

            const bellDurationMs = (bellSound.duration && bellSound.duration > 0) ? bellSound.duration * 1000 + 500 : 2500;

            setTimeout(() => {
                this.lofiPlayer.unMute();
                this.lofiPlayer.setVolume(originalVolume);
                updateMuteUnmuteIcon(false);
            }, bellDurationMs);
        }

        if (this.currentMode === 'work') {
            this.pomodoroCount++;
            if (this.pomodoroCount >= POMODOROS_BEFORE_LONG_BREAK) {
                this.pomodoroCount = 0;
                this.switchMode('longBreak');
            } else {
                this.switchMode('shortBreak');
            }
        } else {
            this.switchMode('work');
        }
        this.startTimer();
    },
    // Switch between Pomodoro modes

    switchMode: function (mode) {
        this.currentMode = mode;
        this.pauseTimer();

        let duration;
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
        this.updateDisplay();
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

const backgroundImages = [
    "assets/img/bg1.jpg", "assets/img/bg2.jpg", "assets/img/bg3.jpg", "assets/img/bg4.jpg",
    "assets/img/bg5.jpg", "assets/img/bg6.jpg", "assets/img/bg7.jpg", "assets/img/bg8.jpg",
    "assets/img/bg9.jpg", "assets/img/bg10.jpg", "assets/img/bg11.jpg", "assets/img/bg12.jpg",
    "assets/img/bg13.jpg", "assets/img/bg14.jpg", "assets/img/bg15.jpg", "assets/img/bg16.jpg",
    "assets/img/bg17.jpg", "assets/img/bg18.jpg", "assets/img/bg19.jpg", "assets/img/bg20.jpg"
];

function getRandomBackgroundImage() {
    const randomIndex = Math.floor(Math.random() * backgroundImages.length);
    return backgroundImages[randomIndex];
}

function changeBackgroundImage(imageUrl = getRandomBackgroundImage()) {
    const backgroundContainer = document.getElementById('background-container');
    const backgroundImage = document.getElementById('background-image');
    backgroundImage.src = imageUrl;

    if (!Clock.isBackgroundVisible) {
        backgroundContainer.classList.remove('hidden');
        Clock.isBackgroundVisible = true;
    }
}

// --- YouTube Lofi Integration ---
var player; 

// Function to update video credit and title from loaded data
function updateVideoInfo(videoId) {
    const info = Clock.allVideosData.find(video => video.id === videoId);
    const videoTitleElement = document.getElementById('video-title');
    const creditElement = document.getElementById('video-credit');

    if (info) {
        videoTitleElement.textContent = info.title;
        if (info.creditUrl) {
            creditElement.innerHTML = `<a href="${info.creditUrl}" target="_blank" rel="noopener noreferrer">${info.credit}</a>`;
        } else {
            creditElement.textContent = `${info.credit}`;
        }
    } else {
        videoTitleElement.textContent = 'Lofi Radio'; 
        creditElement.textContent = 'Unknown Artist';
        console.warn(`Video info not found for ID: ${videoId}`);
    }
}

// This function creates an <iframe> (and YouTube player)
// after the API code downloads.
function onYouTubeIframeAPIReady() {
    if (Clock.videoIds.length === 0) {
        console.warn("videoIds not loaded yet. Attempting to load...");
        loadVideoDataAndInitializePlayer();
        return;
    }

    const initialVideoId = Clock.videoIds[Math.floor(Math.random() * Clock.videoIds.length)];

    player = new YT.Player('player', {
        videoId: initialVideoId,
        playerVars: {
            'autoplay': 0,
            'controls': 0,
            'playlist': Clock.videoIds.join(','),
            'modestbranding': 1,
            'fs': 0,
            'rel': 0,
            'showinfo': 0,
            'iv_load_policy': 3
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
    Clock.lofiPlayer = player;
}

// The API will call this function when the video player is ready.
function onPlayerReady(event) {
    Clock.isPlayerReady = true;

    const initialVolume = document.getElementById('volumeSlider').value;
    event.target.setVolume(initialVolume);
    updateMuteUnmuteIcon(initialVolume == 0);

    setTimeout(() => {
        const currentVideoData = event.target.getVideoData();
        if (currentVideoData && currentVideoData.video_id) {
            updateVideoInfo(currentVideoData.video_id);
        } else {
            console.warn("Initial video data not available after ready.");
        }
    }, 200);
    
    updatePlayPauseIcon(false); 
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        playNextVideo();
        changeBackgroundImage();
    } 
    else if (event.data === YT.PlayerState.PLAYING) {
        updatePlayPauseIcon(true);
        Clock.isLofiPlaying = true;
        
        const currentVideoData = event.target.getVideoData();
        if (currentVideoData && currentVideoData.video_id) {
            updateVideoInfo(currentVideoData.video_id);
            changeBackgroundImage(); 
        } else {
            console.warn("Video data not immediately available on PLAYING state change.");
            setTimeout(() => {
                const retryVideoData = event.target.getVideoData();
                if (retryVideoData && retryVideoData.video_id) {
                    updateVideoInfo(retryVideoData.video_id);
                    changeBackgroundImage();
                }
            }, 500);
        }
    } 
    else if (event.data === YT.PlayerState.PAUSED) {
        updatePlayPauseIcon(false);
        Clock.isLofiPlaying = false;
    }
}

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
            if (Clock.lofiPlayer.isMuted()) {
                Clock.lofiPlayer.unMute();
                updateMuteUnmuteIcon(false);
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
            document.getElementById('volumeSlider').value = Clock.lofiPlayer.getVolume();
        } else {
            Clock.lofiPlayer.mute();
            updateMuteUnmuteIcon(true);
            document.getElementById('volumeSlider').value = 0;
        }
    }
});

function playNextVideo() {
    if (Clock.lofiPlayer && Clock.isPlayerReady && Clock.videoIds.length > 0) {
        const randomIndex = Math.floor(Math.random() * Clock.videoIds.length);
        const newVideoId = Clock.videoIds[randomIndex];
        Clock.lofiPlayer.loadVideoById(newVideoId);
    } else if (Clock.videoIds.length === 0) {
        console.warn("No video IDs loaded to play next.");
    }
}

document.getElementById('nextVideoBtn').addEventListener('click', playNextVideo);

document.getElementById("startbtn").addEventListener("click", function () { Clock.startTimer(); });
document.getElementById("pausebtn").addEventListener("click", function () { Clock.pauseTimer(); });
document.getElementById("resetbtn").addEventListener("click", function () { Clock.resetTimer(); });

document.getElementById('modeWork').addEventListener('click', function() {
    Clock.switchMode('work');
});
document.getElementById('modeShortBreak').addEventListener('click', function() {
    Clock.switchMode('shortBreak');
});
document.getElementById('modeLongBreak').addEventListener('click', function() {
    Clock.switchMode('longBreak');
});

const toggleBgBtn = document.getElementById('toggleBgBtn');
const backgroundContainer = document.getElementById('background-container');

// Only add event listener if the toggle button exists
if (toggleBgBtn) {
    toggleBgBtn.addEventListener('click', function() {
        Clock.isBackgroundVisible = !Clock.isBackgroundVisible;
        if (Clock.isBackgroundVisible) {
            backgroundContainer.classList.remove('hidden');
        } else {
            backgroundContainer.classList.add('hidden');
        }
    });
}


async function loadVideoDataAndInitializePlayer() {
    try {
        const response = await fetch('assets/data/videos.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        Clock.allVideosData = data;
        Clock.videoIds = data.map(video => video.id);

        if (typeof YT !== 'undefined' && typeof YT.Player !== 'undefined') {
            onYouTubeIframeAPIReady();
        }
        console.log("Video data loaded:", Clock.allVideosData.length, "videos.");

    } catch (error) {
        console.error("Failed to load video data:", error);
        document.getElementById('video-title').textContent = 'Error loading music.';
        document.getElementById('video-credit').textContent = 'Please check console.';
    }
}

$(document).ready(function(){
    Clock.updateModeDisplay('work');
    changeBackgroundImage();
    
    loadVideoDataAndInitializePlayer();
});