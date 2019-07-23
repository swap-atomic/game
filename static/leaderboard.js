//
//
//
function LBBlackjack() {
    // !
}
LBBlackjack.prototype.inject_common_vars = function( lb, is_initial ) {
    var gamedata = lb.gamedata;
    
    if( gamedata.progressive_hand > Blackjack.PROGRESSIVE_HAND_NOTHING ) {
        this.result = Blackjack.get_progressive_hand_name( gamedata.progressive_hand );
    }
    else {
        this.result = Blackjack.get_pretty_game_eval( gamedata.game_eval ); 
    }
    this.btc_bet = Bitcoin.int_amount_to_string(gamedata.inttotalbet + gamedata.intprogressivebet);
    this.btc_prize = Bitcoin.int_amount_to_string(gamedata.intwinnings);
    this.timestamp = lb['timestamp']*1000;
    this.intgameearnings = gamedata.intgameearnings;
    
    this.payment_string = this.btc_prize;
    if( lb.gamedata.game_eval.indexOf("D") != -1 ) {
        if( gamedata.intwinnings > 0 ) {
            this.payment_string += "<span class='double_won'> (double)";
        }
        else {
            this.payment_string += "<span class='double_lost'> (double)"; 
        }
    }
    
    var d = new Date(this.timestamp);
    this.date_pretty = d.format("mmm d', 'yyyy' at 'h':'MMtt");
    this.verify = "&nbsp;"; 
}
LBBlackjack.prototype.mygames_draw = function( lb, is_initial ) {
    this.inject_common_vars( lb, is_initial );
    
    if( !is_initial ) {
        //  - Need ID?
        this.verify = "<div class='verify_button'></div>";
    } 
        
    var s = "<td>" + this.verify + "</td><td>" + this.date_pretty + "</td><td>Blackjack</td><td>" + this.btc_bet + "</td><td>" + this.result + "</td><td class='payment'>" + this.payment_string + "</td></tr>";
    return s;
}
LBBlackjack.prototype.vanilla_game_draw = function( lb, is_initial ) {
    this.inject_common_vars( lb, is_initial ); 
    var player_ident_td = "<td public_id='" + lb.public_id + "' class='stat_user " + (account_system.public_id==lb.public_id?" yourself":"") + "' ><a href='#'>" + lb.player_ident + "</a></td>";
    var s = "<td>" + this.date_pretty + "</td>" + player_ident_td + "<td>Blackjack</td><td>" + this.btc_bet + "</td><td>" + this.result + "</td><td class='payment'>" + this.payment_string + "</td>";
    return s;
}
LBBlackjack.prototype.handle_recent_row = function( lb, is_server ) {
    var now = (new Date()).getTime() / 1000.0;
    
    if( lb.gamedata.progressive_hand >= Blackjack.PROGRESSIVE_HAND_TWO_UNSUITED_SEVENS ) {
        leaderboard_system.process_row( "rarewins", lb, false, is_server );
        if( chat_system != null && is_server ) {
            chat_system.add_system_message(now, lb.player_ident + ' just got ' + Blackjack.get_progressive_hand_name(lb.gamedata.progressive_hand) + ' in Lucky 7\'s blackjack!', ChatSystem.MESSAGE_EXCITING);
        }
    }
    
    // Other stuff?
    
}

//
//
//
function LBSlots() {
}
LBSlots.prototype.inject_common_vars = function( lb, is_initial ) {
    var gamedata = lb.gamedata;

    //  - Seems like overkill to have a whole other file and function for this...
    this.result = Slots.get_pretty_game_eval( gamedata.prizes, gamedata.num_scatters ); 
    this.btc_bet = Bitcoin.int_amount_to_string(gamedata.inttotalbet);
    if( gamedata.inttotalbet == 0 ) {
        this.btc_bet = "Bonus";
    }
    this.btc_prize = Bitcoin.int_amount_to_string(gamedata.intwinnings);
    this.timestamp = lb['timestamp']*1000;
    this.intgameearnings = gamedata.intgameearnings;
    
    this.payment_string = this.btc_prize;
    
    var d = new Date(this.timestamp);
    this.date_pretty = d.format("mmm d', 'yyyy' at 'h':'MMtt");
    this.verify = "&nbsp;"; 
}
LBSlots.prototype.mygames_draw = function( lb, is_initial ) {
    this.inject_common_vars( lb, is_initial );
    
    if( !is_initial ) {
        this.verify = "<div class='verify_button'></div>";
    } 
        
    var s = "<td>" + this.verify + "</td><td>" + this.date_pretty + "</td><td>Slots</td><td>" + this.btc_bet + "</td><td>" + this.result + "</td><td class='payment'>" + this.payment_string + "</td></tr>";
    return s;
}
LBSlots.prototype.vanilla_game_draw = function( lb, is_initial ) {
    this.inject_common_vars( lb, is_initial ); 
    var player_ident_td = "<td public_id='" + lb.public_id + "' class='stat_user " + (account_system.public_id==lb.public_id?" yourself":"") + "' ><a href='#'>" + lb.player_ident + "</a></td>";
    var s = "<td>" + this.date_pretty + "</td>" + player_ident_td + "<td>Slots</td><td>" + this.btc_bet + "</td><td>" + this.result + "</td><td class='payment'>" + this.payment_string + "</td>";
    return s;
}
LBSlots.prototype.get_line_pretty_name = function (line) {
    var symbol = line[0];
    var num = line[1];
    var symbol_lookup = ["scatters", "WILDs", "dice", "cards", "chips", "balls", "wheels", "aces", "kings", "queens", "jacks"];
    var num_lookup = ["zero", "one", "two", "three", "four", "five"];
    return "" + num_lookup[num] + " " + symbol_lookup[symbol];
}

