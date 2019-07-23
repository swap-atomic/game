
Craps = function() {
}

Craps.PROGRESSIVE_HAND_NOTHING = 0;
Craps.PROGRESSIVE_HAND_ONE_SIX = 1;
Craps.PROGRESSIVE_HAND_TWO_SIXES = 2;
Craps.PROGRESSIVE_HAND_THREE_SIXES = 3;
Craps.PROGRESSIVE_HAND_FOUR_SIXES = 4;
Craps.PROGRESSIVE_HAND_FIVE_SIXES = 5;
Craps.PROGRESSIVE_HAND_SIX_SIXES = 6;
Craps.PROGRESSIVE_HAND_JACKPOT = Craps.PROGRESSIVE_HAND_SIX_SIXES;

Craps.PASS_LINE_WIN = [1,1];
Craps.DONT_PASS_LINE_WIN = [1,1];
Craps.COME_LINE_WIN = [1,1];
Craps.DONT_COME_LINE_WIN = [1,1];
Craps.FOUR_TEN_ODDS = [2,1];
Craps.FIVE_NINE_ODDS = [3,2];
Craps.SIX_EIGHT_ODDS = [6,5];
Craps.DONT_FOUR_TEN_ODDS = [1,2];
Craps.DONT_FIVE_NINE_ODDS = [2,3];
Craps.DONT_SIX_EIGHT_ODDS = [5,6];

Craps.PASS_ODDS = {4: Craps.FOUR_TEN_ODDS, 10: Craps.FOUR_TEN_ODDS, 5: Craps.FIVE_NINE_ODDS, 9: Craps.FIVE_NINE_ODDS, 6: Craps.SIX_EIGHT_ODDS, 8: Craps.SIX_EIGHT_ODDS };
Craps.DONT_PASS_ODDS = {4: Craps.DONT_FOUR_TEN_ODDS, 10: Craps.DONT_FOUR_TEN_ODDS, 5: Craps.DONT_FIVE_NINE_ODDS, 9: Craps.DONT_FIVE_NINE_ODDS, 6: Craps.DONT_SIX_EIGHT_ODDS, 8: Craps.DONT_SIX_EIGHT_ODDS };

Craps.COME_ODDS = {4: Craps.FOUR_TEN_ODDS, 10: Craps.FOUR_TEN_ODDS, 5: Craps.FIVE_NINE_ODDS, 9: Craps.FIVE_NINE_ODDS, 6: Craps.SIX_EIGHT_ODDS, 8: Craps.SIX_EIGHT_ODDS };
Craps.DONT_COME_ODDS = {4: Craps.DONT_FOUR_TEN_ODDS, 10: Craps.DONT_FOUR_TEN_ODDS, 5: Craps.DONT_FIVE_NINE_ODDS, 9: Craps.DONT_FIVE_NINE_ODDS, 6: Craps.DONT_SIX_EIGHT_ODDS, 8: Craps.DONT_SIX_EIGHT_ODDS };

Craps.PLACE_FOUR_TEN_ODDS = [39,20];
Craps.PLACE_FIVE_NINE_ODDS = [29,20];
Craps.PLACE_SIX_EIGHT_ODDS = [29,25];
Craps.PLACE_ODDS = {4: Craps.PLACE_FOUR_TEN_ODDS, 10: Craps.PLACE_FOUR_TEN_ODDS, 5: Craps.PLACE_FIVE_NINE_ODDS, 9: Craps.PLACE_FIVE_NINE_ODDS, 6: Craps.PLACE_SIX_EIGHT_ODDS, 8: Craps.PLACE_SIX_EIGHT_ODDS };

Craps.DONT_PLACE_FOUR_TEN_ODDS = [19,40];
Craps.DONT_PLACE_FIVE_NINE_ODDS = [19,30];
Craps.DONT_PLACE_SIX_EIGHT_ODDS = [4,5];
Craps.DONT_PLACE_ODDS = {4: Craps.DONT_PLACE_FOUR_TEN_ODDS, 10: Craps.DONT_PLACE_FOUR_TEN_ODDS, 5: Craps.DONT_PLACE_FIVE_NINE_ODDS, 9: Craps.DONT_PLACE_FIVE_NINE_ODDS, 6: Craps.DONT_PLACE_SIX_EIGHT_ODDS, 8: Craps.DONT_PLACE_SIX_EIGHT_ODDS };

Craps.BUY_FOUR_TEN_ODDS = [2,1];
Craps.BUY_FIVE_NINE_ODDS = [3,2];
Craps.BUY_SIX_EIGHT_ODDS = [6,5];
Craps.BUY_ODDS = {4: Craps.BUY_FOUR_TEN_ODDS, 10: Craps.BUY_FOUR_TEN_ODDS, 5: Craps.BUY_FIVE_NINE_ODDS, 9: Craps.BUY_FIVE_NINE_ODDS, 6: Craps.BUY_SIX_EIGHT_ODDS, 8: Craps.BUY_SIX_EIGHT_ODDS };

Craps.LAY_FOUR_TEN_ODDS = [1,2];
Craps.LAY_FIVE_NINE_ODDS = [2,3];
Craps.LAY_SIX_EIGHT_ODDS = [5,6];
Craps.LAY_ODDS = {4: Craps.LAY_FOUR_TEN_ODDS, 10: Craps.LAY_FOUR_TEN_ODDS, 5: Craps.LAY_FIVE_NINE_ODDS, 9: Craps.LAY_FIVE_NINE_ODDS, 6: Craps.LAY_SIX_EIGHT_ODDS, 8: Craps.LAY_SIX_EIGHT_ODDS };

Craps.BIG_SIX_EIGHT_ODDS = [1,1];
Craps.HARD_FOUR_TEN_ODDS = [15,2];
Craps.HARD_SIX_EIGHT_ODDS = [19,2];

// odds from http://www.crapscasinos.org/how-to-play-craps/types-of-bets/
Craps.PROP_TWO_TWELVE_ODDS = [34,1];
Craps.PROP_THREE_ELEVEN_ODDS = [33,2];
Craps.PROP_SEVEN_ODDS = [29,6];
Craps.PROP_ODDS = {2:Craps.PROP_TWO_TWELVE_ODDS, 12:Craps.PROP_TWO_TWELVE_ODDS, 3:Craps.PROP_THREE_ELEVEN_ODDS, 11:Craps.PROP_THREE_ELEVEN_ODDS, 7:Craps.PROP_SEVEN_ODDS};
Craps.PROP_CRAPS_ODDS = [31,4];
Craps.PROPCE_CRAPS_ODDS = [7,2];
Craps.PROPCE_ELEVEN_ODDS = [7,1];
Craps.PROPCE_ODDS = {2:Craps.PROPCE_CRAPS_ODDS, 3:Craps.PROPCE_CRAPS_ODDS, 12:Craps.PROPCE_CRAPS_ODDS, 11:Craps.PROPCE_ELEVEN_ODDS};

Craps.FIELD_TWO_ODDS = [2.5,1];
Craps.FIELD_TWELVE_ODDS = [3,1];
Craps.FIELD_ODDS = [1,1];

// These numbers are for 3X-4X-5X odds on the pass line
Craps.PASS_ODDS_LIMITS = {4: 3, 10: 3, 5: 4, 9: 4, 6: 5, 8: 5};
Craps.DONT_PASS_ODDS_LIMITS = {4: 6, 10: 6, 5: 6, 9: 6, 6: 6, 8: 6};

Craps.COME_ODDS_LIMITS = {4: 3, 10: 3, 5: 4, 9: 4, 6: 5, 8: 5};
Craps.DONT_COME_ODDS_LIMITS = {4: 6, 10: 6, 5: 6, 9: 6, 6: 6, 8: 6};

Craps.BETS_REQUIRING_COMMISSION = {"B4":true, "B5":true, "B6":true, "B8":true, "B9":true, "B10":true, "L4":true, "L5":true, "L6":true, "L8":true, "L9":true, "L10":true};

