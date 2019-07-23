var currentScreenshot = 0;
var NUM_SCREENSHOTS = 7;
var FADE_DELAY = 3000;

$(document).ready(function() {

    function nextScreenshot() {
        $("#img" + currentScreenshot).fadeOut('fast', function() {
            // yo
        });
        currentScreenshot += 1;
        currentScreenshot = currentScreenshot % NUM_SCREENSHOTS;
        $("#img"+currentScreenshot).fadeIn('fast', function() {
            // dawg
        });

        window.setTimeout( function() {
            nextScreenshot();
        }, FADE_DELAY );
    }

    window.setTimeout( function() {
        nextScreenshot();
    }, FADE_DELAY );

});