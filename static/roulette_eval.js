
Roulette = function() {
}

Roulette.PROGRESSIVE_HAND_NOTHING = 0;
Roulette.PROGRESSIVE_HAND_ONE_ZERO = 1;
Roulette.PROGRESSIVE_HAND_TWO_ZEROES = 2;
Roulette.PROGRESSIVE_HAND_THREE_ZEROS = 3;
Roulette.PROGRESSIVE_HAND_JACKPOT = Roulette.PROGRESSIVE_HAND_THREE_ZEROS;

Roulette.PAYOUT_TABLE = {};

// Straight up bets - 35:1
Roulette.STRAIGHT_UP_BETS = [];
for( var i = 1; i < 37; i++ ) {
    Roulette.STRAIGHT_UP_BETS.push('N' + i);
    Roulette.PAYOUT_TABLE['N' + i] = [35, 1];
}

Roulette.STRAIGHT_UP_BETS_ZEROS = [[], ['N0'], ['N0', 'N00']];
Roulette.PAYOUT_TABLE['N0'] = [35, 1];
Roulette.PAYOUT_TABLE['N00'] = [35, 1];

Roulette.SPLIT_BETS = [];
for( var i = 1; i < 37; i += 3 ) {
    Roulette.SPLIT_BETS.push('A' + i);
    Roulette.PAYOUT_TABLE['A' + i] = [17, 1];
}

for( var i = 2; i < 37; i += 3 ) {
    Roulette.SPLIT_BETS.push('A' + i);
    Roulette.PAYOUT_TABLE['A' + i] = [17, 1];
}

for( var i = 1; i < 34; i++ ) {
    Roulette.SPLIT_BETS.push('D' + i);
    Roulette.PAYOUT_TABLE['D' + i] = [17, 1];
}

Roulette.STREET_BETS = [];
for( var i = 1; i < 37; i += 3 ) {
    Roulette.STREET_BETS.push('S' + i);
    Roulette.PAYOUT_TABLE['S' + i] = [11, 1];
}

Roulette.CORNER_BETS = [];
for( var i = 1; i < 34; i += 3 ) {
    Roulette.CORNER_BETS.push('C' + i);
    Roulette.PAYOUT_TABLE['C' + i] = [8, 1];
}

for( var i = 2; i < 34; i += 3 ) {
    Roulette.CORNER_BETS.push('C' + i);
    Roulette.PAYOUT_TABLE['C' + i] = [8, 1];
}

Roulette.DOUBLE_STREET_BETS = [];
for( var i = 1; i < 34; i+= 3 ) {
    Roulette.DOUBLE_STREET_BETS.push('DS' + i);
    Roulette.PAYOUT_TABLE['DS' + i] = [5, 1];
}

Roulette.BASKET2_BETS = [[], ['B01', 'B02', 'B03'], ['B01', 'B003']];
Roulette.PAYOUT_TABLE['B01'] = [17, 1];
Roulette.PAYOUT_TABLE['B02'] = [17, 1];
Roulette.PAYOUT_TABLE['B03'] = [17, 1];
Roulette.PAYOUT_TABLE['B003'] = [17, 1];

Roulette.BASKET3_BETS = [[], ['B012', 'B023'], ['B012', 'B0023']];
Roulette.PAYOUT_TABLE['B012'] = [11, 1];
Roulette.PAYOUT_TABLE['B023'] = [11, 1];
Roulette.PAYOUT_TABLE['B0023'] = [11, 1];

Roulette.BASKET4_BETS = [[], ['B4'], []];
Roulette.PAYOUT_TABLE['B4'] = [8, 1];

Roulette.BASKET5_BETS = [[], [], ['B5']];
Roulette.PAYOUT_TABLE['B5'] = [6, 1];

Roulette.OUTSIDE_MATCH_BETS = ['E', 'O', 'R', 'B', 'L18', 'H18'];
Roulette.PAYOUT_TABLE['E'] = [1, 1];
Roulette.PAYOUT_TABLE['O'] = [1, 1];
Roulette.PAYOUT_TABLE['R'] = [1, 1];
Roulette.PAYOUT_TABLE['B'] = [1, 1];
Roulette.PAYOUT_TABLE['L18'] = [1, 1];
Roulette.PAYOUT_TABLE['H18'] = [1, 1];