Craps.get_table_odds = function() {
    return {
        'pass_line': Craps.PASS_LINE_WIN,
        'dont_pass_line': Craps.DONT_PASS_LINE_WIN,
        'come_line': Craps.COME_LINE_WIN,
        'dont_come_line': Craps.DONT_COME_LINE_WIN,
        'four_ten': Craps.FOUR_TEN_ODDS,
        'five_nine': Craps.FIVE_NINE_ODDS,
        'six_eight': Craps.SIX_EIGHT_ODDS,
        'dont_four_ten': Craps.DONT_FOUR_TEN_ODDS,
        'dont_five_nine': Craps.DONT_FIVE_NINE_ODDS,
        'dont_six_eight': Craps.DONT_SIX_EIGHT_ODDS,
        'place_four_ten': Craps.PLACE_FOUR_TEN_ODDS,
        'place_five_nine': Craps.PLACE_FIVE_NINE_ODDS,
        'place_six_eight': Craps.PLACE_SIX_EIGHT_ODDS,
        'dont_place_four_ten': Craps.DONT_PLACE_FOUR_TEN_ODDS,
        'dont_place_five_nine': Craps.DONT_PLACE_FIVE_NINE_ODDS,
        'dont_place_six_eight': Craps.DONT_PLACE_SIX_EIGHT_ODDS,
        'buy_four_ten': Craps.BUY_FOUR_TEN_ODDS,
        'buy_five_nine': Craps.BUY_FIVE_NINE_ODDS,
        'buy_six_eight': Craps.BUY_SIX_EIGHT_ODDS,
        'lay_four_ten': Craps.LAY_FOUR_TEN_ODDS,
        'lay_five_nine': Craps.LAY_FIVE_NINE_ODDS,
        'lay_six_eight': Craps.LAY_SIX_EIGHT_ODDS,
        'big_six_eight': Craps.BIG_SIX_EIGHT_ODDS,
        'hard_four_ten': Craps.HARD_FOUR_TEN_ODDS,
        'hard_six_eight': Craps.HARD_SIX_EIGHT_ODDS,
        'prop_two_twelve': Craps.PROP_TWO_TWELVE_ODDS,
        'prop_three_eleven': Craps.PROP_THREE_ELEVEN_ODDS,
        'prop_seven': Craps.PROP_SEVEN_ODDS,
        'prop_craps': Craps.PROP_CRAPS_ODDS,
        'prop_craps_eleven': Craps.PROPCE_ODDS,
        'prop_odds': Craps.PROP_ODDS,
        'field_two': Craps.FIELD_TWO_ODDS,
        'field_twelve': Craps.FIELD_TWELVE_ODDS,
        'field': Craps.FIELD_ODDS,
        'pass_limits': Craps.PASS_ODDS_LIMITS,
        'dont_pass_limits': Craps.DONT_PASS_ODDS_LIMITS,
        'come_limits': Craps.COME_ODDS_LIMITS,
        'dont_come_limits': Craps.DONT_COME_ODDS_LIMITS
    }
}

Craps.get_all_bet_names = function() {
    return ['P', 'DP', 'C', 'DC', 'PO', 'DPO', "PL4", "PL5", "PL6", "PL8",
            "PL9", "PL10", "DPL4", "DPL5", "DPL6", "DPL8", "DPL9", "DPL10", "B4", "B5",
            "B6", "B8", "B9", "B10", "L4", "L5", "L6", "L8", "L9", "L10", "BIG6",
            "BIG8", "H4", "H6", "H8", "H10", "PROP2", "PROP3", "PROP7", "PROP11",
            "PROP12", "PROPC", "PROPCE", "F", "CO4", "CO5", "CO6", "CO8", "CO9",
            "CO10", "DCO4", "DCO5", "DCO6", "DCO8", "DCO9", "DCO10"];
}

Craps.get_odds_for_bet = function(bet_key, the_point) {
    var table_odds = Craps.get_table_odds();
    if( bet_key == "P" ) return table_odds.pass_line;
    if( bet_key == "PO" ) return Craps.PASS_ODDS[the_point];
    if( bet_key == "DPO" ) return Craps.DONT_PASS_ODDS[the_point];
    if( bet_key == "DP" ) return table_odds.dont_pass_line;
    if( bet_key == "C" ) return table_odds.pass_line;
    if( bet_key.slice(0,2) == "CO" ) return Craps.COME_ODDS[bet_key.slice(2)];
    if( bet_key.slice(0,3) == "DCO" ) return Craps.DONT_COME_ODDS[bet_key.slice(3)];
    if( bet_key == "DC" ) return table_odds.dont_pass_line;
    if( bet_key[0] == "H" ) return (bet_key[1] == '6' || bet_key[1] == '8') ? table_odds.hard_six_eight : table_odds.hard_four_ten;
    if( bet_key.slice(0,4) == "BIG" ) return table_odds.big_six_eight;
    if( bet_key[0] == "B" ) return (bet_key[1] == '4' || bet_key[1] == '1') ? table_odds.buy_four_ten :
                                        ((bet_key[1] == '5' || bet_key[1] == '9') ? table_odds.buy_five_nine :
                                            table_odds.buy_six_eight);
    if( bet_key[0] == "L" ) return (bet_key[1] == '4' || bet_key[1] == '1') ? table_odds.lay_four_ten :
                                        ((bet_key[1] == '5' || bet_key[1] == '9') ? table_odds.lay_five_nine :
                                            table_odds.lay_six_eight);
    if( bet_key == "F" ) return table_odds.field;
    if( bet_key.slice(0,2) == "PL" ) return (bet_key[2] == '4' || bet_key[2] == '1') ? table_odds.place_four_ten :
                                                ((bet_key[2] == '5' || bet_key[2] == '9') ? table_odds.place_five_nine :
                                                    table_odds.place_six_eight);
    if( bet_key.slice(0,3) == "DPL" ) return (bet_key[3] == '4' || bet_key[3] == '1') ? table_odds.dont_place_four_ten :
                                                ((bet_key[3] == '5' || bet_key[3] == '9') ? table_odds.dont_place_five_nine :
                                                    table_odds.dont_place_six_eight);
    if( bet_key == "PROP2" || bet_key == "PROP3" || bet_key == "PROP7" || bet_key == "PROP11" || bet_key == "PROP12" ) return table_odds.prop_odds[parseInt(bet_key.slice(4))];
    if( bet_key == "PROPC" ) return table_odds.prop_craps;
    if( bet_key == "PROPCE" ) return "Varies";

    return "nil";
}

Craps.get_max_bet_for_odds_bet = function(bet_key, current_bets, the_point) {
    var src_key;
    var multiplier;
    if(bet_key.indexOf("DCO") == 0) {
        multiplier = Craps.DONT_COME_ODDS_LIMITS[parseInt(bet_key.slice(3))];
        src_key = "DC" + bet_key.slice(3);
    }
    if(bet_key.indexOf("CO") == 0) {
        multiplier = Craps.COME_ODDS_LIMITS[parseInt(bet_key.slice(2))];
        src_key = "C" + bet_key.slice(2);
    }
    if(bet_key == "PO") {
        multiplier = Craps.PASS_ODDS_LIMITS[the_point];
        src_key = "P";
    }
    if(bet_key == "DPO") {
        multiplier = Craps.DONT_PASS_ODDS_LIMITS[the_point];
        src_key = "DP";
    }
    if(!(src_key in current_bets)) return 0;
    return current_bets[src_key] * multiplier;
}

Craps.is_legal_bet = function(the_point, current_bets, bet, bet_amount) {
    // TODO - you CAN place a "put" bet by combining a pass/come bet with
    // odds if you miss a come out roll, though "At casinos that offer 3-4-5X
    // odds, or worse, there is no reason to make a put bet, because you will do
    // equal or bettor to make a place or buy bet."

    if(bet_amount <= 0) {
        return false;
    }

    // TODO - some bets can be increased! others cannot...
    if(bet in current_bets) {
        return false;
    }
    
    //don't allow don't come line bets without a point
    var numbers = ["4","5","6","8","9","10"];
    var bet_types = ["L","DPL","PL","B"];
        
    for (var number in numbers) {
        for (var bet_type in bet_types) {
         var currentBet = bet_types[bet_type].concat(numbers[number])
            if (bet == currentBet) {
                 return the_point != null;
            }
        }
    }

    // Can only bet Pass bet if you haven't bet on it before
    // Pass bet can be bet any time, though odds are bad if you bet after coming out
    if(bet == "P") {
        return true;
    }

    // Can only bet Dont Pass bet if you haven't bet on it before
    else if(bet == "DP") {
        return the_point == null;
    }

    // Come bets can only be made when its not the coming out roll
    else if(bet in {'C':true, 'DC':true}) {
        return the_point != null;
    }

    // Can only place odds on Pass after the coming out roll
    else if(bet == "PO") {
        // Check that we're betting less than the 3-4-5X limit
        if(the_point != null && "P" in current_bets) {
            if(bet_amount <= Craps.PASS_ODDS_LIMITS[the_point] * current_bets["P"]) {
                return true;
            }       
        }
    }

    else if(bet == "DPO") {
        if(the_point != null && "DP" in current_bets) {
            if(bet_amount <= Craps.DONT_PASS_ODDS_LIMITS[the_point] * current_bets["DP"]) {
                return true;
            }
        }
    }

    else if(bet in {"PL4":true, "PL5":true, "PL6":true, "PL8":true, "PL9":true, "PL10":true}) {
        return true;
    }

    else if(bet in {"DPL4":true, "DPL5":true, "DPL6":true, "DPL8":true, "DPL9":true, "DPL10":true}) {
        return true;
    }

    else if(bet in {"B4":true, "B5":true, "B6":true, "B8":true, "B9":true, "B10":true}) {
        return true;
    }

    else if(bet in {"L4":true, "L5":true, "L6":true, "L8":true, "L9":true, "L10":true}) {
        return true;
    }

    else if(bet in {"CO4":true, "CO5":true, "CO6":true, "CO8":true, "CO9":true, "CO10":true, "DCO4":true, "DCO5":true, "DCO6":true, "DCO8":true, "DCO9":true, "DCO10":true}) {
        if(the_point != null && bet.replace(/CO/g, "C") in current_bets) {
            var n = parseInt(bet.replace(/DCO/,"").replace(/CO/,""));
            if(bet[0] == 'D') {
                if(bet_amount <= Craps.DONT_PASS_ODDS_LIMITS[n] * current_bets[bet.replace(/CO/,"C")]) {
                    return true;
                }
            } else {
                if(bet_amount <= Craps.PASS_ODDS_LIMITS[n] * current_bets[bet.replace(/CO/,"C")]) {
                    return true;
                }
            }
        }
    }

    else if(bet in {"BIG6":true, "BIG8":true}) {
        return true;
    }

    else if(bet in {"H4":true, "H6":true, "H8":true, "H10":true}) {
        return true;
    }

    else if(bet in {"PROP2":true, "PROP3":true, "PROP7":true, "PROP11":true, "PROP12":true, "PROPC":true, "PROPCE":true}) {
        return true;
    }

    else if(bet == "F") {
        return true;
    }

    return false;
}