LBSlots.prototype.handle_recent_row = function (lb, is_server) {

    if (Slots.is_rare(lb.gamedata.prizes, lb.gamedata.num_lines, lb.gamedata.num_scatters)) {
        leaderboard_system.process_row("rarewins", lb, false, is_server);
    }
    if (chat_system != null && is_server) {
        var now = (new Date()).getTime() / 1000.0;
        var num_lines = Slots.get_num_lines_won(lb.gamedata.prizes);

        // Find the biggest win. Then see if it is exciting enough to talk about.
        var best_prize = 0;
        var best_line = [0, 0];
        for (var line_id in lb.gamedata.prizes) {
            result = lb.gamedata.prizes[line_id];
            var prize = result[1];
            //console.log(prize);
            if (prize > best_prize) {
                best_prize = prize;
                best_line = result[0];
                //console.log(best_line);
            }
        }

        if (best_prize >= 100) { 
            var now = Math.round((new Date()).getTime() / 1000);
            // Wait 60 seconds between displaying these semi-interesting messages
            if( best_prize >= 200 || now - chat_system.last_happy_message_timestamp > 60 ) {
                chat_system.add_system_message(now, lb.player_ident + ' just got ' + this.get_line_pretty_name(best_line) + ' playing progressive Slots!', ChatSystem.MESSAGE_EXCITING);
                chat_system.last_happy_message_timestamp = now;
            } 
        }
        else if (num_lines >= 10) {
            chat_system.add_system_message(now, lb.player_ident + ' just hit ' + num_lines + ' lines playing progressive Slots!', ChatSystem.MESSAGE_EXCITING);
        }

        if (lb.gamedata.num_scatters >= 3) {
            chat_system.add_system_message(now, lb.player_ident + ' just hit ' + lb.gamedata.num_scatters + ' scatters and won 10 free spins in progressive Slots!', ChatSystem.MESSAGE_EXCITING);
        }
    }
}

function LBDice() {
}
LBDice.prototype.inject_common_vars = function( lb, is_initial ) {
    var gamedata = lb.gamedata;

    if(gamedata.prize > 0) {
        this.result = "Win " + (gamedata.bet_high ? ">" : "<") + " " + Dice.get_lucky_number_str(Dice.get_win_cutoff(gamedata.bet_high, lb.gamedata.chance));
    } else {
        this.result = "Nothing"
    }

    this.btc_bet = Bitcoin.int_amount_to_string(gamedata.inttotalbet);
    var prize_to_use = gamedata.intwinnings - (gamedata.intwinnings % 10000);
    this.btc_prize = ((prize_to_use != gamedata.intwinnings) ? "≈" : "") + Bitcoin.int_amount_to_string(prize_to_use);
    this.timestamp = lb['timestamp']*1000;
    this.intgameearnings = gamedata.intgameearnings;
    
    this.payment_string = this.btc_prize;
    
    var d = new Date(this.timestamp);
    this.date_pretty = d.format("mmm d', 'yyyy' at 'h':'MMtt");
    this.verify = "&nbsp;"; 
}
LBDice.prototype.mygames_draw = function( lb, is_initial ) {
    this.inject_common_vars( lb, is_initial );
    
    if( !is_initial ) {
        this.verify = "<div class='verify_button'></div>";
    } 
        
    var s = "<td>" + this.verify + "</td><td>" + this.date_pretty + "</td><td>Dice</td><td>" + this.btc_bet + "</td><td>" + this.result + "</td><td class='payment'>" + this.payment_string + "</td></tr>";
    return s;
}
LBDice.prototype.vanilla_game_draw = function( lb, is_initial ) {
    this.inject_common_vars( lb, is_initial ); 
    var player_ident_td = "<td public_id='" + lb.public_id + "' class='stat_user " + (account_system.public_id==lb.public_id?" yourself":"") + "' ><a href='#'>" + lb.player_ident + "</a></td>";
    var s = "<td>" + this.date_pretty + "</td>" + player_ident_td + "<td>Dice</td><td>" + this.btc_bet + "</td><td>" + this.result + "</td><td class='payment'>" + this.payment_string + "</td>";
    return s;
}
LBDice.prototype.handle_recent_row = function( lb, is_server ) {

    var is_rare = Dice.is_rare(lb.gamedata.chance, lb.gamedata.prize);
    if( is_rare ) {
        leaderboard_system.process_row( "rarewins", lb, false, is_server ); 
    }
    if( chat_system != null && is_server ) {
        var now = (new Date()).getTime() / 1000.0;
        if( is_rare ) {
            chat_system.add_system_message(now, lb.player_ident + ' just won ' + this.btc_prize + ' BTC on a ' + (lb.gamedata.chance / 10000.0) + '% chance playing Dice!', ChatSystem.MESSAGE_EXCITING);
        }
        if( lb.gamedata.progressive_win > 0 ) {
            chat_system.add_system_message(now, lb.player_ident + ' just won ' + Bitcoin.int_amount_to_string(lb.gamedata.prize) + ' BTC from Progressive Dice by rolling a ' + (lb.gamedata.lucky_number/10000.0) + '!', ChatSystem.MESSAGE_EXCITING);
        }
     } 
}


