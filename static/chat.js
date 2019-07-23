var MESSAGE_UPDATE_TIME_SPACE = 2*60;

//  - Must match what is defined in ChatRequest.
//  - System message? Specially colored?
var COMMAND_TALK = 0;
var COMMAND_ENTER = 1;
var COMMAND_EXIT = 2;
var COMMAND_RENAME = 3;

function ChatSystem() {
    var that = this;
    $("#chat_input").keydown(function (e) {
        if (e.keyCode == 13) {
            that.send_message();
        }
    }).focus(function() {
        that.focused = true;   
    }).blur(function() {
        that.focused = false;   
    });

    this.last_message_timestamp = 0;
    this.num_lines = 0;
    this.users = [];
    this.last_chatlog_index = -1;
    this.last_happy_message_timestamp = 0;
    
    $("ul#chat_tabs li").click( function() {
        id = $(this).attr("id");
        idx = id.charAt( id.length-1 );
        $("ul#chat_tabs li").removeClass("selected");
        $(this).addClass("selected");
        $(".chat_page").removeClass("selected");
        $("#chat_page" + idx).addClass("selected");
        
        if( idx == 0 ) {
            $("#chat_input").css({ opacity: 1.0 });
        }
        else {
            $("#chat_input").css({ opacity: 0.0 });
        }
        
        $('#chat_page0').scrollTop($('#chat_page0')[0].scrollHeight);
        $('#chat_page0').trigger('resize');
        return false;
    });
    
    this.update_chat_users();
}

ChatSystem.MESSAGE_EXCITING = "exciting";
ChatSystem.MESSAGE_NOTICE = "notice";
ChatSystem.MESSAGE_BORING = "boring"; 

ChatSystem.prototype.process_chatlog = function( chatlog, is_starting_log ) {

    if( chatlog == undefined ) {
        console.log("Error: process_chatlog() called with undefined chatlog"); 
        return;
    }

    var is_users_dirty = false;
    
    for( var i = 0; i < chatlog.length; i++ ) {
        if( chatlog[i].index > this.last_chatlog_index ) {
        
            switch( chatlog[i].command ) {
            case COMMAND_TALK:
                if( is_starting_log || chatlog[i].player_ident != account_system.player_ident) {
                    // Don't show your own messages since we insta-add them client-side
                    this.add_message(chatlog[i].public_id, chatlog[i].player_ident, chatlog[i].timestamp, chatlog[i].message, null); 
                }
                break;
            case COMMAND_ENTER:
                if( !is_starting_log ) {
                    this.add_user(chatlog[i].public_id, chatlog[i].player_ident, chatlog[i].leaderboard_rank );
                    is_users_dirty = true;
                }
                var game = {
                    'videopoker': "Video Poker",
                    'blackjack' : "Blackjack"
                };
                if( chatlog[i].player_importance != 0 ) {
                    this.add_system_message(chatlog[i].timestamp, chatlog[i].player_ident + " has joined.", ChatSystem.MESSAGE_BORING );
                }
                break;
            case COMMAND_EXIT:
                if( !is_starting_log && chatlog[i].player_ident == account_system.player_ident ) {
                    console.log("Error: just got a chat exit message saying you left?");
                    continue;
                }
                if( chatlog[i].player_importance != 0 ) {
                    this.add_system_message(chatlog[i].timestamp, chatlog[i].player_ident + " has left.", ChatSystem.MESSAGE_BORING );
                }
                if( !is_starting_log ) {
                    this.remove_user(chatlog[i].public_id);
                    is_users_dirty = true;
                }
                break;
            case COMMAND_RENAME:
                if( !is_starting_log ) {
                    removed_user = this.rename_user(chatlog[i].public_id, chatlog[i].player_ident);
                    if( chatlog[i].player_importance != 0 ) {
                        this.add_system_message(chatlog[i].timestamp, removed_user.player_ident + " is now known as " + chatlog[i].player_ident + ".", ChatSystem.MESSAGE_BORING );
                    }
                }
                is_users_dirty = true;
                break;
                 
            }
            this.last_chatlog_index = chatlog[i].index;
        }
    } 
    
    if( is_users_dirty ) {
        this.refresh_users();
    }
} 

