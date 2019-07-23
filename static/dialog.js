
function DialogSystem() {
    this.current_help_page_index = 0;
    this.help_transitioning = false;
    this.dialog_with_input_is_open = false;
    this.expected_return_loaded = false;
    this.provably_fair_explain_dialog_loaded = false;

    this.init_handlers();
}

DialogSystem.prototype.handle_close = function( dlg ) {
    dlg.parent().trigger('close');

    //  REFACTOR - This is referring to other stuff
    if( dlg.parent().attr('id') == 'withdrawal_dialog') {
        this.dialog_with_input_is_open = false;
    } 
}

DialogSystem.prototype.init_handlers = function() {
    
    var that = this;
    $(".dialog .close_button").click( function() {
        that.handle_close( $(this) );
    });

    $(".topbar_expected_return").click( function() {
        that.show_expected_return_dialog();
    });
    
    $("#control_help").click( function() {
        that.handle_help();
    });
}

DialogSystem.prototype.show_expected_return_dialog = function(onlyLoad=false, callBack=null) {
    var that = this;
    if(!onlyLoad){
        $("#expected_return_dialog").lightbox_me({
            centered: true
        });
    }

    if( !this.expected_return_loaded ) {
    	$.ajax({
    		url: "/ajax_expected_return_dialog"
    	}).done(function(content) { 
            $("#expected_return_dialog").html(content);
            $('#expected_return_dialog').trigger('reposition');
            $("#expected_return_dialog .close_button, #expected_return_dialog .confirm_button").click( function() {
                that.handle_close( $("#expected_return_dialog .close_button") );
            });
            that.expected_return_loaded = true;
            callBack && callBack();
        });
    }
    return false;
}

DialogSystem.prototype.show_generic_dialog = function( title, content ) {
    var that = this;
    
    s = "";
    s += "<div id='generic_dialog' class='dialog'>";
    s += "<div class='close_button'></div>";
    s += "<div>";
    s += "<div style='float:left;'>";
    s += "<img src='/static/images/logo_48.png' alt='Bitcoin video casino logo' />";
    s += "</div>";
    s += "<div class='title'>";
    s += title;
    s += "</div>";
    s += "<div style='clear:both;'></div>";
    s += "</div>";
    s += "<br/>";
    
    s += content;
    
    s += "</div>";
    
    $("#generic_dialog").remove();
    $("body").append(s);
    
    $('.dialog').trigger('close');
    $('#generic_dialog').lightbox_me({
        centered: true
    }); 
    
    $("#generic_dialog .close_button").click( function() {
        that.handle_close( $(this) );
    });
}

DialogSystem.prototype.init_help = function( help_images ) {
    var that = this;
    
    s = "";
    s += "<div id='help_dialog' class='dialog'>";
    s += "<div class='close_button'></div>";
    s += "<div>";
    s += "<div id='help_image_container_parent'>";
    for( var i = 0; i < help_images.length; i++ ) {
        var ontext = i == 0 ? "on" : "";

        s += "<div id='help_image_container" + i + "' class='help_image_container " + ontext + "'>";
        if( help_images[i][0] != "#" ) {
            s += "<img src='/static/images/loading_spinner_white.gif' delayed_src='" + help_images[i] + "' class='help_image' alt='help page' />";
        }
        else {
            // Div content instead of a single image
            s += $( help_images[i] ).html();
            $( help_images[i] ).remove();
        } 
        s += "</div>"; 
    } 
    s += "</div>";
    s += "<div id='help_page_buttons_container'>";
    s += "<div id='help_page_buttons'>";
    for( var i = 0; i < help_images.length; i++ ) {
        var ontext = i == 0 ? "on" : "";
        s += "<div id='help_button_page" + i + "' class='help_button_page " + ontext + "'></div>"; 
    }
    s += "</div></div></div></div>";
    
    $("body").append(s);
    
    $(".help_button_page").click(function() {
        var idx = parseInt($(this).attr('id').substring(16));
        if(that.help_transitioning) return;
        if(that.current_help_page_index == idx) return;
        that.transition_help_pages(that.current_help_page_index, idx);
    });
    
    $("#help_dialog .close_button").click( function() {
        that.handle_close( $(this) );
    });

    if( help_images.length <= 1 ) {
        $(".help_button_page").css('display', 'none');
    }
}