//
//
//
function LBKeno() {
}
LBKeno.prototype.inject_common_vars = function( lb, is_initial ) {
    var gamedata = lb.gamedata;

    //  - Seems like overkill to have a whole other file and function for this...
    this.result = Keno.get_pretty_game_eval( gamedata.hit_numbers_count ); 
    this.btc_bet = Bitcoin.int_amount_to_string(gamedata.inttotalbet);
    this.btc_prize = Bitcoin.int_amount_to_string(gamedata.intwinnings);
    this.timestamp = lb['timestamp']*1000;
    this.intgameearnings = gamedata.intgameearnings;
    
    this.payment_string = this.btc_prize;
    
    var d = new Date(this.timestamp);
    this.date_pretty = d.format("mmm d', 'yyyy' at 'h':'MMtt");
    this.verify = "&nbsp;"; 
}
LBKeno.prototype.mygames_draw = function( lb, is_initial ) {
    this.inject_common_vars( lb, is_initial );
    
    if( !is_initial ) {
        this.verify = "<div class='verify_button'></div>";
    } 
        
    var s = "<td>" + this.verify + "</td><td>" + this.date_pretty + "</td><td>Keno</td><td>" + this.btc_bet + "</td><td>" + this.result + "</td><td class='payment'>" + this.payment_string + "</td></tr>";
    return s;
}
LBKeno.prototype.vanilla_game_draw = function( lb, is_initial ) {
    this.inject_common_vars( lb, is_initial ); 
    var player_ident_td = "<td public_id='" + lb.public_id + "' class='stat_user " + (account_system.public_id==lb.public_id?" yourself":"") + "' ><a href='#'>" + lb.player_ident + "</a></td>";
    var s = "<td>" + this.date_pretty + "</td>" + player_ident_td + "<td>Keno</td><td>" + this.btc_bet + "</td><td>" + this.result + "</td><td class='payment'>" + this.payment_string + "</td>";
    return s;
}
LBKeno.prototype.handle_recent_row = function( lb, is_server ) {

    if( Keno.is_rare( lb.gamedata.hit_numbers_count )) {
        leaderboard_system.process_row( "rarewins", lb, false, is_server );
        if( chat_system != null && is_server ) {
            var now = (new Date()).getTime() / 1000.0;
            chat_system.add_system_message(now, lb.player_ident + ' just hit ' + lb.gamedata.hit_numbers_count + ' numbers playing progressive Keno!', ChatSystem.MESSAGE_EXCITING);
        } 
    }
}

//
//
//
function LBRoulette() {
    // !
}
LBRoulette.prototype.inject_common_vars = function( lb, is_initial ) {
    var gamedata = lb.gamedata;

    //don't show 1 zero hands unless they didn't win anything else
    if( (gamedata.progressive_hand == Roulette.PROGRESSIVE_HAND_ONE_ZERO && gamedata.intgameearnings == 0) || (gamedata.progressive_hand > Roulette.PROGRESSIVE_HAND_ONE_ZERO ) ) {
        var p = {1: "One zero", 2: "Two zeroes", 3: "Three zeroes"}[gamedata.progressive_hand];
        this.result = Roulette.get_progressive_hand_name( gamedata.progressive_hand );
    }
    else {
        this.result = Roulette.get_pretty_game_eval( gamedata.prizes, 2 ); 
    }
    this.btc_bet = Bitcoin.int_amount_to_string(gamedata.inttotalbet + gamedata.intprogressivebet);
    this.btc_prize = Bitcoin.int_amount_to_string(gamedata.intwinnings);
    this.timestamp = lb['timestamp']*1000;
    this.intgameearnings = gamedata.intgameearnings;
    
    this.payment_string = this.btc_prize;
    
    var d = new Date(this.timestamp);
    this.date_pretty = d.format("mmm d', 'yyyy' at 'h':'MMtt");
    this.verify = "&nbsp;"; 
}
LBRoulette.prototype.mygames_draw = function( lb, is_initial ) {
    this.inject_common_vars( lb, is_initial );
    
    if( !is_initial ) {
        //  - Need ID?
        this.verify = "<div class='verify_button'></div>";
    } 
        
    var s = "<td>" + this.verify + "</td><td>" + this.date_pretty + "</td><td>Roulette</td><td>" + this.btc_bet + "</td><td>" + this.result + "</td><td class='payment'>" + this.payment_string + "</td></tr>";
    return s;
}
LBRoulette.prototype.vanilla_game_draw = function( lb, is_initial ) {
    this.inject_common_vars( lb, is_initial ); 
    var player_ident_td = "<td public_id='" + lb.public_id + "' class='stat_user " + (account_system.public_id==lb.public_id?" yourself":"") + "' ><a href='#'>" + lb.player_ident + "</a></td>";
    var s = "<td>" + this.date_pretty + "</td>" + player_ident_td + "<td>Roulette</td><td>" + this.btc_bet + "</td><td>" + this.result + "</td><td class='payment'>" + this.payment_string + "</td>";
    return s;
}
LBRoulette.prototype.handle_recent_row = function( lb, is_server ) {
    var now = (new Date()).getTime() / 1000.0;

    if( (lb.gamedata.progressive_hand >= 1) || (lb.gamedata.intwinnings / lb.gamedata.inttotalbet) >= 6 ) {
        leaderboard_system.process_row( "rarewins", lb, false, is_server );
    }

    if( lb.gamedata.progressive_hand > 1 ) { // only shows 2 and 3 zeros in a row. One zero will only be rare if you bet and hit it.
        if( chat_system != null && is_server ) {
            chat_system.add_system_message(now, lb.player_ident + ' just got ' + lb.gamedata.progressive_hand + ' zeroes in a row playing Progressive Roulette!', ChatSystem.MESSAGE_EXCITING);
        }
    }
    
    // Other stuff?
}