ChatSystem.prototype.add_message = function(sender_public_id, sender_player_ident, timestamp, msg, message_class) {
    var out = '';

    if( timestamp != null && ( ( timestamp - this.last_message_timestamp ) >= MESSAGE_UPDATE_TIME_SPACE ) ) {
        var timestr = (new Date(timestamp * 1000)).format("mm/dd/yyyy h:MMtt");
        out = '<div class="chat_chunk_time">';
        out += '<span class="chat_message time">[' + timestr + ']</span>';
        out += '</div>';
        $('#chat_page0').append(out);
    }

    // first sanitize 'msg' before adding it to the dom
    msg = msg.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    msg = this.replace_url_text_with_links(msg);

    out = '<div class="chat_chunk_message">';
    if( sender_player_ident != null ) {
        out += '<span public_id="';
        out += sender_public_id; 
        out += '" class="chat_message sender';
        
        if( sender_player_ident.indexOf("(A)") == 0 ) {
            out = out + ' admin';
        }
        else if( sender_player_ident == account_system.player_ident ) {
            out = out + ' self';
        }
        out = out + '">' + sender_player_ident + '</span>:&nbsp;<span class="chat_message">' + msg + '</span>';
    } else {
        out += '<span class="chat_message ' + message_class + '">' + msg + '</span>';
    }
    out += '</div>';

    $('#chat_page0').append(out);
    if($('#chat_page0').length > 0) {
        $('#chat_page0').scrollTop($('#chat_page0')[0].scrollHeight);
    }
    $('#chat_page0').trigger('resize');

    this.num_lines += 1;
    this.last_message_timestamp = timestamp;
    
    if( sender_public_id != null ) {
        $("#chat_page0 .chat_chunk_message:last .chat_message.sender").click( function() {
            dialog_system.show_user_info_dialog( sender_public_id, sender_player_ident );
        }); 
    }
}

ChatSystem.prototype.add_system_message = function(timestamp, msg, message_class) {
    this.add_message(null, null, timestamp, '* ' + msg, message_class);
}

ChatSystem.prototype.refresh_users = function() {
    this.users = this.users.sort(function(a,b){
        var aa = a['player_ident'].toUpperCase();
        var bb = b['player_ident'].toUpperCase();
        if( aa < bb ) {
            return -1;
        }
        if( aa > bb ) {
            return 1;
        }
        return 0;
    });
    
    $('#chat_page1').empty();
    for( var i = 0; i < this.users.length; i++ ) {
        var s = "<div player_ident='";
        s += this.users[i]['player_ident'];
        s += "' public_id='";
        s += this.users[i]['public_id'];
        s += "' class='chat_user ";
        if( this.users[i]['player_ident'].indexOf("(A)") == 0 ) {
            s += " admin";
        }
        else if( this.users[i]['player_ident'] == account_system.player_ident ) {
             s += " self";
         } 
        s += "'>";
        s += this.users[i]['player_ident'];
        
        var rank = "";
        if( this.users[i]['leaderboard_rank'] != null ) {
            rank = " (#" + this.users[i]['leaderboard_rank'] + ")";
        }
        s += rank;
        s += "</div>";
        $('#chat_page1').append(s); 
    }
    
    $(".chat_user").unbind('click');
    $(".chat_user").click( function() {
        var public_id = $(this).attr("public_id"); 
        var player_ident = $(this).attr("player_ident"); 
        dialog_system.show_user_info_dialog( public_id, player_ident );
    }); 

    $("#chat_tab1").html("USERS (" + this.users.length + ")");
}

ChatSystem.prototype.rename_user = function(public_id, player_ident) {
    removed = this.remove_user( public_id );
    
    rank = 0;
    if( removed != null ) {
        rank = removed['leaderboard_rank'] 
    }
    this.add_user( public_id, player_ident, rank );
    this.refresh_users();
    
    return removed;
}

ChatSystem.prototype.add_user = function(public_id, player_ident, leaderboard_rank) {
    //  - Leaderboard rank would be cool
    u = { public_id: public_id,
          player_ident: player_ident,
          leaderboard_rank: leaderboard_rank
        };
        
    this.remove_user( public_id );
    this.users.push( u );
}

ChatSystem.prototype.set_users = function(users) {
    this.users = [];
    for( var i = 0; i < users.length; i++ ) {
        this.users.push( users[i] );
    } 
    this.refresh_users();
}