Roulette.OUTSIDE_DOUBLE_BETS = ['L12', 'M12', 'R12', 'FD', 'MD', 'TD'];
Roulette.PAYOUT_TABLE['L12'] = [2, 1];
Roulette.PAYOUT_TABLE['M12'] = [2, 1];
Roulette.PAYOUT_TABLE['R12'] = [2, 1];
Roulette.PAYOUT_TABLE['FD'] = [2, 1];
Roulette.PAYOUT_TABLE['MD'] = [2, 1];
Roulette.PAYOUT_TABLE['TD'] = [2, 1];

Roulette.get_valid_bets = function(number_of_zeros) {
    var ret = [];
    ret.push.apply(ret, Roulette.STRAIGHT_UP_BETS);
    ret.push.apply(ret, Roulette.STRAIGHT_UP_BETS_ZEROS[number_of_zeros]);
    ret.push.apply(ret, Roulette.SPLIT_BETS);
    ret.push.apply(ret, Roulette.STREET_BETS);
    ret.push.apply(ret, Roulette.CORNER_BETS);
    ret.push.apply(ret, Roulette.DOUBLE_STREET_BETS);
    ret.push.apply(ret, Roulette.BASKET2_BETS[number_of_zeros]);
    ret.push.apply(ret, Roulette.BASKET3_BETS[number_of_zeros]);
    ret.push.apply(ret, Roulette.BASKET4_BETS[number_of_zeros]);
    ret.push.apply(ret, Roulette.BASKET5_BETS[number_of_zeros]);
    ret.push.apply(ret, Roulette.OUTSIDE_MATCH_BETS);
    ret.push.apply(ret, Roulette.OUTSIDE_DOUBLE_BETS);

    var ret2 = {};
    for( var k in ret ) {
        ret2[ret[k]] = true;
    }

    return ret2;
}

Roulette.get_winning_bets_for_number = function(n) {
    var bets = [];
    
    if( n >= 1 ) {
        // Straight up bet
        bets.push('N' + n);

        // Split bets
        if( (n % 3) == 0 ) {
            bets.push('A' + (n-1));
        } else if ( (n % 3) == 2 ) {
            bets.push('A' + (n-1));
            bets.push('A' + (n));
        } else {
            bets.push('A' + (n));
        }

        if(n < 34) {
            bets.push('D' + (n));
        }
        if(n > 3) {
            bets.push('D' + (n-3));
        }

        // Street bets
        bets.push('S' + (1+Math.floor( (n-1)/3)*3))

        // Corner bets
        if((n % 3) != 1 && n > 3) {
            bets.push('C' + (n-4));
        }
        if((n % 3) != 0 && n > 3) {
            bets.push('C' + (n-3));
        }
        if((n % 3) != 1 && n < 34) {
            bets.push('C' + (n-1));
        }
        if((n % 3) != 0 && n < 34) {
            bets.push('C' + (n));
        }

        // Double street bets
        /*
        if(n > 3) {
            bets.push('DS' + (1+Math.floor((n-3)/3)*3));
        }
        bets.push('DS' + (1+Math.floor(n/3)*3));
        */
        //  - The above formula is not correct for DS34 --> #36
        if (n != 0) {
            bets.push('DS' + ((Math.floor((n - 1) / 6) * 6) + 1));
        }
        if (n > 3 && n < 34) {
            bets.push('DS' + ((Math.floor((n - 4) / 6) * 6) + 4));
        }


        // Evens
        if((n % 2) == 1) {
            bets.push('O');
        } else {
            bets.push('E');
        }

        // Red/Black
        var reds = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
        var has_red = false;
        for( var r in reds ) {
            if( reds[r] == n ) {
                bets.push('R');
                has_red = true;
                break;
            }
        }

        if(!has_red) {
            bets.push('B');
        }

        // High/Low
        if(n <= 18) {
            bets.push('L18');
        } else {
            bets.push('H18');
        }

        // Columns
        if((n % 3) == 1) {
            bets.push('L12');
        }
        if((n % 3) == 2) {
            bets.push('M12');
        }
        if((n % 3) == 0) {
            bets.push('R12');
        }

        // Dozens
        if(n <= 12) {
            bets.push('FD');
        } else if(n <= 24) {
            bets.push('MD');
        } else {
            bets.push('TD');
        }
    }

    if(n == -1) {
        bets.push("N00");
        bets.push("B003");
        bets.push("B0023");
        bets.push("B5");
    }
    if(n == 0) {
        bets.push("N0");
        bets.push("B01");
        bets.push("B02");
        bets.push("B03");
        bets.push("B003");
        bets.push("B012");
        bets.push("B023");
        bets.push("B0023");
        bets.push("B4");
        bets.push("B5");
    }
    if(n == 1) {
        bets.push('B01');
        bets.push('B012');
        bets.push('B4');
        bets.push('B5');
    }
    if(n == 2) {
        bets.push('B02');
        bets.push('B012');
        bets.push('B023');
        bets.push('B0023');
        bets.push('B4');
        bets.push('B5');
    }
    if(n == 3) {
        bets.push('B03');
        bets.push('B003');
        bets.push('B023');
        bets.push('B0023');
        bets.push('B4');
        bets.push('B5');
    }

    var ret = {};
    for( var k in bets ) {
        ret[bets[k]] = true;
    }

    return ret;
}