//
//
//
function LBCraps() {
    // !
}
LBCraps.prototype.inject_common_vars = function( lb, is_initial ) {
    var gamedata = lb.gamedata;

    //don't show 1 zero hands unless they didn't win anything else
    if( (gamedata.progressive_hand == Craps.PROGRESSIVE_HAND_THREE_SIXES && gamedata.intgameearnings == 0) || (gamedata.progressive_hand > Craps.PROGRESSIVE_HAND_FOUR_SIXES ) ) {
        this.result = Craps.get_progressive_hand_name( gamedata.progressive_hand );
    } else {
        this.result = Craps.get_pretty_game_eval( gamedata.prizes, gamedata.rolled, gamedata.num_points_hit, gamedata.the_point, gamedata.progressive_hand ); 
    }
    this.btc_bet = Bitcoin.int_amount_to_string(gamedata.inttotalbet);

    var prize_to_use = gamedata.intwinnings - (gamedata.intwinnings % 10000);
    this.btc_prize = ((prize_to_use != gamedata.intwinnings) ? "≈" : "") + Bitcoin.int_amount_to_string(prize_to_use);

    this.timestamp = lb['timestamp']*1000;
    this.intgameearnings = gamedata.intgameearnings;
    
    this.payment_string = this.btc_prize;
    
    var d = new Date(this.timestamp);
    this.date_pretty = d.format("mmm d', 'yyyy' at 'h':'MMtt");
    this.verify = "&nbsp;"; 
}
LBCraps.prototype.mygames_draw = function( lb, is_initial ) {
    this.inject_common_vars( lb, is_initial );
    
    if( !is_initial ) {
        //  - Need ID?
        this.verify = "<div class='verify_button'></div>";
    } 
        
    var s = "<td>" + this.verify + "</td><td>" + this.date_pretty + "</td><td>Craps</td><td>" + this.btc_bet + "</td><td>" + this.result + "</td><td class='payment'>" + this.payment_string + "</td></tr>";
    return s;
}

LBCraps.prototype.vanilla_game_draw = function( lb, is_initial ) {
    this.inject_common_vars( lb, is_initial ); 
    var player_ident_td = "<td public_id='" + lb.public_id + "' class='stat_user " + (account_system.public_id==lb.public_id?" yourself":"") + "' ><a href='#'>" + lb.player_ident + "</a></td>";
    var s = "<td>" + this.date_pretty + "</td>" + player_ident_td + "<td>Craps</td><td>" + this.btc_bet + "</td><td>" + this.result + "</td><td class='payment'>" + this.payment_string + "</td>";
    return s;
}

LBCraps.prototype.handle_recent_row = function( lb, is_server ) {
    var nice = ("PROP2" in lb.gamedata.prizes || "PROP12" in lb.gamedata.prizes || "PROP3" in lb.gamedata.prizes || "PROP11" in lb.gamedata.prizes);
    if( lb.gamedata.progressive_hand >= 4 || nice ) { // only shows 4 or more sixes. 
        leaderboard_system.process_row( "rarewins", lb, false, is_server );
        if( chat_system != null && is_server && lb.gamedata.progressive_hand >= 4 ) {
            chat_system.add_system_message(now, lb.player_ident + ' just got ' + lb.gamedata.progressive_hand + ' sixes playing Progressive Craps!', ChatSystem.MESSAGE_EXCITING);
        }
    }
    
    // Other stuff?
}




//
//
//
function LBVideoPoker() {
    // yo dawg
}
    
