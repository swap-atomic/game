function SoundSystem( sound_volume ) {
    this.init_handlers();
    this.sounds = {};
    
    //  - This is kind of lame
    this.rotating_index = {};
    this.rotating_size = {};
    
    // this.sound_volume = 0.7;
    this.sound_volume = 0.7;
    if( sound_volume == 0 ) {
        this.sound_volume = 0;
    }
    this.sound_volume_remembered = 0.7;
    this.hovering_control_sound = false;
    this.hovering_control_volume = false;
    this.volume_control_mousedown = false;
    this.volume_control_pagex = 0;
    this.sound_broken = false;
}

SoundSystem.prototype.create_sound = function( sound_name, folder, sound_filename, multishot ) {
    var s = soundManager.createSound({ 
        id: sound_name,
        url: folder + sound_filename,
        autoLoad:true,
        multiShot: multishot
    }); 
    this.sounds[ sound_name ] = s;
}

// sound_list = [ [sound_name, sound_filename, multishot, num_rotating], ]
SoundSystem.prototype.load_sounds = function( folder, sound_list ) {
    //  - No sounds on mobile since the delay is horrible, and most sounds don't play
    if( isMobile.any() ) {
        return;
    }

    // Chrome: WAV OK, MP3 plays but it's very delayed!
    // IE9: WAV BAD, MP3 plays but it's a litle delayed, OGG BAD
    // Firefox: (must install flash for sound to work) WAV OK.
    var that = this;

    soundManager.setup({
        url: '/static/soundmanager/swf/',
        useHighPerformance:true,
        useFastPolling:true,
        preferFlash: false,
        flashVersion: 9,
        debugMode: false,
        useHTML5Audio: true, 
        onready: function() {
            for( var i = 0; i < sound_list.length; i++ ) {
                var name = sound_list[i][0];
                var filename = sound_list[i][1];
                var multishot = sound_list[i][2];
                var num_rotating = sound_list[i][3]; 
                
                if( num_rotating > 1 ) {
                    for( var rotating_idx = 0; rotating_idx < num_rotating; rotating_idx++ ) {
                        that.create_sound( name + rotating_idx, folder, filename, multishot );
                    }
                    that.rotating_size[ name ] = num_rotating;
                    that.rotating_index[ name ] = 0;
                }
                else {
                    that.create_sound( name, folder, filename, multishot );
                }
            }
        },
        ontimeout: function() {
    		$("#control_sound").addClass("off");
            that.sound_broken = true;
        }
    });    
    
}


SoundSystem.prototype.init_handlers = function() {

    var that = this;
    
    //$("#control_sound").click( function() {
    $("#topbar_sound, #sound-toggle-btn").click( function() {
        if( that.sound_broken ) {
            alert("Error initializing sound. To listen to sound effects, please install Flash.");
            return;
        }
        
        if( that.sound_volume == 0 ) {
            that.set_volume( that.sound_volume_remembered, false );
        }
        else {
            that.set_volume( 0, false );
        }

        // Tell server!
    	$.ajax({
    		url: "account/set_sound_volume?sound_volume=" + Math.floor(that.sound_volume*100)
    	}).done(function(withdrawal_result) { 
    	    // Do nothing
    	});
            
    });
    
    //  - This line will prevent chrome from displaying a text cursor when you click-drag the volume slider
    document.onselectstart = function() {
        if( that.hovering_control_sound || that.hovering_control_volume || that.volume_control_mousedown ) {
            //returning false tells the browser to keep trying, so we have to return false as long as the mouse cursor is down (from the volume control)
            return false;
        }
        return true;
    };

    $("#control_volume").mousedown( function(e) {
        //  - Not entirely sure why this line stopped working when we did the rebranding...
        // Oh well, the line below seems to work OK.
        //var x = e.pageX - this.offsetLeft;
        var x = e.pageX - $("#control_volume").parent().offset().left - 42;
        // Subtract 10 because we are offsetting everything 10 pixels to pad the sound button
        var vol = (x-10.0) / 50.0;
        that.volume_control_pagex = e.pageX - x;
        that.volume_control_mousedown = true;
        that.set_volume(vol, true);
    });
    
    //$("#control_volume").mousemove( function(e) {
    $("body").mousemove( function(e) {
        if( !that.volume_control_mousedown ) {
            return;
        }
        
        var x = e.pageX - that.volume_control_pagex;
        // Subtract 10 because we are offsetting everything 10 pixels to pad the sound button
        var vol = (x-10.0) / 50.0;
        that.set_volume(vol, true);
    });
    $("body").mouseup( function(e) {
        if( !that.volume_control_mousedown ) {
            return;
        }

        that.volume_control_mousedown = false;
        that.update_volume_visibility();
    });
    
    $("#control_volume").mouseenter( function() {
        that.hovering_control_volume = true; 
        that.update_volume_visibility();
    });
    $("#control_volume").mouseleave( function() {
        that.hovering_control_volume = false; 
        if( !that.volume_control_mousedown ) {
            that.update_volume_visibility();
        }
    });
    $("#control_sound").mouseenter( function() {
        that.hovering_control_sound = true;
        that.update_volume_visibility();
    });
    $("#control_sound").mouseleave( function() {
        that.hovering_control_sound = false;
        if( !that.volume_control_mousedown ) {
            that.update_volume_visibility();
        }
    });
    

}

SoundSystem.prototype.set_volume = function( vol, remember )
{
	//$("#control_sound").removeClass();
	$("#topbar_sound").removeClass("off");
	
    this.sound_volume = vol;
    if( this.sound_volume <= 0 ) {
        this.sound_volume = 0;
		//$("#control_sound").addClass("off");
		$("#topbar_sound").addClass("off");
    }
    else if( this.sound_volume > 1) {
        this.sound_volume = 1;
    }
    
    // Remember the last positive value. When you hit mute, the volume slider should jump to 0.
    // However, when you hit mute again, the volume needs to jump back to where it was before.
    if( remember ) {
        this.sound_volume_remembered = this.sound_volume;
    }
    
    $("#volume_knob").css("left", ((this.sound_volume * 50)+10) + "px"); 
    $("#volume_redbar").css("width", (this.sound_volume * 50) + "px"); 
}

SoundSystem.prototype.update_volume_visibility = function()
{
    var that = this;
    if( this.hovering_control_sound || this.hovering_control_volume ) {
        $("#control_volume").animate({opacity:1}, 100);
    }
    else {
		window.setTimeout(function() { 
		    if( !that.hovering_control_sound && !that.hovering_control_volume && !that.volume_control_mousedown ) {
                $("#control_volume").animate({opacity:0}, 300);
            }
        }, 750);
        
    }
}

SoundSystem.prototype.play_sound = function( sound_name ) {
    //  - No sounds on mobile since the delay is horrible, and most sounds don't play
    if( isMobile.any() ) {
        return;
    }

    var sound = this.sounds[sound_name];
    
    //  - This could happen if the sound did not load properly (flash not installed, for example)
    if( sound == undefined ) {
        return;
    }
    
    if( this.sound_volume > 0 ) {
        sound.play( {volume:this.sound_volume*100} );
    } 
}
SoundSystem.prototype.play_rotating = function( sound_name ) {
    this.rotating_index[ sound_name ] = (this.rotating_index[ sound_name ] + 1) % this.rotating_size[ sound_name ];
    this.play_sound( sound_name + this.rotating_index[ sound_name ] ); 
}
