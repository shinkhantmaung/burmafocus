// ... (existing code at the top) ...

const WORK_DURATION = 25;
const SHORT_BREAK_DURATION = 5;
const LONG_BREAK_DURATION = 15;
const POMODOROS_BEFORE_LONG_BREAK = 4;

// UPDATED: Default settings values
const DEFAULT_SETTINGS = {
    theme: 'default', // Changed default theme to 'ghibli'
    notificationsEnabled: true
};

var Clock = {
    totalSeconds: WORK_DURATION * 60,
    interval: null,
    currentMode: 'work',
    pomodoroCount: 0,

    lofiPlayer: null,
    isLofiPlaying: false,
    isPlayerReady: false,
    isBackgroundVisible: true, // Renamed from isBackgroundHidden for clarity
    
    allVideosData: [],
    videoIds: [],

    settings: {},

    requestNotificationPermission: function() {
        if (!("Notification" in window)) {
            console.warn("This browser does not support desktop notification");
        } else if (Notification.permission === "granted") {
            console.log("Notification permission already granted.");
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(function (permission) {
                if (permission === "granted") {
                    console.log("Notification permission granted!");
                    Clock.settings.notificationsEnabled = true;
                    saveSettings();
                } else {
                    console.warn("Notification permission denied.");
                    Clock.settings.notificationsEnabled = false;
                    $('#notification-toggle').prop('checked', false);
                    saveSettings();
                }
            });
        }
    },

    showNotification: function(title, body) {
        if (this.settings.notificationsEnabled && Notification.permission === "granted") {
            const options = {
                body: body,
                icon: 'assets/icon/favicon-32x32.png',
            };
            new Notification(title, options);
        } else if (Notification.permission === "denied") {
            console.warn("Notification permission was denied by user. Cannot show notification.");
        } else if (!this.settings.notificationsEnabled) {
            console.info("Notifications are disabled in settings.");
        } else {
            console.info("Notification permission not yet granted. Requesting...");
            this.requestNotificationPermission(); 
        }
    },

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

            if (this.lofiPlayer && !this.isLofiPlaying && this.isPlayerReady) {
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

        let notificationTitle = "";
        let notificationBody = "";
        
        if (this.currentMode === 'work') {
            this.pomodoroCount++;
            
            notificationTitle = "အလုပ်ချိန် ပြီးပြီ!";
            
            if (this.pomodoroCount >= POMODOROS_BEFORE_LONG_BREAK) {
                notificationBody = `အကြာကြီး နားရအောင်! 🥳 (${this.pomodoroCount}/${POMODOROS_BEFORE_LONG_BREAK})`;
                this.showNotification(notificationTitle, notificationBody); 
                this.pomodoroCount = 0;
                this.switchMode('longBreak');
            } else {
                notificationBody = `ခဏနားရအောင်! 😉 (${this.pomodoroCount}/${POMODOROS_BEFORE_LONG_BREAK})`;
                this.showNotification(notificationTitle, notificationBody);
                this.switchMode('shortBreak');
            }
        } else if (this.currentMode === 'shortBreak') {
            notificationTitle = "နားချိန် ပြီးပြီနော်!";
            notificationBody = "ပြန်စဖို့ အချိန်ရောက်ပြီ။ စကြမလား? 💪";
            this.showNotification(notificationTitle, notificationBody); 
            this.switchMode('work'); 
        } else if (this.currentMode === 'longBreak') {
            notificationTitle = "နားချိန် ပြီးပြီနော်!";
            notificationBody = "အလုပ်တွေ ဆက်လုပ်ဖို့ အချိန်ရောက်ပြီ! 🚀";
            this.showNotification(notificationTitle, notificationBody); 
            this.switchMode('work'); 
        }

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

        this.startTimer();
    },

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

    updateDisplay: function () {
        function pad(val) { return val > 9 ? val : "0" + val; }
        const currentMinutes = Math.floor(this.totalSeconds / 60);
        const currentSeconds = this.totalSeconds % 60;
        document.getElementById("minutes").innerHTML = pad(currentMinutes);
        document.getElementById("seconds").innerHTML = pad(currentSeconds);
    },

    updateModeDisplay: function (mode) {
        document.querySelectorAll('.pomodoro-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`mode${mode.charAt(0).toUpperCase() + mode.slice(1)}`).classList.add('active');
        this.totalSeconds = (mode === 'work' ? WORK_DURATION : mode === 'shortBreak' ? SHORT_BREAK_DURATION : LONG_BREAK_DURATION) * 60;
        this.updateDisplay();
    },

    // UPDATED: Function to apply theme
    applyTheme: function(themeName) {
        // Remove all theme classes first
        $('body').removeClass('theme-default theme-ghibli theme-myanmar theme-blank');
        // Add the selected theme class
        $('body').addClass(`theme-${themeName}`);
        
        // Handle background visibility based on theme (especially for 'blank')
        if (themeName === 'blank') {
            document.getElementById('background-container').style.display = 'none'; // Hide container completely
        } else {
            document.getElementById('background-container').style.display = 'block'; // Show container
            this.isBackgroundVisible = true; // Ensure visibility flag is true
            changeBackgroundImage(themeName); // Change image based on new theme
        }
    },

    loadSettings: function() {
        try {
            const storedSettings = JSON.parse(localStorage.getItem('pomodoroSettings'));
            this.settings = { ...DEFAULT_SETTINGS, ...storedSettings };
        } catch (e) {
            console.error("Error loading settings from localStorage:", e);
            this.settings = { ...DEFAULT_SETTINGS };
        }
        
        this.applyTheme(this.settings.theme);

        $('#notification-toggle').prop('checked', this.settings.notificationsEnabled);
        
        if (this.settings.notificationsEnabled) {
            this.requestNotificationPermission();
        }
    }
};

function saveSettings() {
    localStorage.setItem('pomodoroSettings', JSON.stringify(Clock.settings));
    console.log("Settings saved:", Clock.settings);
}

const bellSound = new Audio('assets/sounds/bell.mp3'); 

// UPDATED: Background Images for each theme
const themeBackgrounds = {
    'default': [
        "assets/img/default/bg1.jpg"
    ],
    'ghibli': [
        "assets/img/ghibli/bg2.jpg", "assets/img/ghibli/bg3.jpg", 
        "assets/img/ghibli/bg4.jpg", "assets/img/ghibli/bg5.jpg", "assets/img/ghibli/bg6.jpg",
        "assets/img/ghibli/bg7.jpg", "assets/img/ghibli/bg8.jpg", "assets/img/ghibli/bg9.jpg",
        "assets/img/ghibli/bg10.jpg", "assets/img/ghibli/bg11.jpg", "assets/img/ghibli/bg12.jpg",
        "assets/img/ghibli/bg13.jpg", "assets/img/ghibli/bg14.jpg", "assets/img/ghibli/bg15.jpg",
        "assets/img/ghibli/bg16.jpg", "assets/img/ghibli/bg17.jpg", "assets/img/ghibli/bg18.jpg",
        "assets/img/ghibli/bg19.jpg", "assets/img/ghibli/bg20.jpg"
    ],
    'myanmar': [
        "assets/img/burma/burma1.jpg", "assets/img/burma/burma2.jpg", "assets/img/burma/burma3.jpg",
        "assets/img/burma/burma4.jpg", "assets/img/burma/burma5.jpg", "assets/img/burma/burma6.jpg"
    ],
    'blank': [] // No images for blank theme
};

// UPDATED: getRandomBackgroundImage function - now accepts a theme or uses current
function getRandomBackgroundImage(theme = Clock.settings.theme) {
    const images = themeBackgrounds[theme];
    if (images && images.length > 0) {
        const randomIndex = Math.floor(Math.random() * images.length);
        return images[randomIndex];
    }
    return ''; // Return empty string for blank or no images
}

// UPDATED: changeBackgroundImage function - now uses the current theme's images
function changeBackgroundImage(theme = Clock.settings.theme) {
    const backgroundContainer = document.getElementById('background-container');
    const backgroundImage = document.getElementById('background-image');

    if (theme === 'blank') {
        backgroundContainer.style.display = 'none'; // Hide container for blank
    } else {
        backgroundContainer.style.display = 'block'; // Show for others
        const imageUrl = getRandomBackgroundImage(theme);
        if (imageUrl) {
            backgroundImage.src = imageUrl;
        } else {
            console.warn(`No background images found for theme: ${theme}`);
            // Fallback to default if no images found for the selected theme
            backgroundImage.src = getRandomBackgroundImage('default');
        }
    }
}

// ... (rest of the YouTube Lofi Integration and Event Listeners remain the same) ...

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
        changeBackgroundImage(Clock.settings.theme); // Pass current theme to get new random image
    } 
    else if (event.data === YT.PlayerState.PLAYING) {
        updatePlayPauseIcon(true);
        Clock.isLofiPlaying = true;
        
        const currentVideoData = event.target.getVideoData();
        if (currentVideoData && currentVideoData.video_id) {
            updateVideoInfo(currentVideoData.video_id);
            changeBackgroundImage(Clock.settings.theme); // Pass current theme
        } else {
            console.warn("Video data not immediately available on PLAYING state change.");
            setTimeout(() => {
                const retryVideoData = event.target.getVideoData();
                if (retryVideoData && retryVideoData.video_id) {
                    updateVideoInfo(retryVideoData.video_id);
                    changeBackgroundImage(Clock.settings.theme); // Pass current theme
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
            Clock.lofiPlayer.mute();
            updateMuteUnmuteIcon(true);
            document.getElementById('volumeSlider').value = 0;
        } else {
            Clock.lofiPlayer.unMute();
            updateMuteUnmuteIcon(false);
            document.getElementById('volumeSlider').value = Clock.lofiPlayer.getVolume();
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

if (toggleBgBtn) {
    toggleBgBtn.addEventListener('click', function() {
        // This toggle button is for visibility of the *current* background, not theme switch
        Clock.isBackgroundVisible = !Clock.isBackgroundVisible;
        if (Clock.isBackgroundVisible) {
            backgroundContainer.classList.remove('hidden');
            backgroundContainer.style.display = 'block';
        } else {
            backgroundContainer.classList.add('hidden');
            backgroundContainer.style.display = 'none';
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


const settingsModal = document.getElementById('settings-modal');
const openSettingsBtn = document.getElementById('settings-btn');
const closeSettingsBtn = document.getElementById('close-settings-modal');
const saveSettingsBtn = document.getElementById('save-settings');
const resetAllSettingsBtn = document.getElementById('reset-all-settings');
const themeRadios = document.querySelectorAll('input[name="theme"]');
const notificationToggle = document.getElementById('notification-toggle');

// Open modal
if (openSettingsBtn) {
    openSettingsBtn.addEventListener('click', function() {
        settingsModal.classList.add('active');
        $(`input[name="theme"][value="${Clock.settings.theme}"]`).prop('checked', true);
        $('#notification-toggle').prop('checked', Clock.settings.notificationsEnabled);
    });
}

// Close modal
if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', function() {
        settingsModal.classList.remove('active');
    });
}

// Save settings
if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', function() {
        const selectedTheme = document.querySelector('input[name="theme"]:checked').value;
        Clock.settings.theme = selectedTheme;
        Clock.applyTheme(selectedTheme); // Apply the new theme immediately

        Clock.settings.notificationsEnabled = notificationToggle.checked;
        if (Clock.settings.notificationsEnabled) {
            Clock.requestNotificationPermission();
        }
        
        saveSettings();
        settingsModal.classList.remove('active');
    });
}

// Reset all settings to default
if (resetAllSettingsBtn) {
    resetAllSettingsBtn.addEventListener('click', function() {
        Clock.settings = { ...DEFAULT_SETTINGS };
        Clock.applyTheme(Clock.settings.theme);
        
        $(`input[name="theme"][value="${Clock.settings.theme}"]`).prop('checked', true);
        $('#notification-toggle').prop('checked', Clock.settings.notificationsEnabled);

        saveSettings();
    });
}


$(document).ready(function(){
    // Initial display and load settings
    Clock.loadSettings(); // This will apply the initial theme and background
    Clock.updateModeDisplay('work'); // This will set the timer to work mode

    loadVideoDataAndInitializePlayer();
});