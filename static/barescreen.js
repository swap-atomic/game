var is_inside_barescreen_container = false;
var barescreen_image_full_opacity = 0.75;
var barescreen_image_opacity_speed = 100;
var barescreen_image_opacity = 0.5;
var barescreen_enabled = false;
var barescreen_showhide_animation_speed = 1000;

function BarescreenSystem() {
    this.init_handlers();
    this.changing = false;
}

BarescreenSystem.prototype.init_handlers = function() {
    var that = this;

    /*
    $("#barescreen_container").mouseenter(function(){
        is_inside_barescreen_container = true;
        barescreen_image_opacity = barescreen_image_full_opacity;
        $("#barescreen_image").css("opacity", '' + barescreen_image_opacity);
    });

    $("#barescreen_container").mouseleave(function(){
        var stepFadeout = function() {
            //  - If the user returned to the barescreen container while it was fading out,
            // it needs to stop this fading stuff.
            if( is_inside_barescreen_container ) {
                return;
            }
            barescreen_image_opacity -= 0.05;
            if( barescreen_image_opacity < 0.05 ) {
                barescreen_image_opacity = 0.05;
            } else {
                setTimeout(stepFadeout, barescreen_image_opacity_speed);
            }
            $("#barescreen_image").css("opacity", '' + barescreen_image_opacity);
        };
        barescreen_image_opacity = barescreen_image_full_opacity;
        $("#barescreen_image").css("opacity", '' + barescreen_image_opacity);
        setTimeout(stepFadeout, barescreen_image_opacity_speed);
        is_inside_barescreen_container = false;
    });
    */
    
    $("#barescreen_container, #topbar_barescreen").click(function(){
    //$("#topbar_barescreen").click(function(){
        
        if( that.changing ) return;
        that.changing = true;

        if( barescreen_enabled ) {
            $("#ultra_container").removeClass("barescreen");
            $("#center_outer_alley_contents").removeClass("barescreen").addClass("topbar_height_offset");
            $("#outer_alley_contents").removeClass("barescreen");
            $("#alley_contents").removeClass("barescreen");
            $("#gamearea_bordered").removeClass("barescreen");
            $("#main_centering_div").removeClass("barescreen");

            //!$("#statstab_container").fadeIn(barescreen_showhide_animation_speed);
            //!$("#statspage_container").fadeIn(barescreen_showhide_animation_speed);
            //!$(".main_left").fadeIn(barescreen_showhide_animation_speed);
            //!$(".main_right").fadeIn(barescreen_showhide_animation_speed);
            //!$("#footer_container").fadeIn(barescreen_showhide_animation_speed);
            //!$("#control_help").fadeIn(barescreen_showhide_animation_speed);
            //!$("#main_centering_div").removeClass("barescreen");
            //!$(".main_container").removeClass("barescreen");
            //!$(".main_center").removeClass("barescreen");
            $("#outer_stats_container").fadeIn(barescreen_showhide_animation_speed);
            $("#footer_container").fadeIn(barescreen_showhide_animation_speed);
            $("#main_game_right").fadeIn(barescreen_showhide_animation_speed);
            $("#title_container").fadeIn(barescreen_showhide_animation_speed);
            $("#gameselect_container_out").fadeIn(barescreen_showhide_animation_speed);
            $("#topbar").fadeIn(barescreen_showhide_animation_speed);
            $("#topbar_dim_stretch").fadeIn(barescreen_showhide_animation_speed);
            $("body").removeClass("game_background_color");

            $("#account_container").show();
            $("#account_container").animate({opacity:"1.0"}, barescreen_showhide_animation_speed);

            $("#barescreen_container").hide();
            $("#ultra_container").css( {'background-image': ''} )

            that.changing = false;
        } else {
            $("#outer_stats_container").fadeOut(barescreen_showhide_animation_speed);
            $("#footer_container").fadeOut(barescreen_showhide_animation_speed);
            $("#main_game_right").fadeOut(barescreen_showhide_animation_speed);
            $("#title_container").fadeOut(barescreen_showhide_animation_speed);
            $("#gameselect_container_out").fadeOut(barescreen_showhide_animation_speed);
            $("#topbar").fadeOut(barescreen_showhide_animation_speed);
            $("#topbar_dim_stretch").fadeOut(barescreen_showhide_animation_speed);
            $("body").addClass("game_background_color");

            $("#account_container").animate({opacity:"0.0"}, barescreen_showhide_animation_speed, function() {
                $("#ultra_container").addClass("barescreen");
                $("#center_outer_alley_contents").addClass("barescreen").removeClass("topbar_height_offset");
                $("#outer_alley_contents").addClass("barescreen");
                $("#alley_contents").addClass("barescreen");
                $("#gamearea_bordered").addClass("barescreen");
                $("#main_centering_div").addClass("barescreen");
            });

            $("#ultra_container").css( {'background-image': 'none'} )
            $("#barescreen_container").show();
            that.changing = false;
        }
        barescreen_enabled = !barescreen_enabled;
    });
    

}

BarescreenSystem.prototype.foo = function() {

}