LBVideoPoker.prototype.inject_common_vars = function( lb, is_initial ) {
    var gamedata = lb.gamedata;
    this.hand_eval = gamedata.hand_eval;
    this.btc_bet = Bitcoin.int_amount_to_string(gamedata.intbetamount);
    this.btc_prize = Bitcoin.int_amount_to_string(gamedata.intoriginalwinnings);
    this.timestamp = lb.timestamp*1000;
    this.paytable = gamedata.paytable;
    if( this.paytable == null ) {
        this.paytable = 0;
    }
    this.multiplier = gamedata.multiplier;
    
    var d = new Date(this.timestamp);
    this.date_pretty = d.format("mmm d', 'yyyy' at 'h':'MMtt");
    this.poker_game = poker_games[ this.paytable ];
    this.hand_name = this.poker_game.get_hand_eval_name( this.hand_eval );
    this.verify = "&nbsp;"; 
    this.game_name = this.poker_game.name;
    
    
    // Draw the original winnings if you lost double down or pushed,
    // otherwise show the multiplied winnings amount.
    this.payment_string = "";
    if( this.multiplier == 0 ) {
        this.payment_string = this.btc_prize + "<span class='double_lost'> (--)";
    }
    else if( this.multiplier == 1 && !is_initial ) {
        this.payment_string = this.btc_prize + "<span class='double_won'> (push)";
    }
    else if( this.multiplier > 1 ) {
        this.payment_string = (this.btc_prize * this.multiplier) + "<span class='double_won'> (win " + this.multiplier + "X)";
    } 
    else {
        // Didn't play, so do nothing.
        // (multiplier should be -1)
        this.payment_string = this.btc_prize;
    }
    
}

LBVideoPoker.prototype.mygames_draw = function( lb, is_initial ) {
    this.inject_common_vars( lb, is_initial );
    
    if( !is_initial ) {
        //  - Need ID?
        this.verify = "<div class='verify_button'></div>";
    } 
    
    //  - The social <td> used to be added here
    var s = "<td>" + this.verify + "</td><td>" + this.date_pretty + "</td><td>" + this.game_name + "</td><td>" + this.btc_bet + "</td><td>" + this.hand_name + "</td><td class='payment'>" + this.payment_string + "</td></tr>";
    return s;
}

LBVideoPoker.prototype.vanilla_game_draw = function( lb, is_initial ) {
    this.inject_common_vars( lb, is_initial ); 
    var player_ident_td = "<td public_id='" + lb.public_id + "' class='stat_user " + (account_system.public_id==lb.public_id?" yourself":"") + "' ><a href='#'>" + lb.player_ident + "</a></td>";
    var s = "<td>" + this.date_pretty + "</td>" + player_ident_td + "<td>" + this.game_name + "</td><td>" + Bitcoin.int_amount_to_string(lb.gamedata.intbetamount) + "</td><td>" + this.hand_name + "</td><td class='payment'>" + this.payment_string + "</td>"; 
    return s;
}
LBVideoPoker.prototype.handle_recent_row = function( lb, is_server ) {
    var now = (new Date()).getTime() / 1000.0;
    var poker_game = poker_games[lb.gamedata.paytable];
    if( lb.gamedata.hand_eval >= poker_game.RARE_HAND ) {
        // If this hand is RARE, then add it to rare wins!
        leaderboard_system.process_row( "rarewins", lb, false, is_server );

        if( chat_system != null && is_server && lb.gamedata.multiplier == -1 ) {
            chat_system.add_system_message(now, lb.player_ident + ' just got a ' + poker_game.get_hand_eval_name( lb.gamedata.hand_eval ) + '!', ChatSystem.MESSAGE_EXCITING);
        }
    }
    
    // Post exciting stuff to chat
    if( is_server ) {

        // Tell the player that someone just hit 3 double downs!
        if( chat_system != null && lb.gamedata.multiplier == 8 && lb.gamedata.intwinnings > 0 ) {
            chat_system.add_system_message(now, lb.player_ident + ' just hit three double downs in a row!', ChatSystem.MESSAGE_EXCITING);
        }

        // Tell the player that someone just won the progressive jackpot!
        if( chat_system != null && lb.gamedata.progressive_win != undefined && lb.gamedata.progressive_win != 0 && lb.gamedata.multiplier == -1 ) {
            chat_system.add_system_message(now, lb.player_ident + ' just just got a Royal Flush and won the Progressive Jackpot worth ' + Bitcoin.int_amount_to_string(lb.gamedata.intwinnings) + ' BTC!', ChatSystem.MESSAGE_EXCITING);
        }
    }
}

lb_games = {
    "videopoker": new LBVideoPoker(),
    "blackjack" : new LBBlackjack(),
    "roulette"  : new LBRoulette(),
    "craps"     : new LBCraps(),
    "keno"      : new LBKeno(),
    "slots"     : new LBSlots(),
    "dice"      : new LBDice()
}