DialogSystem.prototype.handle_help = function(page) {
    var that = this;
    page = page || 0;

    //  - Only load the help images once the user actually pushes the help button
    $("#help_dialog img").each( function() {
        $(this).attr("src", $(this).attr("delayed_src") ); 
    });
     
    this.transition_help_pages(that.current_help_page_index, page, true);

    $("#help_dialog").lightbox_me({
        centered: true,
        onLoad: function() {
            //  - This causes the buttons to wiggle when the dialog appears. What was this for?
            /*
            var innerWidth = $("#help_dialog").innerWidth();
            var paddingLeft = $("#help_dialog").css("padding-left").replace('px','');
            $("#help_page_buttons_container").css('width', innerWidth - (paddingLeft*2));
            */
        }
    }); 
    $("#help_dialog").css("width","800px");
}


DialogSystem.prototype.transition_help_pages = function(old_help_page_index, new_help_page_index, fast) {
    var that = this;
    fast = fast || false;
    that.help_transitioning = true;

    $(".help_button_page").removeClass("on");
    $("#help_button_page" + new_help_page_index).addClass("on");
    
    if(!fast) { 
        $("#help_image_container" + old_help_page_index).animate({
            opacity: 0
        }, 500);
        
        $("#help_image_container" + new_help_page_index).animate({
            opacity: 1
        }, 500, function() {
            that.current_help_page_index = new_help_page_index;
            that.help_transitioning = false; 
        });
    } else {
        $("#help_image_container" + old_help_page_index).css("opacity", "0");
        $("#help_image_container" + new_help_page_index).css("opacity", "1.0");
        that.current_help_page_index = new_help_page_index;
        that.help_transitioning = false;
    }
}