Craps.is_legal_to_remove_with_current_bets = function(the_point, bet, current_bets) {
    if( bet in current_bets ) {
        return Craps.is_legal_to_remove( the_point, bet );
    }
    return [false, {}];
}

Craps.is_legal_to_remove = function(the_point, bet, current_bets) {

    // from www.predictem.com/craps/buy.php - Buy/Lay bets can be increased/reduced at any time.  Not sure why you'd do that,
    // as you've already paid a commission on these bets.
    if(bet in {"B4":true, "B5":true, "B6":true, "B8":true, "B9":true, "B10":true}) {
        return [true, {}];
    }

    else if(bet in {"L4":true, "L5":true, "L6":true, "L8":true, "L9":true, "L10":true}) {
        return [true, {}];
    }

    // http://casinogambling.about.com/od/craps/a/PlaceBets.htm
    // You can also take down your place bets any time you want to since their odds don't change from roll to roll
    else if(bet in {"PL4":true, "PL5":true, "PL6":true, "PL8":true, "PL9":true, "PL10":true}) {
        return [true, {}];
    }

    else if(bet in {"DPL4":true, "DPL5":true, "DPL6":true, "DPL8":true, "DPL9":true, "DPL10":true}) {
        return [true, {}];
    }

    // Odds bets function only to reduce house edge, so they can come off at any time
    else if(bet in {"PO":true, "DPO":true, "CO4":true, "CO5":true, "CO6":true, "CO8":true, "CO9":true, "CO10":true, "DCO4":true, "DCO5":true, "DCO6":true, "DCO8":true, "DCO9":true, "DCO10":true}) {
        return [true, {}];
    }

    // Proposition bets can be taken down any time since they don't change from roll to roll
    else if(bet in {"F":true, "BIG6":true, "BIG8":true, "PROP2":true, "PROP3":true, "PROP7":true, "PROP11":true, "PROP12":true, "PROPC":true, "PROPCE":true, "H4":true, "H6":true, "H8":true, "H10":true}) {
        return [true, {}];
    }

    // Pass can only be removed when a point is not established, as the house has an advantage over the player
    // after the point is established.
    else if(bet == "P") {
        return [the_point == null, {"PO":true}];
    }

    // Don't Pass / Don't Come can be removed at any time, but it's highly recommended against
    // As you have an advantage over the house if the point is established
    else if(bet in {"DP":true, "DC4":true, "DC5":true, "DC6":true, "DC8":true, "DC9":true, "DC10":true}) {
        // you must remove the odds bet if these bets come off
        var r = {};
        r[bet.replace(/DP/,"DPO").replace(/DC/,"DCO")] = true;
        return [true, r];
    }

    // Come Line bet can be removed always (until it has been moved to a point)
    else if(bet in {"C":true, "DC":true}) {
        return [true, {}];
    }

    // Points cannot be removed, they stay until win/lose
    else if(bet in {"C4":true, "C5":true, "C6":true, "C8":true, "C9":true, "C10":true}) {
        return [false, {}];
    }

    return [false, {}];
}

Craps.is_odds_bet = function(bet_key) {
    if(bet_key.indexOf("DCO") == 0) return true;
    if(bet_key.indexOf("CO") == 0) return true;
    if(bet_key == "PO") return true;
    if(bet_key == "DPO") return true;
    return false;
}

Craps.get_winning_and_losing_bets_for_roll = function(the_point, die1, die2) {
    var rolled = die1 + die2;
    var hard   = (die1 == die2);

    var winning_bets = {};
    var losing_bets  = {};
    var pushed_bets  = {};

    if( the_point == null && (rolled == 7 || rolled == 11) ) {
        winning_bets['P'] = Craps.PASS_LINE_WIN;
        losing_bets['DP'] = true;
    }

    if(rolled in {6:true,8:true}) {
        winning_bets["BIG" + rolled] = Craps.BIG_SIX_EIGHT_ODDS;

        if(hard) {
            winning_bets['H' + rolled] = Craps.HARD_SIX_EIGHT_ODDS;
        } else {
            losing_bets["H" + rolled] = true;
        }
    }

    if(rolled in {4:true,10:true}) {
        if(hard) {
            winning_bets['H' + rolled] = Craps.HARD_FOUR_TEN_ODDS;
        } else {
            losing_bets["H" + rolled] = true;
        }
    }

    for( var i in Craps.PROP_ODDS ) {
        if(rolled != i) {
            losing_bets["PROP" + i] = true;
        } else {
            winning_bets["PROP" + i] = Craps.PROP_ODDS[i];
        }
    }

    if(rolled in {2:true, 3:true, 12:true}) {
        winning_bets['PROPC'] = Craps.PROP_CRAPS_ODDS;
    } else {
        losing_bets["PROPC"] = true;
    }

    if(rolled in {2:true, 3:true, 11:true, 12:true}) {
        winning_bets['PROPCE'] = Craps.PROPCE_ODDS[rolled];
    } else {
        losing_bets["PROPCE"] = true;
    }

    if(rolled in {2:true, 3:true, 4:true, 9:true, 10:true, 11:true, 12:true}) {
        if(rolled == 2) {
            winning_bets['F'] = Craps.FIELD_TWO_ODDS;
        } else if(rolled == 12) {
            winning_bets['F'] = Craps.FIELD_TWELVE_ODDS;
        } else {
            winning_bets['F'] = Craps.FIELD_ODDS;
        }
    } else {
        losing_bets["F"] = true;
    }

    if(the_point == null && rolled in {2:true, 3:true, 12:true}) {
        losing_bets['P'] = true;
        if(rolled != 12) { // A don't pass rolled 12 bet on coming out is a push
            winning_bets['DP'] = Craps.DONT_PASS_LINE_WIN;
        } else {
            pushed_bets['DP'] = true;
        }
    }

    if(the_point != null && rolled == 7) {
        winning_bets["DP"] = Craps.DONT_PASS_LINE_WIN;
        winning_bets["DPO"] = Craps.DONT_PASS_ODDS[the_point];
        losing_bets["P"] = true;
        losing_bets["PO"] = true;

        winning_bets["C"] = Craps.COME_LINE_WIN;
        losing_bets["DC"] = true;

        // you aren't supposed to lose your odds on a coming out roll
        winning_bets["DCO4"] = Craps.DONT_COME_ODDS[4];
        winning_bets["DCO5"] = Craps.DONT_COME_ODDS[5];
        winning_bets["DCO6"] = Craps.DONT_COME_ODDS[6];
        winning_bets["DCO8"] = Craps.DONT_COME_ODDS[8];
        winning_bets["DCO9"] = Craps.DONT_COME_ODDS[9];
        winning_bets["DCO10"] = Craps.DONT_COME_ODDS[10];
        losing_bets["CO4"] = true;
        losing_bets["CO5"] = true;
        losing_bets["CO6"] = true;
        losing_bets["CO8"] = true;
        losing_bets["CO9"] = true;
        losing_bets["CO10"] = true;
    }

    if(the_point == null && rolled == 7) {
        winning_bets["P"] = Craps.PASS_LINE_WIN;
        losing_bets["DP"] = true;

        pushed_bets["PO"] = true;
        pushed_bets["CO4"] = true;
        pushed_bets["CO5"] = true;
        pushed_bets["CO6"] = true;
        pushed_bets["CO8"] = true;
        pushed_bets["CO9"] = true;
        pushed_bets["CO10"] = true;
        pushed_bets["DPO"] = true;
        pushed_bets["DCO4"] = true;
        pushed_bets["DCO5"] = true;
        pushed_bets["DCO6"] = true;
        pushed_bets["DCO8"] = true;
        pushed_bets["DCO9"] = true;
        pushed_bets["DCO10"] = true;
    }

    if(rolled == 7) {
        losing_bets["BIG6"] = true;
        losing_bets["BIG8"] = true;
        losing_bets["H4"] = true;
        losing_bets["H6"] = true;
        losing_bets["H8"] = true;
        losing_bets["H10"] = true;

        winning_bets["DC4"] = Craps.DONT_COME_LINE_WIN;
        winning_bets["DC5"] = Craps.DONT_COME_LINE_WIN;
        winning_bets["DC6"] = Craps.DONT_COME_LINE_WIN;
        winning_bets["DC8"] = Craps.DONT_COME_LINE_WIN;
        winning_bets["DC9"] = Craps.DONT_COME_LINE_WIN;
        winning_bets["DC10"] = Craps.DONT_COME_LINE_WIN;

        losing_bets["C4"] = true;
        losing_bets["C5"] = true;
        losing_bets["C6"] = true;
        losing_bets["C8"] = true;
        losing_bets["C9"] = true;
        losing_bets["C10"] = true;

        // Place/Don't Place/Buy/Lay are working through come out
        winning_bets["L4"] = Craps.LAY_FOUR_TEN_ODDS;
        winning_bets["L5"] = Craps.LAY_FIVE_NINE_ODDS;
        winning_bets["L6"] = Craps.LAY_SIX_EIGHT_ODDS;
        winning_bets["L8"] = Craps.LAY_SIX_EIGHT_ODDS;
        winning_bets["L9"] = Craps.LAY_FIVE_NINE_ODDS;
        winning_bets["L10"] = Craps.LAY_FOUR_TEN_ODDS;
        losing_bets["B4"] = true;
        losing_bets["B5"] = true;
        losing_bets["B6"] = true;
        losing_bets["B8"] = true;
        losing_bets["B9"] = true;
        losing_bets["B10"] = true;
        winning_bets["DPL4"] = Craps.DONT_PLACE_FOUR_TEN_ODDS;
        winning_bets["DPL10"] = Craps.DONT_PLACE_FOUR_TEN_ODDS;
        winning_bets["DPL5"] = Craps.DONT_PLACE_FIVE_NINE_ODDS;
        winning_bets["DPL9"] = Craps.DONT_PLACE_FIVE_NINE_ODDS;
        winning_bets["DPL6"] = Craps.DONT_PLACE_SIX_EIGHT_ODDS;
        winning_bets["DPL8"] = Craps.DONT_PLACE_SIX_EIGHT_ODDS;
        losing_bets["PL4"] = true;
        losing_bets["PL5"] = true;
        losing_bets["PL6"] = true;
        losing_bets["PL8"] = true;
        losing_bets["PL9"] = true;
        losing_bets["PL10"] = true;
    }

    if(the_point != null && rolled == 11) {
        losing_bets["DC"] = true;
        winning_bets["C"] = Craps.COME_LINE_WIN;
    }

    if(the_point != null && rolled in {2:true, 3:true, 12:true}) {
        losing_bets["C"] = true;
        if(rolled != 12) {
            winning_bets["DC"] = Craps.DONT_COME_LINE_WIN;
        }
    }

    if(the_point == rolled) {
        winning_bets["P"] = Craps.PASS_LINE_WIN;
        winning_bets["PO"] = Craps.PASS_ODDS[the_point];
        losing_bets["DP"] = true;
        losing_bets["DPO"] = true;
    }

    if(rolled in {4:true,5:true,6:true,8:true,9:true,10:true}) {
        winning_bets["PL" + rolled] = Craps.PLACE_ODDS[rolled];
        winning_bets["B" + rolled] = Craps.BUY_ODDS[rolled];
        losing_bets["DPL" + rolled] = true;
        losing_bets["L" + rolled] = true;

        winning_bets["C" + rolled] = Craps.COME_LINE_WIN;
        losing_bets["DC" + rolled] = true;
        if(the_point == null) {
            pushed_bets["CO" + rolled] = true;
            pushed_bets["DCO" + rolled] = true;
        } else if(the_point != null) {
            winning_bets["CO" + rolled] = Craps.COME_ODDS[rolled];
            losing_bets["DCO" + rolled] = true;
        }
    }

    return {winning_bets: winning_bets, losing_bets: losing_bets, pushed_bets: pushed_bets};
}

