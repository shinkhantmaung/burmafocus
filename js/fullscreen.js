/* Get the documentElement (<html>) to display the page in fullscreen */
var elem = document.documentElement;

/* View in fullscreen */
function openFullscreen() {
    if (elem.requestFullscreen) {
    elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) { /* Safari */
    elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE11 */
    elem.msRequestFullscreen();
    }
    document.getElementById("openbtn").style.display="none";
    document.getElementById("closebtn").style.display="";
}

/* Close fullscreen */
function closeFullscreen() {
    if (document.exitFullscreen) {
    document.exitFullscreen();
    } else if (document.webkitExitFullscreen) { /* Safari */
    document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { /* IE11 */
    document.msExitFullscreen();
    }
    document.getElementById("openbtn").style.display="";
    document.getElementById("closebtn").style.display="none";
}