// Create table class
function LeaderboardTable( table_id, static_toprow_id, draw_func, score_func, initial_add, dynamic_add ) {
    this.FADE_SPEED = 500;
    
    this.table_id = table_id;
    this.draw_func = draw_func;
    this.score_func = score_func;
    this.initial_add = initial_add;
    this.dynamic_add = dynamic_add;
    this.static_toprow_id = static_toprow_id;
    
    this.num_bottom = 0; 
    this.num_top = 0; 
    this.num_score = 0; 
}

LeaderboardTable.ADD_TO_TOP = 0;
LeaderboardTable.ADD_TO_BOTTOM = 1;
LeaderboardTable.ADD_BY_SCORE = 2;

LeaderboardTable.prototype.form_row = function(row_html, unique_id, score) {
    var uid = unique_id;
    if( uid == null ) {
        uid = this.num_bottom + this.num_top + this.num_score;
    }
    var s = "<tr unique_id='" + uid + "'";
    if( score != null ) {
        s += " score='" + score + "'";
    }
    s += ">";
    s += row_html;
    s += "</tr>";
    return [s, uid];
}
LeaderboardTable.prototype.recolor = function()
{
    $("table#" + this.table_id).find("tr").each( function(i,row) {
        if( i == 0 ) {
            // Skip the header row
            return true;
        }
        $(row).removeClass("even").removeClass("odd");
        if( i % 2 == 0 ) {
            $(row).addClass("odd");
        }
        else {
            $(row).addClass("even");
        }
    });
}

LeaderboardTable.prototype.get_row_by_id = function(unique_id) {
    // Find and return jquery object
    var row = $("table#" + this.table_id + " tr[unique_id=" + unique_id + "]");
    return row;
}
LeaderboardTable.prototype.remove_by_id = function(unique_id) {
    // Locate, delete
    var row = this.get_row_by_id( unique_id );
    row.remove();
    this.recolor();
}

LeaderboardTable.prototype.update_static_toprow_color = function() {
    if( this.static_toprow_id == null ) return;
    var ns = $("table#" + this.table_id + " tr#" + this.static_toprow_id);
    
    if( this.num_top % 2 == 0 ) {
        ns.removeClass("odd").addClass("even");
    } else {
        ns.removeClass("even").addClass("odd");
    }
}

LeaderboardTable.prototype.add_to_top = function(row_html, unique_id, score) {
    //  - Does a row for this unique_id already exist? Then just replace the stuff inside <tr></tr>
    var result = this.form_row( row_html, unique_id, score );
    var tr = result[0];
    var new_id = result[1];
    if( this.static_toprow_id != null ) {
        $("table#" + this.table_id + " tr#" + this.static_toprow_id).after( tr );
    } else {
        $("table#" + this.table_id + " tr:first").after( tr );
    }
    //  - Does nth-child work in IE?
    var new_row = this.get_row_by_id( new_id );
    //var new_row = $("table#" + this.table_id + " tr:nth-child(2)").after( tr );
    //if( $("table#" + this.table_id + " tr").length % 2 == 0 ) {
    if( (this.static_toprow_id != null && this.num_top % 2 == 1) || (this.static_toprow_id == null && this.num_top % 2 == 0) ) {
        new_row.addClass("odd");
    }
    else {
        new_row.addClass("even");
    } 
    
    this.num_top++;
    this.update_static_toprow_color();

    return new_row;
}