Craps.does_bet_require_commission = function(bet_key) {
    return bet_key in Craps.BETS_REQUIRING_COMMISSION;
}

Craps.get_progressive_hand_name = function(progressive_hand) {
    return {0: "Nothing", 1: "One six", 2: "Two sixes", 3: "Three sixes", 4: "Four sixes", 5: "Five sixes", 6: "Six sixes"}[progressive_hand];
}

Craps.get_pretty_game_eval = function(prizes, rolled, num_points_hit, the_point, progressive_hand) {
    // Goal is to build a list of bets and return the top bets winners
    var wins = new Array();

    var winning_bet_count = 0;
    for( var k in prizes ) {
        if( prizes[k] != 0 ) winning_bet_count += 1;
    }

    if( "PROPC" in prizes ) {
        return "Called Craps";
    }

    if( "PROP2" in prizes ) {
        return "Called 2";
    }

    if( "PROP3" in prizes ) {
        return "Called 3";
    }

    if( "PROP11" in prizes ) {
        return "Called 11";
    }

    if( "PROP12" in prizes ) {
        return "Called 12";
    }

    if( the_point == null && (rolled == 2 || rolled == 3 || rolled == 12) ) {
        return "Craps";
    }

    if( the_point == null && rolled == 7 ) {
        if( "PROP7" in prizes ) {
            return "Called Seven";
        }
        return "Coming out Seven";
    }

    if( the_point == null && rolled == 11 && "P" in prizes ) {
        return "Coming out Eleven";
    }

    if( the_point == rolled ) {
        return "Point " + the_point;
    }

    if( the_point != null && rolled == 7 ) {
        if( "PROP7" in prizes ) {
            return "Called 7, Shooter out"
        }
        if( "DP" in prizes ) {
            return "Don't Pass Winner"
        }
        return "7 - Shooter out";
    }

    var s = "C" + rolled;
    var t = "B" + rolled;
    var u = "PL" + rolled;
    if( the_point != null && rolled != the_point && (s in prizes || t in prizes || u in prizes) ) {
        return "Winner on " + rolled;
    }

    if( "BIG6" in prizes || "BIG8" in prizes ) {
        return "Big " + rolled;
    }

    s = "H" + rolled;
    if( s in prizes ) {
        return "Hard Way " + rolled;
    }

    if( "C" in prizes && rolled != 7 ) {
        return "Come Line Winner"
    }

    if( "F" in prizes ) {
        return "Field Winner";
    }

    if( "DC" in prizes && rolled != 7 ) {
        return "Don't Come Winner"
    }

    // should be the last checks
    if( progressive_hand >= Craps.PROGRESSIVE_HAND_THREE_SIXES ) {
        return Craps.get_progressive_hand_name(progressive_hand);
    }

    if( the_point == null && (rolled == 4 || rolled == 5 || rolled == 6 || rolled == 8 || rolled == 9 || rolled == 10) ) {
        return "Coming out"
    }

    return "Nothing";
    //return "PRETTY ME: " + JSON.stringify(prizes) + " (r" + rolled + ") >" + the_point;
}

Craps.get_pretty_bet_name = function(bet_key) {
    // TODO should pretty up some of these bets ("DCO" for Odds on Don't Come is ugly)
    var names = {
        "P": "Pass Line",
        "DP": "Don't Pass Line",
        "PO": "Pass Line Odds",
        "DPO": "Don't Pass Line Odds",
        "C": "Come Line",
        "DC": "Don't Come Line",
        "C4": "Come 4",
        "C5": "Come 5",
        "C6": "Come 6",
        "C8": "Come 8",
        "C9": "Come 9",
        "C10": "Come 10",
        "DC4": "Don't Come 4",
        "DC5": "Don't Come 5",
        "DC6": "Don't Come 6",
        "DC8": "Don't Come 8",
        "DC9": "Don't Come 9",
        "DC10": "Don't Come 10",
        "CO4": "Come 4 Odds",
        "CO5": "Come 5 Odds",
        "CO6": "Come 6 Odds",
        "CO8": "Come 8 Odds",
        "CO9": "Come 9 Odds",
        "CO10": "Come 10 Odds",
        "DCO4": "Don't Come 4 Odds",
        "DCO5": "Don't Come 5 Odds",
        "DCO6": "Don't Come 6 Odds",
        "DCO8": "Don't Come 8 Odds",
        "DCO9": "Don't Come 9 Odds",
        "DCO10": "Don't Come 10 Odds",
        "H4": "Hard 4",
        "H6": "Hard 6",
        "H8": "Hard 8",
        "H10": "Hard 10",
        "PROP2": "Proposition 2",
        "PROP3": "Proposition 3",
        "PROP7": "Proposition 7",
        "PROP11": "Proposition 11",
        "PROP12": "Proposition 12",
        "F": "Field",
        "BIG8": "Big 8",
        "BIG6": "Big 6",
        "PROPC": "Any Craps",
        "PROPCE": "Craps-Eleven",
        "L4": "Lay 4",
        "L5": "Lay 5",
        "L6": "Lay 6",
        "L8": "Lay 8",
        "L9": "Lay 9",
        "L10": "Lay 10",
        "B4": "Buy 4",
        "B5": "Buy 5",
        "B6": "Buy 6",
        "B8": "Buy 8",
        "B9": "Buy 9",
        "B10": "Buy 10",
        "PL4": "Place 4",
        "PL5": "Place 5",
        "PL6": "Place 6",
        "PL8": "Place 8",
        "PL9": "Place 9",
        "PL10": "Place 10",
        "DPL4": "Don't Place 4",
        "DPL5": "Don't Place 5",
        "DPL6": "Don't Place 6",
        "DPL8": "Don't Place 8",
        "DPL9": "Don't Place 9",
        "DPL10": "Don't Place 10",
    };

    if( bet_key in names ) return names[bet_key];

    return bet_key;
}

