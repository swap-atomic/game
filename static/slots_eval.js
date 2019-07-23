
Slots = function() {
}

Slots.get_num_lines_won = function( prizes ) {
    var num_lines = 0;
    for( line_id in prizes ) {
        num_lines++;
    }
    return num_lines; 
}

Slots.get_prizes = function(reels, lines, order_of_wins, wild, wild_can_be, reel_positions, num_lines, paytable) {
    var prizes = {};
    var total_prize = 0;

    for( var lineindex = 0; lineindex < lines.length; lineindex++ ) {
        var line = lines[lineindex];

        if( lineindex == num_lines ) break;

        var symbols = [];
        for( var i = 0; i < reels.length; i++ ) {
            symbols.push( reels[i][(reel_positions[i] + line[i]) % reels[i].length] );
        }

        for( var wci = 0; wci < order_of_wins.length; wci++ ) {
            var winning_combo = order_of_wins[wci];

            var c = 0;
            var can_use_wild = indexOf(wild_can_be, winning_combo[0]) >= 0 ? true : false;

            while( (c < symbols.length) && ((winning_combo[0] == symbols[c]) || (can_use_wild && (symbols[c] == wild))) ) {
                c += 1;
            }

            if( c == winning_combo[1] ) {
                // Because the server encodes the keys as strings (JSON doesn't support tuples-as-keys), gotta convert the key to a string.
                var s = "(" + winning_combo[0] + ", " + winning_combo[1] + ")";
                prizes[lineindex] = [winning_combo, paytable[s]];
                total_prize += paytable[s];
                break;
            }
        }
    }

    return [prizes, total_prize];
}

Slots.get_total_prize = function( prizes ) {
    var total_prize = 0;
    for( line_id in prizes ) {
        total_prize += prizes[line_id][1];
    }
    return total_prize;
}

Slots.count_scatters = function( reels, reel_positions, scatter ) {
    var s = 0;
    for( var r = 0; r < reels.length; r++ ) {
        for( var k = 0; k < 3; k++ ) {
            if( reels[r][ ( reel_positions[r] + k ) % reels[r].length ] == scatter ) {
                s += 1;
            }
        }
    }
    return s;
}

Slots.get_pretty_game_eval = function( prizes, num_scatters ) {
    if( prizes == null || prizes == undefined ) {
        return "ERROR prizes null";
    }
    if( num_scatters == null || num_scatters == undefined ) {
        return "ERROR num_scatters null";
    }
    num_lines = Slots.get_num_lines_won(prizes);
    var s = "";
    if( num_lines == 0 && num_scatters <= 1 ) {
        s = "Nothing";
    }
    if( num_lines > 0 ) {
        var s = "" + num_lines + " Line";
        if( num_lines > 1 ) {
            s += "s";
        }
    }

    //  - Any way to fit both line + scatter info?
    // Max possible string would be "10 Lines + 5 Scatters", which is the same as "Hit 25, 25-26-28-29" which we show in roulette.
    if( num_scatters >= 2 ) {
        if( num_lines > 0 ) {
            s += " + ";
        }
        s += "" + num_scatters + " Scatters";
    }
    return s;
}

Slots.is_rare = function( prizes, num_lines_bet, num_scatters ) {
    var num_lines = Slots.get_num_lines_won(prizes);
    var total_prize = Slots.get_total_prize(prizes);
    if( (num_lines >= 10) || ((total_prize / num_lines_bet) >= 20) || (num_scatters >= 3) ) {
        return true;
    }
}