ChatSystem.prototype.remove_user = function(public_id) {
    var kill_index = -1;
    for( var i = 0; i < this.users.length; i++ ) {
        if( this.users[i]['public_id'] == public_id ) {
            kill_index = i;
            break; 
        } 
    }
    
    var removed = null;
    if(kill_index != -1) {
        removed = this.users[kill_index];
        this.users.splice(kill_index, 1);
        
    }
    
    return removed;
}

ChatSystem.prototype.goto_bottom = function() {
    $('#chat_page0').scrollTop($('#chat_page0')[0].scrollHeight);
    $('#chat_page0').trigger('resize');
}

ChatSystem.prototype.send_message_ajax = function(msg, attempt_num) {
    var that = this;
    
    $.ajax({
    	url: "/chat/post?msg=" + encodeURIComponent(msg)
    }).done(function(chat_response) { 
        // nothing
	}).fail(function() { 
	    // Try 3 times and then just give up
	    if( attempt_num < 3 ) { 
    		window.setTimeout(function() {
    	        that.send_message_ajax(msg, attempt_num+1);
    	    }, 3000 );
	    }
    }); 
}

ChatSystem.prototype.send_message = function () {
    var msg = $('#chat_input').val();

    // Don't allow bitcoin addresses
    var words = msg.split(" ");
    for (var i = 0; i < words.length; i++) {
        if (words[i].charAt(0) == "1" && words[i].length > 15) {
            $('#chat_input').val('');
            this.add_message(null, null, now, "Please do not post Bitcoin addresses in chat.", ChatSystem.MESSAGE_NOTICE);
            return;
        }
    }

    if (msg.length > 256) {
        this.add_message(null, null, now, "That message was too long.", ChatSystem.MESSAGE_NOTICE);
    }
    else if (msg.length == 0) {
        this.add_message(null, null, now, "That message is too short.", ChatSystem.MESSAGE_NOTICE);
    } else {
        $('#chat_input').val('');
        var now = Math.round((new Date()).getTime() / 1000);
        this.add_message(account_system.public_id, account_system.player_ident, now, msg, null);
        this.send_message_ajax(msg, 0);
    }
}

ChatSystem.prototype.replace_url_text_with_links = function(inputText) {
    //  - This is disabled for now since malicious users can get the http_referrer of people that click on their links.
    return inputText;

    /*
    var replacedText, replacePattern1, replacePattern2, replacePattern3;

    //URLs starting with http://, https://, or ftp://
    replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
    replacedText = inputText.replace(replacePattern1, '<a href="$1" target="_blank">$1</a>');

    //URLs starting with "www." (without // before it, or it'd re-link the ones done above).
    replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
    replacedText = replacedText.replace(replacePattern2, '$1<a href="http://$2" target="_blank">$2</a>');

    //Change email addresses to mailto:: links.
    replacePattern3 = /(\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,6})/gim;
    replacedText = replacedText.replace(replacePattern3, '<a href="mailto:$1">$1</a>');

    return replacedText;
    */
}

// We need this to occasionally update the leaderboard rankings
ChatSystem.prototype.update_chat_users = function () {

    var delay = 1000 * 60 * 5;
    if (!game_system || game_system.user_is_active) {
        $.ajax({
            url: "/chat/users"
        }).done(function (users) {
            chat_system.set_users(users);
        });
    }
    else {
        // Check every 5 seconds if user is inactive, so that when the user goes active again, the user list will quickly refresh.
        delay = 1000 * 5;
    }

    // 5 minutes
    var that = this;
    window.setTimeout(function () {
        that.update_chat_users();
    }, delay);
}


ChatSystem.prototype.adjust_height = function(animate, done) {
    var new_chat_height = $("#main_game_center").outerHeight(false) - $("#chat_tabs_container").outerHeight() - $("#chat_input").outerHeight();
    new_chat_height -= $("#control_help").outerHeight();
    // 8 pixels padding from top of help to bottom of chat window
    new_chat_height -= 8; 
    // 5 pixels to account for the big tall buttons, and the height of the draw button being a bit less
    new_chat_height -= 5;

    // don't go smaller than this..
    if( new_chat_height < 300 ) new_chat_height = 300;

    if( animate ) {
        $(".chat_page").animate({height: new_chat_height}, 200, function() { done(); });
    } else {
        $(".chat_page").css("height", new_chat_height);
        if( done != undefined ) done();
    }
}