Roulette.evaluate_game = function(valid_bets, bet_table, n) {
    var winning_bets = Roulette.get_winning_bets_for_number(n);

    var prizes = {};
    var total_bet = 0;
    var lost = 0;

    for( var k in bet_table ) {
        if( k in valid_bets ) {
            var bet = bet_table[k];
            total_bet += bet;
            if( k in winning_bets ) {
                prizes[k] = Math.floor(Roulette.PAYOUT_TABLE[k][0] * ( bet / Roulette.PAYOUT_TABLE[k][1] )) + bet;
            } else {
                lost += bet;
            }
        }
    }

    return [prizes, total_bet, lost];
}

Roulette.get_progressive_hand_name = function(progressive_hand) {
    return {0: "None", 1: "One zero", 2: "Two zeroes", 3: "Three zeroes"}[progressive_hand];
}

Roulette.get_pretty_game_eval = function(prizes, num_bets) {
    num_bets = num_bets || 2;
    //console.log("Evaluating: " + JSON.stringify(prizes));

    // Goal is to build a list of bets and return the top bets winners
    var wins = new Array();

    var winning_bet_count = 0;
    for( var k in prizes ) {
        if( prizes[k] != 0 ) winning_bet_count += 1;
    }

    if( winning_bet_count == 0 ) {
        return "Nothing";
    }

    // Straight up bets 35:1
    for( var i = 0; i < 37; i++ ) {
        var k = "N" + i;
        if( k in prizes && prizes[k] != 0 ) {
            wins.push("Hit " + i);
        }
    }

    if( 'N00' in prizes && prizes['00'] != 0 ) {
        wins.push("Hit 00");
    }

    // Special 2 number basket bets 35:1
    for( var i = 1; i <= 3; i++ ) {
        var k = "B0" + i;
        if( k in prizes && prizes[k] != 0 ) {
            wins.push("0-" + i);
        }
    }

    if( 'B003' in prizes && prizes['B003'] != 0 ) {
        wins.push("00-3");
    }

    // Split bets 17:1
    for( var i = 1; i < 37; i++ ) {
        var k = "A" + i;
        if( k in prizes && prizes[k] != 0 ) {
            wins.push("" + i + "-" + (i+1));
        }

        var k = "D" + i;
        if( k in prizes && prizes[k] != 0 ) {
            wins.push("" + i + "-" + (i+3));
        }
    }

    // Street bets 11:1
    for( var i = 1; i < 37; i += 3 ) {
        var k = "S" + i;
        if( k in prizes && prizes[k] != 0 ) {
            wins.push("" + i + "-" + (i+2));
        }
    }

    // Basket 3 number bets 11:1
    if( 'B012' in prizes && prizes['B012'] != 0) {
        wins.push("0-1-2")
    }

    if( 'B023' in prizes && prizes['B023'] != 0) {
        wins.push("0-2-3")
    }

    if( 'B0023' in prizes && prizes['B0023'] != 0) {
        wins.push("00-2-3")
    }

    // Corner bets 8:1
    for( var i = 1; i < 33; i++ ) {
        var k = "C" + i;
        if( k in prizes && prizes[k] != 0 ) {
            wins.push("" + i + "-" + (i+1) + "-" + (i+3) + "-" + (i+4));
        }
    }

    // Basket 4 number bet 8:1
    if( 'B4' in prizes && prizes['B4'] != 0 ) {
        wins.push('0-1-2-3');
    }

    // Basket 5 number bet 6:1
    if( 'B5' in prizes && prizes['B5'] != 0 ) {
        wins.push('0-00-1-2-3');
    }

    // Double street bets 5:1
    for( var i = 1; i < 35; i++ ) {
        var k = "DS" + i;
        if( k in prizes && prizes[k] != 0 ) {
            wins.push("" + i + "-" + (i+5));
        }
    }

    // Outside 2:1 bets
    if( 'L12' in prizes && prizes['L12'] != 0 ) {
        wins.push("1-34");
    }

    if( 'M12' in prizes && prizes['M12'] != 0 ) {
        wins.push("2-35");
    }

    if( 'R12' in prizes && prizes['R12'] != 0 ) {
        wins.push("3-36");
    }

    if( 'FD' in prizes && prizes['FD'] != 0 ) {
        wins.push("1st 12");
    }

    if( 'MD' in prizes && prizes['MD'] != 0 ) {
        wins.push("2nd 12");
    }

    if( 'TD' in prizes && prizes['TD'] != 0 ) {
        wins.push("3rd 12");
    }

    // Outside 1:1 bets
    if( 'E' in prizes && prizes['E'] != 0 ) {
        wins.push("Even");
    }

    if( 'O' in prizes && prizes['O'] != 0 ) {
        wins.push("Odd");
    }

    if( 'R' in prizes && prizes['R'] != 0 ) {
        wins.push("Red");
    }

    if( 'B' in prizes && prizes['B'] != 0 ) {
        wins.push("Black");
    }

    if( 'L18' in prizes && prizes['L18'] != 0 ) {
        wins.push("1-18");
    }

    if( 'H18' in prizes && prizes['H18'] != 0 ) {
        wins.push("19-36");
    }

    return wins.slice(0, num_bets).join(", ")
}


