var Clock = {
    totalSeconds: 0,

    // Start Timer
    startTimer: function () {
      if (!this.interval) {
          var self = this;
          function pad(val) { return val > 9 ? val : "0" + val; }
          this.interval = setInterval(function () {
            self.totalSeconds += 1;
            document.getElementById("startbtn").style.display="none";
            document.getElementById("pausebtn").style.display="";
            document.getElementById("minutes").innerHTML = pad(Math.floor(self.totalSeconds / 60 % 60));
            document.getElementById("seconds").innerHTML = pad(parseInt(self.totalSeconds % 60));
            document.title = pad(Math.floor(self.totalSeconds / 60 % 60)) + ':' + pad(parseInt(self.totalSeconds % 60)) + ' | 60mins Timer';
          }, 1000);
      }
    },

    // Reset Timer
    resetTimer: function () {
      Clock.totalSeconds = null; 
      clearInterval(this.interval);
      document.getElementById("startbtn").style.display="";
      document.getElementById("pausebtn").style.display="none";
      document.getElementById("minutes").innerHTML = "00";
      document.getElementById("seconds").innerHTML = "00";
      document.title = "60mins Timer"
      delete this.interval;
    },

    // Pause Timer
    pauseTimer: function () {
      document.getElementById("startbtn").style.display="";
      document.getElementById("pausebtn").style.display="none";
      clearInterval(this.interval);
      delete this.interval;
    },

    // Resume Timer
    resumeTimer: function () {
      this.startTimer();
    },
};
  
// Background Image Changer
$(document).ready(function(){
    var totalCount = 20;
    var num = Math.floor(Math.random() * totalCount) + 1;
    document.body.background = 'assets/img/bg'+num+'.jpg';
    document.body.style.backgroundSize = "cover";
});

document.getElementById("startbtn").addEventListener("click", function () { Clock.startTimer(); });
document.getElementById("pausebtn").addEventListener("click", function () { Clock.pauseTimer(); });
document.getElementById("resumebtn").addEventListener("click", function () { Clock.resumeTimer(); });
document.getElementById("resetbtn").addEventListener("click", function () { Clock.resetTimer(); });