LeaderboardTable.prototype.add_to_bottom = function(row_html, unique_id, score) {
    var result = this.form_row( row_html, unique_id, score );
    var tr = result[0];
    var new_id = result[1];
    
    $("table#" + this.table_id + " tr:last").after( tr );
    
    var new_row = $("table#" + this.table_id + " tr:last");
    if( $("table#" + this.table_id + " tr").length % 2 == 0 ) {
    //if( this.num_bottom % 2 == 0 ) {
        new_row.addClass("even");
    }
    else {
        new_row.addClass("odd");
    }
    this.num_bottom++;
    return new_row;
}
LeaderboardTable.prototype.add_by_score = function(row_html, unique_id, score) {
    var result = this.form_row( row_html, unique_id, score );
    var tr = result[0];
    var new_id = result[1];
    
    // Find insertion point and append
    // Add the unique_id and score values to the row data
    
    var insert_index = -1;
    $("table#" + this.table_id).find("tr").each( function(i,row) {
        if( i == 0 ) {
            // Skip the header row
            return true;
        }
        
        if( ($(row).attr("score") != undefined) && (score >= $(row).attr("score")) ) {
            insert_index = i-1;
            // break out of each loop
            return false;
        }
    });
    
    if( insert_index == -1 ) { 
        // This score was better than nothing else. Add it to the end
        return this.add_to_bottom(row_html, unique_id, score);
    }
    else {
        // Then insert it
        $("table#" + this.table_id).find("tr").eq(insert_index).after( tr );
        this.recolor();
    } 
    
    this.num_score++;
    var new_row = this.get_row_by_id( new_id );
    return new_row;
}
LeaderboardTable.prototype.post_add = function( lb, new_row, should_fade )
{ 
    // If the entry has a public_id associated with it, set the attribute
    // This will be necessary later for renaming players.
    if( lb.public_id != undefined ) {
        new_row.attr("public_id", lb.public_id);
    }

    // Remove items after 20 rows
    $("table#" + this.table_id).find("tr:gt(20)").remove();
    
    if( should_fade ) {
        new_row.css("opacity", "0");
        new_row.animate({opacity:"1.0"}, this.FADE_SPEED);
    }
    
    new_row.find(".stat_user a").click( function() {
        var stat_user = $(this).parent();
        dialog_system.show_user_info_dialog( stat_user.attr("public_id"), $(this).html() );
        return false;
    });
}
LeaderboardTable.prototype.get_lowest_score = function() {
    var score = $("table#" + this.table_id + " tr:last").attr( "score" ); 
    return score;
}
LeaderboardTable.prototype.replace_last_row = function( row, is_initial )
{
    var tr = this.draw_func( row, is_initial ); 
}
LeaderboardTable.prototype.process_row = function( lb, is_initial )
{
    var tr = this.draw_func( lb, is_initial );
    
    var unique_id = lb.game + "-" + lb.gamedata.unique_id;
    
    var score = null;
    var score_func = this.score_func;
    if( score_func != null ) {
        score = score_func( lb );
    }
    
    
    var add_method = null;
    if( is_initial ) {
        add_method = this.initial_add;
    }
    else {
        add_method = this.dynamic_add;
    }
    
    // If this row already exists, just replace the html (with no fade)
    // If row exists but we're adding by score, delete current item and re-add, since sorting/colors may have changed.
    var old_row = this.get_row_by_id( unique_id );
    if( old_row.length != 0 ) {
        if( add_method == LeaderboardTable.ADD_TO_TOP || add_method == LeaderboardTable.ADD_TO_BOTTOM ) {
            old_row.html( tr ); 
            this.post_add( lb, old_row, false );    
            return old_row;
        }
        else if( add_method == LeaderboardTable.ADD_BY_SCORE ) {
            this.remove_by_id(unique_id); 
        }
    }
    
    
    
    var new_row = null;
    switch( add_method ) {
    case LeaderboardTable.ADD_TO_TOP:
        new_row = this.add_to_top(tr, unique_id, score);
        break;
    case LeaderboardTable.ADD_TO_BOTTOM:
        new_row = this.add_to_bottom(tr, unique_id, score);
        break;
    case LeaderboardTable.ADD_BY_SCORE:
        if( score_func == null ) {
            console.log("Error: calling add_by_score with a null score_func");
            return;
        }
        new_row = this.add_by_score(tr, unique_id, score);
        break;
    default:
        console.log("Error: add_method is bad");
    }
    
    this.post_add( lb, new_row, !is_initial );    
    
    return new_row;
}


LeaderboardTable.prototype.rename_player = function( public_id, player_ident )
{
    $("table#" + this.table_id + " tr[public_id=" + public_id + "]").each(function(row_index, tr) {
        $(tr).children("td[player_ident=1]").html(player_ident).css("opacity", 0).animate({opacity:1.0}, 500);
    });
}

function LeaderboardSystem( initial_mygames, initial_leaderboards ) {
    this.init_handlers();
    this.tables = {};
    this.last_leaderboard_time = 0;
    
    this.add_table( 'recent', null, LeaderboardSystem.vanilla_game_draw, null, LeaderboardTable.ADD_TO_BOTTOM, LeaderboardTable.ADD_TO_TOP, null );
    this.process_rows( 'recent', initial_leaderboards['recent'], true, true );

    this.add_table('mygames', "next_server_hash_row", LeaderboardSystem.mygames_draw, null, LeaderboardTable.ADD_TO_BOTTOM, LeaderboardTable.ADD_TO_TOP);
    this.process_rows( 'mygames', initial_mygames, true, true );
    
    this.add_table( 'bigwins', null, LeaderboardSystem.vanilla_game_draw, LeaderboardSystem.get_bigwins_score, LeaderboardTable.ADD_TO_BOTTOM, LeaderboardTable.ADD_BY_SCORE, null );
    this.process_rows( 'bigwins', initial_leaderboards['bigwins'], true, true ); 
    
    this.add_table( 'rarewins', null, LeaderboardSystem.vanilla_game_draw, null, LeaderboardTable.ADD_TO_BOTTOM, LeaderboardTable.ADD_TO_TOP, null );
    this.process_rows( 'rarewins', initial_leaderboards['rarewins'], true, true );
    
    this.add_table( 'leaderboard', null, LeaderboardSystem.leaderboard_draw, LeaderboardSystem.get_leaderboard_score, LeaderboardTable.ADD_TO_BOTTOM, LeaderboardTable.ADD_BY_SCORE, null );
    this.process_rows( 'leaderboard', initial_leaderboards['leaderboard'], true, true );
    
}

LeaderboardSystem.prototype.init_handlers = function(leaderboards) {

    $("#tabs li a").click( function() {
        id = $(this).attr("id");
        idx = id.charAt( id.length-1 );
        $("#tabs li a").removeClass("selected");
        $(this).addClass("selected");
        $(".statspage").removeClass("selected");
        $("#statspage" + idx).addClass("selected");

        return false;
    });
    
}