Roulette.get_bet_winning_numbers = function(bet_id) {
     var code = bet_id[0];
     var num = parseInt( bet_id.substring(1) );
     if( code == 'N' ) {
        return [ num ];
     }
     else if( code == 'S' ) {
        return [ num, num+1, num+2 ];
     }
     else if( code == 'D' ) {
        if( bet_id[1] == 'S' ) {
            // DSi
            num = parseInt( bet_id.substring(2) );
            return [ num, num+1, num+2, num+3, num+4, num+5 ];
        }
        else {
            // Di
            return [ num, num+3 ];
        }
     }
     else if( code == 'A' ) {
        return [ num, num+1 ];
     }
     else if( code == 'C' ) {
        return [ num, num+1, num+3, num+4 ];
     }
     else if( bet_id == 'R12' ) {
        return [ 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36 ];
     }
     else if( bet_id == 'M12' ) {
        return [ 2,5,8,11,14,17,20,23,26,29,32,35];
     }
     else if( bet_id == 'L12' ) {
        return [ 1,4,7,10,13,16,19,22,25,28,31,34 ];
     }
     else if( bet_id == 'FD' ) {
        return [1,2,3,4,5,6,7,8,9,10,11,12];
     }
     else if( bet_id == 'MD' ) {
        return [13,14,15,16,17,18,19,20,21,22,23,24];
     }
     else if( bet_id == 'TD' ) {
        return [25,26,27,28,29,30,31,32,33,34,35,36];
     }
     else if( bet_id == 'E' ) {
        return [2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36];
     }
     else if( bet_id == 'O' ) {
        return [1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35];
     }
     else if( bet_id == 'L18' ) {
        return [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18];
     }
     else if( bet_id == 'H18' ) {
        return [19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36];
     }
     else if( bet_id == 'R' ) {
        return [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
     }
     else if( bet_id == 'B' ) {
        return [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];
     }
     else if( bet_id == 'B01' ) {
        return [0,1];   
     }
     else if( bet_id == 'B02' ) {
        return [0,2];   
     }
     else if( bet_id == 'B03' ) {
        return [0,3];   
     }
     else if( bet_id == 'B012' ) {
        return [0,1,2];   
     }
     else if( bet_id == 'B023' ) {
        return [0,2,3];   
     }
     else if( bet_id == 'B4' ) {
        return [0,1,2,3];   
     }
     else {
        console.log("ERROR: bad bet passed to: get_bet_winning_numbers ");
        return [];
     }
}

Roulette.get_bet_name = function(bet_id) {
    var code = bet_id[0];
    var winning_nums = Roulette.get_bet_winning_numbers(bet_id).join();
    if( code == 'N' ) {
        var num = parseInt( bet_id.substring(1) );
        return "Straight up (" + num + ")";
    }
    else if( code == 'S' ) {
        return "Street (" + winning_nums + ")";
    }
    else if( code == 'D' ) {
        if( bet_id[1] == 'S' ) {
            return "Double Street (" + winning_nums + ")";
        }
        else {
            return "Split (" + winning_nums + ")";
            // Di
            return [ num, num+3 ];
        }
    }
    else if( code == 'A' ) {
        return "Split (" + winning_nums + ")";
    }
    else if( code == 'C' ) {
        return "Corner (" + winning_nums + ")";
    }
    else if( bet_id == 'R12' ) {
        return "Top Row";
    }
    else if( bet_id == 'M12' ) {
        return "Middle Row";
    }
    else if( bet_id == 'L12' ) {
        return "Bottom Row";
    }
    else if( bet_id == 'FD' ) {
        return "First Twelve";
    }
    else if( bet_id == 'MD' ) {
        return "Second Twelve";
    }
    else if( bet_id == 'TD' ) {
        return "Third Twelve";
    }
    else if( bet_id == 'E' ) {
        return "Even";
    }
    else if( bet_id == 'O' ) {
        return "Odd";
    }
    else if( bet_id == 'L18' ) {
        return "Low Number";
    }
    else if( bet_id == 'H18' ) {
        return "High Number";
    }
    else if( bet_id == 'R' ) {
        return "Red";
    }
    else if( bet_id == 'B' ) {
        return "Black";
    }
    else if( bet_id == 'B01' ) {
        return "Basket (" + winning_nums + ")";
    }
    else if( bet_id == 'B02' ) {
        return "Basket (" + winning_nums + ")";
    }
    else if( bet_id == 'B03' ) {
        return "Basket (" + winning_nums + ")";
    }
    else if( bet_id == 'B012' ) {
        return "Basket (" + winning_nums + ")";
    }
    else if( bet_id == 'B023' ) {
        return "Basket (" + winning_nums + ")";
    }
    else if( bet_id == 'B4' ) {
        return "Basket (" + winning_nums + ")";
    }
    else {
        console.log("ERROR: bad bet passed to: get_bet_name ");
        return [];
    }
}
/*
Roulette.get_bet_payout = function(bet_id) {
    var code = bet_id[0];
    if( code == 'N' ) {
        return "36:1";
    }
    else if( code == 'S' ) {
        return "11:1";
    }
    else if( code == 'D' ) {
        if( bet_id[1] == 'S' ) {
            return "6:1";
        }
        else {
            return "17:1";
        }
    }
    else if( code == 'A' ) {
        return "17:1";
    }
    else if( code == 'C' ) {
        return "8:1";
    }
    else if( bet_id == 'R12' ) {
        return "2:1";
    }
    else if( bet_id == 'M12' ) {
        return "2:1";
    }
    else if( bet_id == 'L12' ) {
        return "2:1";
    }
    else if( bet_id == 'FD' ) {
        return "2:1";
    }
    else if( bet_id == 'MD' ) {
        return "2:1";
    }
    else if( bet_id == 'TD' ) {
        return "2:1";
    }
    else if( bet_id == 'E' ) {
        return "1:1";
    }
    else if( bet_id == 'O' ) {
        return "1:1";
    }
    else if( bet_id == 'L18' ) {
        return "1:1";
    }
    else if( bet_id == 'H18' ) {
        return "1:1";
    }
    else if( bet_id == 'R' ) {
        return "1:1";
    }
    else if( bet_id == 'B' ) {
        return "1:1";
    }
    else if( bet_id == 'B01' ) {
        return "???";
    }
    else if( bet_id == 'B02' ) {
        return "???";
    }
    else if( bet_id == 'B03' ) {
        return "???";
    }
    else if( bet_id == 'B012' ) {
        return "???";
    }
    else if( bet_id == 'B023' ) {
        return "???";
    }
    else if( bet_id == 'B4' ) {
        return "???";
    }
    else {
        console.log("ERROR: bad bet passed to: get_bet_payout ");
        return [];
    }
}
*/

Roulette.is_number_black = function(num) {
    var blacks = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];
    for( var i = 0; i < blacks.length; i++ ) {
        if( num == blacks[i] ) {
            return true;
        }
    }
    return false;
}
Roulette.is_number_red = function(num) {
    //  - note, can't just do !black since there is 0.
    var reds = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
    for( var i = 0; i < reds.length; i++ ) {
        if( num == reds[i] ) {
            return true;
        }
    }
    return false;
}