if(false) {
    $(document).ready(function(){
        var test_is_legal_bet = function(the_point, current_bets, bet, bet_amount, result) {
            var ret = Craps.is_legal_bet(the_point, current_bets, bet, bet_amount, result);
            if( ret != result ) {
                alert("is_legal_bet(" + the_point + ", " + JSON.stringify(current_bets) + ", " + bet + ", " + bet_amount + ") != " + result);
                return;
            }
        };
        var test_is_legal_to_remove = function(the_point, bet, result) {
            var ret = Craps.is_legal_to_remove(the_point, bet, result);
            if( ret[0] != result[0] ) {
                alert("is_legal_to_remove(" + the_point + ", " + bet + ") != " + result[0]);
                return;
            }

            for( var k in ret[1] ) {
                if(!(k in result[1]) || (ret[1][k] != result[1][k])) {
                    alert("(must also remove) is_legal_to_remove(" + the_point + ", " + bet + ") != " + result[0]);
                    return;
                }
            }

            for( var k in result[1] ) {
                if(!(k in ret[1]) || (ret[1][k] != result[1][k])) {
                    alert("(must also remove) is_legal_to_remove(" + the_point + ", " + bet + ") != " + result[0]);
                    return;
                }
            }
        };
        var test_get_winning_and_losing_bets_for_roll = function(the_point, die1, die2, result) {
            var ret = Craps.get_winning_and_losing_bets_for_roll(the_point, die1, die2);

            for( var k in ret.winning_bets ) {
                if(!(k in result[0]) || ret.winning_bets[k] != result[0][k]) {
                    alert("(winners) get_winning_and_losing_bets_for_roll(" + the_point + ", " + die1 + ", " + die2 + ") " + JSON.stringify(ret.winning_bets) + " != " + JSON.stringify(result[0]));
                    return;
                }
            }

            for( var k in result[0] ) {
                if(!(k in ret.winning_bets) || ret.winning_bets[k] != result[0][k]) {
                    alert("(winners) get_winning_and_losing_bets_for_roll(" + the_point + ", " + die1 + ", " + die2 + ") != " + JSON.stringify(result[0]));
                    return;
                }
            }

            for( var k in ret.losing_bets ) {
                if(!(k in result[1])) {
                    alert("(losers) get_winning_and_losing_bets_for_roll(" + the_point + ", " + die1 + ", " + die2 + ") != " + JSON.stringify(result[1]));
                    return;
                }
            }

            for( var k in result[1] ) {
                if(!(k in ret.losing_bets)) {
                    alert("(losers) get_winning_and_losing_bets_for_roll(" + the_point + ", " + die1 + ", " + die2 + ") != " + JSON.stringify(result[1]));
                    return;
                }
            }

            for( var k in ret.pushed_bets ) {
                if(!(k in result[2])) {
                    alert("(pushed) get_winning_and_losing_bets_for_roll(" + the_point + ", " + die1 + ", " + die2 + ") != " + JSON.stringify(result[2]));
                    return;
                }
            }

            for( var k in result[2] ) {
                if(!(k in ret.pushed_bets) ) {
                    alert("(pushed) get_winning_and_losing_bets_for_roll(" + the_point + ", " + die1 + ", " + die2 + ") != " + JSON.stringify(result[2]));
                    return;
                }
            }
        };

        test_is_legal_bet(null, {}, "P", 0,  false);
        test_is_legal_bet(1, {}, "P", 0,  false);
        test_is_legal_bet(1, {"P":1}, "P", 0,  false);
        test_is_legal_bet(null, {}, "P", 1,  true);
        test_is_legal_bet(null, {}, "DP", 1,  true);
        test_is_legal_bet(5, {}, "DP", 1,  false);
        test_is_legal_bet(null, {"P":1}, "P", 1,  false);
        test_is_legal_bet(null, {}, "C", 1,  false);
        test_is_legal_bet(null, {"P":5}, "PO", 1,  false);
        test_is_legal_bet(4, {"P":5}, "PO", 15,  true);
        test_is_legal_bet(4, {"P":5}, "PO", 16,  false);
        test_is_legal_bet(5, {"P":5}, "PO", 20,  true);
        test_is_legal_bet(5, {"P":5}, "PO", 21,  false);
        test_is_legal_bet(5, {"P":5}, "PO", 0,  false);
        test_is_legal_bet(8, {"P":5}, "PO", 25,  true);
        test_is_legal_bet(8, {"P":5}, "PO", 26,  false);
        test_is_legal_bet(9, {"P":5}, "PO", 20,  true);
        test_is_legal_bet(10, {"P":5}, "PO", 15,  true);

        test_is_legal_bet(4, {"DP":5}, "DPO", 30,  true);
        test_is_legal_bet(4, {"DP":5}, "DPO", 31,  false);
        test_is_legal_bet(5, {"DP":5}, "DPO", 30,  true);
        test_is_legal_bet(5, {"DP":5}, "DPO", 32,  false);
        test_is_legal_bet(5, {"DP":5}, "DPO", 0,  false);
        test_is_legal_bet(8, {"DP":5}, "DPO", 30,  true);
        test_is_legal_bet(8, {"DP":5}, "DPO", 35,  false);
        test_is_legal_bet(9, {"DP":5}, "DPO", 30,  true);
        test_is_legal_bet(10, {"DP":5}, "DPO", 15,  true);

        test_is_legal_bet(null, {}, "B4", 100000,  true);
        test_is_legal_bet(4, {}, "B4", 100000,  true);

        test_is_legal_bet(null, {"P":10}, "PL5", 15,  true);
        test_is_legal_bet(4, {"P":10}, "PL5", 15,  true);

        test_is_legal_bet(4, {"C9":1}, "CO9", 4, true);
        test_is_legal_bet(4, {"C9":1}, "CO9", 5, false);
        test_is_legal_bet(4, {"C9":1}, "CO9", 6, false);

        test_is_legal_bet(4, {"P":10}, "F", 15,  true);
        
        //ToDo: fix this
        //test don't come bar on first roll L#, DPL#, PL#, B#
        //#: 4, 5, 6, 8, 9, 10
        var numbers = ["4","5","6","8","9","10"];
        var bet_types = ["L","DPL","PL","B"];
        
        for (var number in numbers) {
            for (var bet in bet_types) {
                test_is_legal_bet(null, {}, bet_types[bet].concat(numbers[number]), 1, false);
            }
        }
        

        test_get_winning_and_losing_bets_for_roll(null, 3, 4, [{"P":Craps.PASS_LINE_WIN,"PROP7":Craps.PROP_SEVEN_ODDS,
                                                              "DC4":Craps.DONT_COME_LINE_WIN,"DC5":Craps.DONT_COME_LINE_WIN,
                                                              "DC6":Craps.DONT_COME_LINE_WIN,"DC8":Craps.DONT_COME_LINE_WIN,
                                                              "DC9":Craps.DONT_COME_LINE_WIN,"DC10":Craps.DONT_COME_LINE_WIN,
                                                              "L4":Craps.LAY_FOUR_TEN_ODDS,"L5":Craps.LAY_FIVE_NINE_ODDS,
                                                              "L6":Craps.LAY_SIX_EIGHT_ODDS,"L8":Craps.LAY_SIX_EIGHT_ODDS,
                                                              "L9":Craps.LAY_FIVE_NINE_ODDS,"L10":Craps.LAY_FOUR_TEN_ODDS,
                                                              "DPL4":Craps.DONT_PLACE_FOUR_TEN_ODDS,"DPL5":Craps.DONT_PLACE_FIVE_NINE_ODDS,
                                                              "DPL6":Craps.DONT_PLACE_SIX_EIGHT_ODDS,"DPL8":Craps.DONT_PLACE_SIX_EIGHT_ODDS,
                                                              "DPL9":Craps.DONT_PLACE_FIVE_NINE_ODDS,"DPL10":Craps.DONT_PLACE_FOUR_TEN_ODDS}, 
                                                              {"DP":true,"BIG6":true,"BIG8":true,"H4":true,"H6":true,"H8":true,"H10":true,"PROP2":true,"PROP3":true,"PROP11":true,"PROP12":true,"PROPC":true,"PROPCE":true,"F":true,"C4":true,"C5":true,"C6":true,"C8":true,"C9":true,"C10":true,"B4":true,"B5":true,"B6":true,"B8":true,"B9":true,"B10":true,"PL4":true,"PL5":true,"PL6":true,"PL8":true,"PL9":true,"PL10":true},
                                                              {"CO4":true, "CO5":true, "CO6":true, "CO8":true, "CO9":true, "CO10":true, "PO":true, "DCO4":true, "DCO5":true, "DCO6":true, "DCO8":true, "DCO9":true, "DCO10":true, "DPO":true}]);

        test_get_winning_and_losing_bets_for_roll(null, 5, 6, [{"P":Craps.PASS_LINE_WIN,"PROP11":Craps.PROP_THREE_ELEVEN_ODDS,"F":Craps.FIELD_ODDS,"PROPCE":Craps.PROPCE_ELEVEN_ODDS}, {"DP":true,"PROP2":true,"PROP3":true,"PROP7":true,"PROP12":true,"PROPC":true}, {}]);
        test_get_winning_and_losing_bets_for_roll(null, 1, 1, [{"DP":Craps.DONT_PASS_LINE_WIN,"PROP2":Craps.PROP_TWO_TWELVE_ODDS,"PROPC":Craps.PROP_CRAPS_ODDS,"F":Craps.FIELD_TWO_ODDS,"PROPCE":Craps.PROPCE_CRAPS_ODDS}, {"P":true,"PROP3":true,"PROP7":true,"PROP11":true,"PROP12":true}, {}]);
        test_get_winning_and_losing_bets_for_roll(null, 2, 1, [{"DP":Craps.DONT_PASS_LINE_WIN,"PROP3":Craps.PROP_THREE_ELEVEN_ODDS,"PROPC":Craps.PROP_CRAPS_ODDS,"F":Craps.FIELD_ODDS,"PROPCE":Craps.PROPCE_CRAPS_ODDS}, {"P":true,"PROP2":true,"PROP7":true,"PROP11":true,"PROP12":true}, {}]);
        test_get_winning_and_losing_bets_for_roll(null, 6, 6, [{"PROP12":Craps.PROP_TWO_TWELVE_ODDS,"PROPC":Craps.PROP_CRAPS_ODDS,"F":Craps.FIELD_TWELVE_ODDS,"PROPCE":Craps.PROPCE_CRAPS_ODDS}, {"P":true,"PROP2":true,"PROP3":true,"PROP7":true,"PROP11":true}, {"DP":true}]);
        test_get_winning_and_losing_bets_for_roll(null, 3, 6, [{"C9":Craps.COME_LINE_WIN,"B9":Craps.BUY_FIVE_NINE_ODDS,"F":Craps.FIELD_ODDS,"PL9":Craps.PLACE_FIVE_NINE_ODDS}, {"PROP2":true,"PROP3":true,"PROP7":true,"PROP11":true,"PROP12":true,"PROPC":true,"PROPCE":true,"DC9":true,"L9":true,"DPL9":true}, {"CO9":true, "DCO9":true}]);
        test_get_winning_and_losing_bets_for_roll(null, 3, 1, [{"C4":Craps.COME_LINE_WIN,"B4":Craps.BUY_FOUR_TEN_ODDS,"F":Craps.FIELD_ODDS,"PL4":Craps.PLACE_FOUR_TEN_ODDS}, {"PROP2":true,"PROP3":true,"PROP7":true,"PROP11":true,"PROP12":true,"PROPC":true,"PROPCE":true,"DC4":true,"L4":true,"DPL4":true,"H4":true}, {"CO4":true, "DCO4":true}]);

        test_get_winning_and_losing_bets_for_roll(4, 5, 2, [{"DP":Craps.DONT_PASS_LINE_WIN,"C":Craps.COME_LINE_WIN, 
                                                           "DPO":Craps.DONT_FOUR_TEN_ODDS,"DPL4":Craps.DONT_PLACE_FOUR_TEN_ODDS,
                                                           "DPL5":Craps.DONT_PLACE_FIVE_NINE_ODDS,"DPL6":Craps.DONT_PLACE_SIX_EIGHT_ODDS,
                                                           "DPL8":Craps.DONT_PLACE_SIX_EIGHT_ODDS,"DPL9":Craps.DONT_PLACE_FIVE_NINE_ODDS,
                                                           "DPL10":Craps.DONT_PLACE_FOUR_TEN_ODDS,"L4":Craps.LAY_FOUR_TEN_ODDS,
                                                           "L5":Craps.LAY_FIVE_NINE_ODDS,"L6":Craps.LAY_SIX_EIGHT_ODDS,
                                                           "L8":Craps.LAY_SIX_EIGHT_ODDS,"L9":Craps.LAY_FIVE_NINE_ODDS,
                                                           "L10":Craps.LAY_FOUR_TEN_ODDS,"PROP7":Craps.PROP_SEVEN_ODDS,
                                                           "DC4":Craps.DONT_COME_LINE_WIN,"DC5":Craps.DONT_COME_LINE_WIN,
                                                           "DC6":Craps.DONT_COME_LINE_WIN,"DC8":Craps.DONT_COME_LINE_WIN,
                                                           "DC9":Craps.DONT_COME_LINE_WIN,"DC10":Craps.DONT_COME_LINE_WIN,
                                                           "DCO4":Craps.DONT_FOUR_TEN_ODDS,"DCO5":Craps.DONT_FIVE_NINE_ODDS,
                                                           "DCO6":Craps.DONT_SIX_EIGHT_ODDS,"DCO8":Craps.DONT_SIX_EIGHT_ODDS,
                                                           "DCO9":Craps.DONT_FIVE_NINE_ODDS,"DCO10":Craps.DONT_FOUR_TEN_ODDS}, {"P":true, "PO":true, "DC":true, "C4":true, "C5":true, "C6":true, "C8":true, "C9":true, "C10":true, "PL4":true, "PL5":true, "PL6":true, "PL8":true, "PL9":true, "PL10":true, "B4":true, "B5":true, "B6":true, "B8":true, "B9":true, "B10":true,"BIG6":true,"BIG8":true,"H4":true,"H6":true,"H8":true,"H10":true,"PROP2":true,"PROP3":true,"PROP11":true,"PROP12":true,"PROPC":true,"PROPCE":true,"F":true,"CO4":true,"CO5":true,"CO6":true,"CO8":true,"CO9":true,"CO10":true}, {}]);
        test_get_winning_and_losing_bets_for_roll(5, 5, 2, [{"DP":Craps.DONT_PASS_LINE_WIN,"C":Craps.COME_LINE_WIN, 
                                                           "DC4":Craps.DONT_COME_LINE_WIN,"DC5":Craps.DONT_COME_LINE_WIN,
                                                           "DC6":Craps.DONT_COME_LINE_WIN,"DC8":Craps.DONT_COME_LINE_WIN,
                                                           "DC9":Craps.DONT_COME_LINE_WIN,"DC10":Craps.DONT_COME_LINE_WIN,
                                                           "DPO":Craps.DONT_FIVE_NINE_ODDS,"DPL4":Craps.DONT_PLACE_FOUR_TEN_ODDS,
                                                           "DPL5":Craps.DONT_PLACE_FIVE_NINE_ODDS,"DPL6":Craps.DONT_PLACE_SIX_EIGHT_ODDS,
                                                           "DPL8":Craps.DONT_PLACE_SIX_EIGHT_ODDS,"DPL9":Craps.DONT_PLACE_FIVE_NINE_ODDS,
                                                           "DPL10":Craps.DONT_PLACE_FOUR_TEN_ODDS,"L4":Craps.LAY_FOUR_TEN_ODDS,
                                                           "L5":Craps.LAY_FIVE_NINE_ODDS,"L6":Craps.LAY_SIX_EIGHT_ODDS,
                                                           "L8":Craps.LAY_SIX_EIGHT_ODDS,"L9":Craps.LAY_FIVE_NINE_ODDS,
                                                           "L10":Craps.LAY_FOUR_TEN_ODDS,"PROP7":Craps.PROP_SEVEN_ODDS,
                                                           "DCO4":Craps.DONT_FOUR_TEN_ODDS,"DCO5":Craps.DONT_FIVE_NINE_ODDS,
                                                           "DCO6":Craps.DONT_SIX_EIGHT_ODDS,"DCO8":Craps.DONT_SIX_EIGHT_ODDS,
                                                           "DCO9":Craps.DONT_FIVE_NINE_ODDS,"DCO10":Craps.DONT_FOUR_TEN_ODDS}, {"P":true, "PO":true, "DC":true, "C4":true, "C5":true, "C6":true, "C8":true, "C9":true, "C10":true, "PL4":true, "PL5":true, "PL6":true, "PL8":true, "PL9":true, "PL10":true, "B4":true, "B5":true, "B6":true, "B8":true, "B9":true, "B10":true,"BIG6":true,"BIG8":true,"H4":true,"H6":true,"H8":true,"H10":true,"PROP2":true,"PROP3":true,"PROP11":true,"PROP12":true,"PROPC":true,"PROPCE":true,"F":true,"CO4":true,"CO5":true,"CO6":true,"CO8":true,"CO9":true,"CO10":true}, {}]);
        test_get_winning_and_losing_bets_for_roll(8, 5, 2, [{"DP":Craps.DONT_PASS_LINE_WIN,"C":Craps.COME_LINE_WIN, 
                                                           "DC4":Craps.DONT_COME_LINE_WIN,"DC5":Craps.DONT_COME_LINE_WIN,
                                                           "DC6":Craps.DONT_COME_LINE_WIN,"DC8":Craps.DONT_COME_LINE_WIN,
                                                           "DC9":Craps.DONT_COME_LINE_WIN,"DC10":Craps.DONT_COME_LINE_WIN,
                                                           "DPO":Craps.DONT_SIX_EIGHT_ODDS,"DPL4":Craps.DONT_PLACE_FOUR_TEN_ODDS,
                                                           "DPL5":Craps.DONT_PLACE_FIVE_NINE_ODDS,"DPL6":Craps.DONT_PLACE_SIX_EIGHT_ODDS,
                                                           "DPL8":Craps.DONT_PLACE_SIX_EIGHT_ODDS,"DPL9":Craps.DONT_PLACE_FIVE_NINE_ODDS,
                                                           "DPL10":Craps.DONT_PLACE_FOUR_TEN_ODDS,"L4":Craps.LAY_FOUR_TEN_ODDS,
                                                           "L5":Craps.LAY_FIVE_NINE_ODDS,"L6":Craps.LAY_SIX_EIGHT_ODDS,
                                                           "L8":Craps.LAY_SIX_EIGHT_ODDS,"L9":Craps.LAY_FIVE_NINE_ODDS,
                                                           "L10":Craps.LAY_FOUR_TEN_ODDS,"PROP7":Craps.PROP_SEVEN_ODDS,
                                                           "DCO4":Craps.DONT_FOUR_TEN_ODDS,"DCO5":Craps.DONT_FIVE_NINE_ODDS,
                                                           "DCO6":Craps.DONT_SIX_EIGHT_ODDS,"DCO8":Craps.DONT_SIX_EIGHT_ODDS,
                                                           "DCO9":Craps.DONT_FIVE_NINE_ODDS,"DCO10":Craps.DONT_FOUR_TEN_ODDS}, {"P":true, "PO":true, "DC":true, "C4":true, "C5":true, "C6":true, "C8":true, "C9":true, "C10":true, "PL4":true, "PL5":true, "PL6":true, "PL8":true, "PL9":true, "PL10":true, "B4":true, "B5":true, "B6":true, "B8":true, "B9":true, "B10":true,"BIG6":true,"BIG8":true,"H4":true,"H6":true,"H8":true,"H10":true,"PROP2":true,"PROP3":true,"PROP11":true,"PROP12":true,"PROPC":true,"PROPCE":true,"F":true,"CO4":true,"CO5":true,"CO6":true,"CO8":true,"CO9":true,"CO10":true}, {}]);

        test_get_winning_and_losing_bets_for_roll(9, 5, 4, [{"C9":Craps.COME_LINE_WIN,"CO9":Craps.FIVE_NINE_ODDS,"P":Craps.PASS_LINE_WIN,"PO":Craps.FIVE_NINE_ODDS,"PL9":Craps.PLACE_FIVE_NINE_ODDS,"B9":Craps.BUY_FIVE_NINE_ODDS,"F":Craps.FIELD_ODDS}, {"DP":true, "DPO":true, "DC9":true, "DPL9":true, "L9":true, "PROP2":true,"PROP3":true,"PROP7":true,"PROP11":true,"PROP12":true,"PROPC":true,"PROPCE":true,"DCO9":true}, {}]);
        test_get_winning_and_losing_bets_for_roll(10, 5, 5, [{"C10":Craps.COME_LINE_WIN,"CO10":Craps.FOUR_TEN_ODDS,"P":Craps.PASS_LINE_WIN,"PO":Craps.FOUR_TEN_ODDS,"PL10":Craps.PLACE_FOUR_TEN_ODDS,"B10":Craps.BUY_FOUR_TEN_ODDS,"H10":Craps.HARD_FOUR_TEN_ODDS,"F":Craps.FIELD_ODDS}, {"DP":true, "DPO":true, "DC10":true, "DPL10":true, "L10":true,"PROP2":true,"PROP3":true,"PROP7":true,"PROP11":true,"PROP12":true,"PROPC":true,"PROPCE":true,"DCO10":true}, {}]);
        test_get_winning_and_losing_bets_for_roll(6, 3, 3, [{"C6":Craps.COME_LINE_WIN,"CO6":Craps.SIX_EIGHT_ODDS,"P":Craps.PASS_LINE_WIN,"PO":Craps.SIX_EIGHT_ODDS,"PL6":Craps.PLACE_SIX_EIGHT_ODDS,"B6":Craps.BUY_SIX_EIGHT_ODDS,"BIG6":Craps.BIG_SIX_EIGHT_ODDS,"H6":Craps.HARD_SIX_EIGHT_ODDS}, {"DP":true, "DPO":true, "DC6":true, "DPL6":true, "L6":true, "PROP2":true,"PROP3":true,"PROP7":true,"PROP11":true,"PROP12":true,"PROPC":true,"PROPCE":true,"F":true,"DCO6":true}, {}]);
        test_get_winning_and_losing_bets_for_roll(9, 4, 4, [{"C8":Craps.COME_LINE_WIN,"CO8":Craps.SIX_EIGHT_ODDS,"BIG8":Craps.BIG_SIX_EIGHT_ODDS,"H8":Craps.HARD_SIX_EIGHT_ODDS,"B8":Craps.BUY_SIX_EIGHT_ODDS,"PL8":Craps.PLACE_SIX_EIGHT_ODDS}, {"DC8":true, "DPL8":true,"L8":true,"PROP2":true,"PROP3":true,"PROP7":true,"PROP11":true,"PROP12":true,"PROPC":true,"PROPCE":true,"F":true,"DCO8":true}, {}]);
        test_get_winning_and_losing_bets_for_roll(9, 5, 5, [{"C10":Craps.COME_LINE_WIN,"CO10":Craps.FOUR_TEN_ODDS,"H10":Craps.HARD_FOUR_TEN_ODDS,"F":Craps.FIELD_ODDS,"B10":Craps.BUY_FOUR_TEN_ODDS,"PL10":Craps.PLACE_FOUR_TEN_ODDS}, {"DC10":true, "DPL10":true,"L10":true,"PROP2":true,"PROP3":true,"PROP7":true,"PROP11":true,"PROP12":true,"PROPC":true,"PROPCE":true,"DCO10":true}, {}]);
        test_get_winning_and_losing_bets_for_roll(9, 2, 2, [{"C4":Craps.COME_LINE_WIN,"CO4":Craps.FOUR_TEN_ODDS,"H4":Craps.HARD_FOUR_TEN_ODDS,"F":Craps.FIELD_ODDS,"B4":Craps.BUY_FOUR_TEN_ODDS,"PL4":Craps.PLACE_FOUR_TEN_ODDS}, {"DC4":true, "DPL4":true, "L4":true,"PROP2":true,"PROP3":true,"PROP7":true,"PROP11":true,"PROP12":true,"PROPC":true,"PROPCE":true,"DCO4":true}, {}]);
        test_get_winning_and_losing_bets_for_roll(9, 1, 3, [{"C4":Craps.COME_LINE_WIN,"CO4":Craps.FOUR_TEN_ODDS,"F":Craps.FIELD_ODDS,"B4":Craps.BUY_FOUR_TEN_ODDS,"PL4":Craps.PLACE_FOUR_TEN_ODDS}, {"DC4":true, "DPL4":true,"L4":true,"H4":true,"PROP2":true,"PROP3":true,"PROP7":true,"PROP11":true,"PROP12":true,"PROPC":true,"PROPCE":true,"DCO4":true}, {}]);
        test_get_winning_and_losing_bets_for_roll(9, 2, 3, [{"C5":Craps.COME_LINE_WIN,"CO5":Craps.FIVE_NINE_ODDS,"B5":Craps.BUY_FIVE_NINE_ODDS,"PL5":Craps.PLACE_FIVE_NINE_ODDS}, {"DC5":true, "DPL5":true,"L5":true,"PROP2":true,"PROP3":true,"PROP7":true,"PROP11":true,"PROP12":true,"PROPC":true,"PROPCE":true,"F":true,"DCO5":true}, {}]);
        test_get_winning_and_losing_bets_for_roll(9, 2, 4, [{"C6":Craps.COME_LINE_WIN,"CO6":Craps.SIX_EIGHT_ODDS,"BIG6":Craps.BIG_SIX_EIGHT_ODDS,"B6":Craps.BUY_SIX_EIGHT_ODDS,"PL6":Craps.PLACE_SIX_EIGHT_ODDS}, {"DC6":true, "DPL6":true,"L6":true,"H6":true,"PROP2":true,"PROP3":true,"PROP7":true,"PROP11":true,"PROP12":true,"PROPC":true,"PROPCE":true,"F":true,"DCO6":true}, {}]);

        test_get_winning_and_losing_bets_for_roll(9, 1, 2, [{"DC":Craps.DONT_COME_LINE_WIN,"PROP3":Craps.PROP_THREE_ELEVEN_ODDS,"PROPC":Craps.PROP_CRAPS_ODDS,"F":Craps.FIELD_ODDS,"PROPCE":Craps.PROPCE_CRAPS_ODDS}, {"C":true,"PROP2":true,"PROP7":true,"PROP11":true,"PROP12":true}, {}]);
        test_get_winning_and_losing_bets_for_roll(9, 1, 1, [{"DC":Craps.DONT_COME_LINE_WIN,"PROP2":Craps.PROP_TWO_TWELVE_ODDS,"PROPC":Craps.PROP_CRAPS_ODDS,"F":Craps.FIELD_TWO_ODDS,"PROPCE":Craps.PROPCE_CRAPS_ODDS}, {"C":true,"PROP3":true,"PROP7":true,"PROP11":true,"PROP12":true}, {}]);
        test_get_winning_and_losing_bets_for_roll(9, 6, 6, [{"PROP12":Craps.PROP_TWO_TWELVE_ODDS,"PROPC":Craps.PROP_CRAPS_ODDS,"F":Craps.FIELD_TWELVE_ODDS,"PROPCE":Craps.PROPCE_CRAPS_ODDS}, {"C":true,"PROP2":true,"PROP3":true,"PROP7":true,"PROP11":true}, {}]);
        test_get_winning_and_losing_bets_for_roll(9, 5, 6, [{"C":Craps.COME_LINE_WIN,"PROP11":Craps.PROP_THREE_ELEVEN_ODDS,"F":Craps.FIELD_ODDS,"PROPCE":Craps.PROPCE_ELEVEN_ODDS}, {"DC":true,"PROP2":true,"PROP3":true,"PROP7":true,"PROP12":true,"PROPC":true}, {}]);

        test_is_legal_to_remove(null, "P", [true, {"PO":true}]);
        test_is_legal_to_remove(null, "DP", [true, {"DPO":true}]);
        test_is_legal_to_remove(null, "C", [true, {}]);
        test_is_legal_to_remove(null, "DC", [true, {}]);
        test_is_legal_to_remove(null, "PO", [true, {}]);
        test_is_legal_to_remove(null, "DPO", [true, {}]);
        test_is_legal_to_remove(null, "PL4", [true, {}]);
        test_is_legal_to_remove(null, "PL5", [true, {}]);
        test_is_legal_to_remove(null, "PL6", [true, {}]);
        test_is_legal_to_remove(null, "PL8", [true, {}]);
        test_is_legal_to_remove(null, "PL9", [true, {}]);
        test_is_legal_to_remove(null, "PL10", [true, {}]);
        test_is_legal_to_remove(null, "DPL4", [true, {}]);
        test_is_legal_to_remove(null, "DPL5", [true, {}]);
        test_is_legal_to_remove(null, "DPL6", [true, {}]);
        test_is_legal_to_remove(null, "DPL8", [true, {}]);
        test_is_legal_to_remove(null, "DPL9", [true, {}]);
        test_is_legal_to_remove(null, "DPL10", [true, {}]);
        test_is_legal_to_remove(null, "B4", [true, {}]);
        test_is_legal_to_remove(null, "B5", [true, {}]);
        test_is_legal_to_remove(null, "B6", [true, {}]);
        test_is_legal_to_remove(null, "B8", [true, {}]);
        test_is_legal_to_remove(null, "B9", [true, {}]);
        test_is_legal_to_remove(null, "B10", [true, {}]);
        test_is_legal_to_remove(null, "L4", [true, {}]);
        test_is_legal_to_remove(null, "L5", [true, {}]);
        test_is_legal_to_remove(null, "L6", [true, {}]);
        test_is_legal_to_remove(null, "L8", [true, {}]);
        test_is_legal_to_remove(null, "L9", [true, {}]);
        test_is_legal_to_remove(null, "L10", [true, {}]);
        test_is_legal_to_remove(null, "BIG6", [true, {}]);
        test_is_legal_to_remove(null, "BIG8", [true, {}]);
        test_is_legal_to_remove(null, "H4", [true, {}]);
        test_is_legal_to_remove(null, "H6", [true, {}]);
        test_is_legal_to_remove(null, "H8", [true, {}]);
        test_is_legal_to_remove(null, "H10", [true, {}]);
        test_is_legal_to_remove(null, "PROP2", [true, {}]);
        test_is_legal_to_remove(null, "PROP3", [true, {}]);
        test_is_legal_to_remove(null, "PROP7", [true, {}]);
        test_is_legal_to_remove(null, "PROP11", [true, {}]);
        test_is_legal_to_remove(null, "PROP12", [true, {}]);
        test_is_legal_to_remove(null, "PROPC", [true, {}]);
        test_is_legal_to_remove(null, "PROPCE", [true, {}]);
        test_is_legal_to_remove(null, "F", [true, {}]);
        test_is_legal_to_remove(null, "CO4", [true, {}]);
        test_is_legal_to_remove(null, "CO5", [true, {}]);
        test_is_legal_to_remove(null, "CO6", [true, {}]);
        test_is_legal_to_remove(null, "CO8", [true, {}]);
        test_is_legal_to_remove(null, "CO9", [true, {}]);
        test_is_legal_to_remove(null, "CO10", [true, {}]);
        test_is_legal_to_remove(null, "DCO4", [true, {}]);
        test_is_legal_to_remove(null, "DCO5", [true, {}]);
        test_is_legal_to_remove(null, "DCO6", [true, {}]);
        test_is_legal_to_remove(null, "DCO8", [true, {}]);
        test_is_legal_to_remove(null, "DCO9", [true, {}]);
        test_is_legal_to_remove(null, "DCO10", [true, {}]);
        test_is_legal_to_remove(null, "C4", [false, {}]);
        test_is_legal_to_remove(null, "C5", [false, {}]);
        test_is_legal_to_remove(null, "C6", [false, {}]);
        test_is_legal_to_remove(null, "C8", [false, {}]);
        test_is_legal_to_remove(null, "C9", [false, {}]);
        test_is_legal_to_remove(null, "C10", [false, {}]);
        test_is_legal_to_remove(null, "DC4", [true, {"DCO4":true}]);
        test_is_legal_to_remove(null, "DC5", [true, {"DCO5":true}]);
        test_is_legal_to_remove(null, "DC6", [true, {"DCO6":true}]);
        test_is_legal_to_remove(null, "DC8", [true, {"DCO8":true}]);
        test_is_legal_to_remove(null, "DC9", [true, {"DCO9":true}]);
        test_is_legal_to_remove(null, "DC10", [true, {"DCO10":true}]);

        test_is_legal_to_remove(8, "P", [false, {"PO":true}]);
        test_is_legal_to_remove(8, "DP", [true, {"DPO":true}]);
        test_is_legal_to_remove(8, "C", [true, {}]);
        test_is_legal_to_remove(8, "DC", [true, {}]);
        test_is_legal_to_remove(8, "PO", [true, {}]);
        test_is_legal_to_remove(8, "DPO", [true, {}]);
        test_is_legal_to_remove(8, "PL4", [true, {}]);
        test_is_legal_to_remove(8, "PL5", [true, {}]);
        test_is_legal_to_remove(8, "PL6", [true, {}]);
        test_is_legal_to_remove(8, "PL8", [true, {}]);
        test_is_legal_to_remove(8, "PL9", [true, {}]);
        test_is_legal_to_remove(8, "PL10", [true, {}]);
        test_is_legal_to_remove(8, "DPL4", [true, {}]);
        test_is_legal_to_remove(8, "DPL5", [true, {}]);
        test_is_legal_to_remove(8, "DPL6", [true, {}]);
        test_is_legal_to_remove(8, "DPL8", [true, {}]);
        test_is_legal_to_remove(8, "DPL9", [true, {}]);
        test_is_legal_to_remove(8, "DPL10", [true, {}]);
        test_is_legal_to_remove(8, "B4", [true, {}]);
        test_is_legal_to_remove(8, "B5", [true, {}]);
        test_is_legal_to_remove(8, "B6", [true, {}]);
        test_is_legal_to_remove(8, "B8", [true, {}]);
        test_is_legal_to_remove(8, "B9", [true, {}]);
        test_is_legal_to_remove(8, "B10", [true, {}]);
        test_is_legal_to_remove(8, "L4", [true, {}]);
        test_is_legal_to_remove(8, "L5", [true, {}]);
        test_is_legal_to_remove(8, "L6", [true, {}]);
        test_is_legal_to_remove(8, "L8", [true, {}]);
        test_is_legal_to_remove(8, "L9", [true, {}]);
        test_is_legal_to_remove(8, "L10", [true, {}]);
        test_is_legal_to_remove(8, "BIG6", [true, {}]);
        test_is_legal_to_remove(8, "BIG8", [true, {}]);
        test_is_legal_to_remove(8, "H4", [true, {}]);
        test_is_legal_to_remove(8, "H6", [true, {}]);
        test_is_legal_to_remove(8, "H8", [true, {}]);
        test_is_legal_to_remove(8, "H10", [true, {}]);
        test_is_legal_to_remove(8, "PROP2", [true, {}]);
        test_is_legal_to_remove(8, "PROP3", [true, {}]);
        test_is_legal_to_remove(8, "PROP7", [true, {}]);
        test_is_legal_to_remove(8, "PROP11", [true, {}]);
        test_is_legal_to_remove(8, "PROP12", [true, {}]);
        test_is_legal_to_remove(8, "PROPC", [true, {}]);
        test_is_legal_to_remove(8, "PROPCE", [true, {}]);
        test_is_legal_to_remove(8, "F", [true, {}]);
        test_is_legal_to_remove(8, "CO4", [true, {}]);
        test_is_legal_to_remove(8, "CO5", [true, {}]);
        test_is_legal_to_remove(8, "CO6", [true, {}]);
        test_is_legal_to_remove(8, "CO8", [true, {}]);
        test_is_legal_to_remove(8, "CO9", [true, {}]);
        test_is_legal_to_remove(8, "CO10", [true, {}]);
        test_is_legal_to_remove(8, "DCO4", [true, {}]);
        test_is_legal_to_remove(8, "DCO5", [true, {}]);
        test_is_legal_to_remove(8, "DCO6", [true, {}]);
        test_is_legal_to_remove(8, "DCO8", [true, {}]);
        test_is_legal_to_remove(8, "DCO9", [true, {}]);
        test_is_legal_to_remove(8, "DCO10", [true, {}]);
        test_is_legal_to_remove(8, "C4", [false, {}]);
        test_is_legal_to_remove(8, "C5", [false, {}]);
        test_is_legal_to_remove(8, "C6", [false, {}]);
        test_is_legal_to_remove(8, "C8", [false, {}]);
        test_is_legal_to_remove(8, "C9", [false, {}]);
        test_is_legal_to_remove(8, "C10", [false, {}]);
        test_is_legal_to_remove(8, "DC4", [true, {"DCO4":true}]);
        test_is_legal_to_remove(8, "DC5", [true, {"DCO5":true}]);
        test_is_legal_to_remove(8, "DC6", [true, {"DCO6":true}]);
        test_is_legal_to_remove(8, "DC8", [true, {"DCO8":true}]);
        test_is_legal_to_remove(8, "DC9", [true, {"DCO9":true}]);
        test_is_legal_to_remove(8, "DC10", [true, {"DCO10":true}]);


    });
}