DialogSystem.prototype.show_user_info_dialog = function( public_id, player_ident ) { 

    //  TEMP - Disable this for now since it's trashing the database for big accounts
    //  - Show this info for yourself only?
    return;

    // Set the player name right away...
    if( player_ident != undefined && player_ident != null ) {
        $("#user_info_player_ident").html( player_ident );
    }

    $("#user_info_data_screen").hide();
    $("#user_info_connecting_screen").show();
    $('#user_info_dialog').lightbox_me({
        centered: true, 
        onLoad: function() { 
        }
    }); 
    
	$.ajax({
		url: "/playerstats?public_id=" + public_id
	}).done(function(player_stats_response) { 
	    if( player_stats_response['status'] == 'error' || player_stats_response['error'] == "user has no stats" ) {
	        alert("This user does not yet have any stats.");
	        return;
	    }
	    
        $("#user_info_player_ident").html( player_stats_response['player_ident'] );
        $("#user_info_leaderboard_rank").html( player_stats_response['leaderboard_rank'] );
        $("#user_info_total_winnings").html( Bitcoin.int_amount_to_string(player_stats_response['total_winnings']) + " BTC" );
        $("#user_info_biggest_win").html( Bitcoin.int_amount_to_string(player_stats_response['biggest_win']) + " BTC" );
        
        var best_hands = player_stats_response['best_hands'];
        console.log(player_stats_response);
        
        $("#user_info_videopoker_games_played").html( player_stats_response['videopoker_games_played'] );
        $("#user_info_blackjack_games_played").html( player_stats_response['blackjack_games_played'] );
        $("#user_info_roulette_games_played").html( player_stats_response['roulette_games_played'] );
        $("#user_info_craps_games_played").html( player_stats_response['craps_games_played'] );
        $("#user_info_keno_games_played").html( player_stats_response['keno_games_played'] );
        $("#user_info_slots_games_played").html( player_stats_response['slots_games_played'] );
        $("#user_info_dice_games_played").html( player_stats_response['dice_games_played'] );

        $("#user_info_double_downs").html( player_stats_response['double_downs'] );
        $("#user_info_roulette_hits").html( player_stats_response['roulette_hits'] );
        $("#user_info_craps_longest_streak").html( player_stats_response['craps_longest_streak'] );

        if( player_stats_response['keno_best_hit'] == null ) {
            $("#user_info_keno_best_hit").html( "None" );
        } else {
            $("#user_info_keno_best_hit").html( player_stats_response['keno_best_hit'] + " Number" + ((player_stats_response['keno_best_hit'] == 1) ? '' : 's') );
        }

        if( player_stats_response['slots_highest_num_lines_won'] == null ) {
            $("#user_info_slots_highest_number_of_lines").html( "None" );
        } else {
            $("#user_info_slots_highest_number_of_lines").html( player_stats_response['slots_highest_num_lines_won'] + " line" + ((player_stats_response['slots_highest_num_lines_won'] == 1) ? '' : 's') );
        }

        if( player_stats_response['dice_biggest_win'] == null ) {
            $("#user_info_dice_biggest_win").html( "None" );
        } else {
            $("#user_info_dice_biggest_win").html( Bitcoin.int_amount_to_string(player_stats_response['dice_biggest_win']) + " BTC" );
        }

        if( player_stats_response['dice_most_rare_win'] == null ) {
            $("#user_info_dice_most_rare_win").html( "None" );
        } else {
            $("#user_info_dice_most_rare_win").html( player_stats_response['dice_most_rare_win']/10000.0 + "%" );
        }
         
        var s = "";
        for( var i = 0; i < best_hands.length; i++ ) {
            var pt = best_hands[i]['paytable'];
            if( pt == null ) {
                continue; 
            }
            var poker_game = poker_games[pt];
            s += "<div>";
            s += "<div class='stat_name'>";
            s += "Best " + poker_game.name;
            s += "</div>";
            s += "<div class='stat_value'>";
            s += poker_game.get_hand_eval_name( best_hands[i]['best_hand'] );
            s += "</div>";
            s += "<div style='clear:both;'></div>";
            s += "</div>";
        }
        $("#best_hands_container").html( s );
        
        $("#user_info_blackjacks").html( player_stats_response['blackjacks'] );
        $("#user_info_best_blackjack_progressive_hand").html( Blackjack.get_progressive_hand_name(player_stats_response['best_blackjack_progressive_hand']) );
        $("#user_info_best_roulette_progressive_hand").html( Roulette.get_progressive_hand_name(player_stats_response['best_roulette_progressive_hand']) );
        $("#user_info_best_craps_progressive_hand").html( Craps.get_progressive_hand_name(player_stats_response['best_craps_progressive_hand']) );
        
        $("#user_info_data_screen").show();
        $("#user_info_connecting_screen").hide(); 
        
        // Resize everything
        $('#user_info_dialog').trigger('reposition');
	});
	
    //  - Ajax spinner while waiting for values 
}

DialogSystem.prototype.show_provably_fair_explain_dialog = function(game_name, onlyLoad=false, callBack=null) {
    var that = this;
    // The provably fair technical dialog could be up
    $('.dialog').trigger('close');
    if(!onlyLoad){
        $('#provably_fair_explain_dialog').lightbox_me({
            centered: true
        }); 
    }

    if( !this.provably_fair_explain_dialog_loaded ) {
    	$.ajax({
    		url: "/ajax_provably_fair_explain_dialog?game_name=" + game_name
    	}).done(function(content) { 
            $("#provably_fair_explain_dialog").html(content);
            $('#provably_fair_explain_dialog').trigger('reposition');
            $("#provably_fair_explain_dialog .close_button, #provably_fair_explain_dialog .confirm_button").click( function() {
                $('.dialog').trigger('close');
            });
            that.provably_fair_explain_dialog_loaded = true;
            callBack && callBack();
        });
    }
}