LeaderboardSystem.get_bigwins_score = function( lb ) {
    //  - Blackjack
    return lb.gamedata.intwinnings;
}
LeaderboardSystem.get_leaderboard_score = function( lb ) {
    return lb.gamedata.intearnings;
}

LeaderboardSystem.vanilla_game_draw = function( lb, is_initial ) {
    if( lb.game in lb_games ) {
        return lb_games[lb.game].vanilla_game_draw(lb, is_initial);
    } else {
        console.log("Error: bad game type");
    }
}

LeaderboardSystem.mygames_draw = function( lb, is_initial ) {
    if( lb.game in lb_games ) {
        return lb_games[lb.game].mygames_draw(lb, is_initial);
    } else {
        console.log("Error: bad game type");
    }
}

// This is universal for all game types (because it's aggregate)
LeaderboardSystem.leaderboard_draw  = function( lb, is_initial ) {
    //var s = "<td player_ident=1 " + (account_system.public_id==lb.public_id?" class='yourself'>":">") + lb.player_ident + "</td>";
    var s = "<td public_id='" + lb.public_id + "' class='stat_user " + (account_system.public_id==lb.public_id?" yourself":"") + "' ><a href='#'>" + lb.player_ident + "</a></td>";
    s += "<td>" + Bitcoin.int_amount_to_string(lb.gamedata.intearnings) + "</td>";    
    return s;
}

LeaderboardSystem.prototype.add_table = function( table_id, static_toprow_id, draw_func, score_func, initial_add, dynamic_add )
{
    var table = new LeaderboardTable( table_id, static_toprow_id, draw_func, score_func, initial_add, dynamic_add );
    this.tables[ table_id ] = table;
}

LeaderboardSystem.prototype.replace_last_row = function( table_id, lb )
{
    return this.tables[ table_id ].replace_last_row( row );
}

// [item1]
LeaderboardSystem.prototype.process_row = function (table_id, lb, is_initial, is_server) {
    // handle player renames
    if (table_id == "rename") {
        if (is_server && lb.timestamp > this.last_leaderboard_time) {
            $.each(this.tables, function (i, table) {
                table.rename_player(lb.public_id, lb.player_ident);
            });

            // and of course, we should save the timestamp
            this.last_leaderboard_time = lb.timestamp;
        }
        return;
    }

    var new_row = this.tables[table_id].process_row(lb, is_initial);
    if (is_server && lb.timestamp > this.last_leaderboard_time) {
        // Only authoritative timestamps from the server should be used to set the last time. 
        this.last_leaderboard_time = lb.timestamp;
    }

    if (table_id == "recent" && !is_initial) {
        // Process game specific messages
        if (lb.game in lb_games) {
            lb_games[lb.game].handle_recent_row(lb, is_server);
        } else {
            console.log("bad recent leaderboard table game was niether videopoker, blackjack, craps, keno nor roulette");
        }

        var big_win_minimum = this.get_lowest_score('bigwins');
        if (lb.gamedata.intwinnings > big_win_minimum || lb.gamedata.intwinnings != lb.gamedata.intoriginalwinnings) {
            this.process_row("bigwins", lb, false, is_server);
        }

        // Post exciting stuff to chat
        if (is_server) {
            // Tell the player that someone just scored big!
            if (chat_system != null && lb.gamedata.intwinnings > big_win_minimum) {
                var now = (new Date()).getTime() / 1000.0;
                chat_system.add_system_message(now, lb.player_ident + ' just got paid ' + Bitcoin.int_amount_to_string(lb.gamedata.intwinnings) + ' BTC!', ChatSystem.MESSAGE_EXCITING);
            }

            // If a user has won his first BTC game, tell the world!
            if (chat_system != null && lb.gamedata.is_first_win) {
                var now = (new Date()).getTime() / 1000.0;
                chat_system.add_system_message(now, lb.player_ident + ' just won his first game on Bitcoin Games! Welcome!', ChatSystem.MESSAGE_EXCITING); 
            }
        }

    }
    return new_row;
}

// [item1, item2]
LeaderboardSystem.prototype.process_rows = function(table_id, lbs, is_initial, is_server )
{
    if( lbs == undefined ) {
        return;
    }
    
    var table = this.tables[table_id];
    for( var i = 0; i < lbs.length; i++ ) {
        this.process_row( table_id, lbs[i], is_initial, is_server );
    }
}

// full leaderboard data from server
// [ {foo.board="recent", 42}, {foo.board="leaderboard", 423.2} ]
LeaderboardSystem.prototype.process_leaderboard_data = function( data, is_initial )
{
    if( data == undefined ) {
        console.log("error: process_leaderboard_data called with undefined data");
        return;
    }
    
    for( var i = 0; i < data.length; i++ ) {
        this.process_row( data[i].board, data[i], is_initial, true );
    }
}

LeaderboardSystem.prototype.get_lowest_score = function(table_id) {
    var table = this.tables[ table_id ];
    var score = table.get_lowest_score();
    return score;
}
