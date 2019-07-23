
Blackjack = function() {
}

Blackjack.STAND     = 0;
Blackjack.HIT       = 1;
Blackjack.DOUBLE    = 2;
Blackjack.SPLIT     = 3;
Blackjack.INSURANCE = 4;
Blackjack.PROGRESSIVE_WIN_JACKPOT = -1;

Blackjack.PROGRESSIVE_HAND_THREE_DIAMOND_SEVENS = 6;
Blackjack.PROGRESSIVE_HAND_THREE_SUITED_SEVENS = 5;
Blackjack.PROGRESSIVE_HAND_THREE_UNSUITED_SEVENS = 4;
Blackjack.PROGRESSIVE_HAND_TWO_SUITED_SEVENS = 3;
Blackjack.PROGRESSIVE_HAND_TWO_UNSUITED_SEVENS = 2;
Blackjack.PROGRESSIVE_HAND_ONE_SEVEN = 1;
Blackjack.PROGRESSIVE_HAND_NOTHING = 0;

Blackjack.PROGRESSIVE_HAND_NAMES = [
    "Nothing",
    "One Seven",
    "Two sevens",
    "Two suited sevens",
    "Three sevens",
    "Three suited sevens",
    "Three diamond sevens",
];

Blackjack.get_card_rank_number = function( card ) {
    if(card[0] == 't' || card[0] == 'j' || card[0] == 'q' || card[0] == 'k') {
        return 10;
    } else if(card[0] == 'a') {
        return 1;
    } else {
        return parseInt(card[0], 10);
    }
}
Blackjack.get_card_suit = function( card ) {
    return card[1];
}

Blackjack.score_hand = function( cards ) {
    var values = new Array();

    for( var c in cards ) {
        values.push(Blackjack.get_card_rank_number(cards[c]));
    }

    var num_aces = count_elem(values, 1);

    var new_values = new Array();
    for( var i = 0; i < values.length; i++ ) {
        if( values[i] != 1 ) {
            new_values.push(values[i]);
        }
    }

    var base = reduce(new_values, function(a, b) { return a+b; }, 0 );

    if( num_aces == 0 ) return [base];

    var totals = []
    for( var j = 0; j <= num_aces; j++ ) {
        var t = base + j*1 + (num_aces - j)*11;
        if( indexOf(totals, t) == -1 ) totals.push(t);
    }

    totals.sort(function(a,b) { return a-b; });
    return totals;
}

Blackjack.is_blackjack = function( cards ) {
    return cards.length == 2 && indexOf(Blackjack.score_hand(cards), 21) > -1;
}

Blackjack.is_bust = function( cards ) {
    return Blackjack.score_hand(cards)[0] > 21;
}

Blackjack.is_21 = function( cards ) {
    return indexOf(Blackjack.score_hand(cards), 21) > -1;
}

Blackjack.dealer_action = function( cards, hit_on_soft_17 ) {
    if( hit_on_soft_17 == undefined ) hit_on_soft_17 = false;

    if( Blackjack.is_bust(cards) ) throw "invalid";

    if( Blackjack.is_21(cards) ) return Blackjack.STAND;

    var t = Blackjack.score_hand(cards);
    var score = new Array();
    for( var ti = 0; ti < t.length; ti++ ) {
        if( t[ti] <= 21 ) {
            score.push(t[ti]);
        }
    }

    if( score[score.length-1] >= 17 ) {
        // When hit_on_soft_17 is used, the house advantage against the players is slightly increased.
        if( score[score.length-1] == 17 && hit_on_soft_17 ) {
            for( var ci = 0; ci < cards.length; ci++ ) {
                if( Blackjack.get_card_rank_number(cards[ci]) == 1 ) {
                    return Blackjack.HIT;
                }
            }
        }
        return Blackjack.STAND;
    }

    return Blackjack.HIT;
}

Blackjack.get_prize = function( dealer_hand, player_hand, bet, has_split, blackjack_pays ) {
    if( blackjack_pays == undefined ) blackjack_pays = [3, 2];

    if( Blackjack.is_bust(player_hand) ) return 0;
    
    var dealer_blackjack = !Blackjack.is_bust(dealer_hand) && Blackjack.is_blackjack( dealer_hand );
    var player_blackjack = !has_split && Blackjack.is_blackjack( player_hand );
    if(dealer_blackjack && player_blackjack) return bet;

    if(player_blackjack && !dealer_blackjack) {
        return bet + blackjack_pays[0] * Math.floor( bet / blackjack_pays[1] );
    }

    if(dealer_blackjack) return 0;

    if(Blackjack.is_bust(dealer_hand)) return bet * 2;

    var dealer_score_t = Blackjack.score_hand(dealer_hand);
    var dealer_score = new Array();
    for( var i = 0; i < dealer_score_t.length; i++ ) {
        if( dealer_score_t[i] <= 21 ) dealer_score.push(dealer_score_t[i]);
    }

    var player_score_t = Blackjack.score_hand(player_hand);
    var player_score = new Array();
    for( var i = 0; i < player_score_t.length; i++ ) {
        if( player_score_t[i] <= 21 ) player_score.push(player_score_t[i]);
    }

    if( player_score[player_score.length-1] > dealer_score[dealer_score.length-1] ) return bet * 2;
    else if( player_score[player_score.length-1] == dealer_score[dealer_score.length-1] ) return bet;
    return 0
}

Blackjack.get_progressive_hand_for_game = function( cards, actions ) {
    // http://www.countingedge.com/triple-7-blackjack.html
    // http://www.lolblackjack.com/blackjack/games/progressive-triple-7s-blackjack/
    // http://www.jackpot.co.uk/blackjack-jackpots

    var sevens = new Array();

    if( actions.length > 0 && actions[0] == 'I' ) {
        actions = actions.slice(1);
    }

    if( Blackjack.get_card_rank_number(cards[0]) == 7 ) {
        sevens.push(cards[0]);
        if( Blackjack.get_card_rank_number(cards[2]) == 7 ) {
            sevens.push(cards[2]);

            if( actions.length > 0 && (indexOf("HDS", actions[0]) >= 0) && Blackjack.get_card_rank_number(cards[4]) == 7 ) {
                sevens.push(cards[4]);
            }
        }
    }

    if( sevens.length == 3 ) {
        if( sevens[0][1] == sevens[1][1] && sevens[1][1] == sevens[2][1] && sevens[2][1] == 'd' ) {
            return Blackjack.PROGRESSIVE_HAND_THREE_DIAMOND_SEVENS;
        } else if( sevens[0][1] == sevens[1][1] && sevens[1][1] == sevens[2][1] ) {
            return Blackjack.PROGRESSIVE_HAND_THREE_SUITED_SEVENS;
        } else {
            return Blackjack.PROGRESSIVE_HAND_THREE_UNSUITED_SEVENS;
        }
    } else if( sevens.length == 2 ) {
        if( sevens[0][1] == sevens[1][1] ) {
            return Blackjack.PROGRESSIVE_HAND_TWO_SUITED_SEVENS;
        } else {
            return Blackjack.PROGRESSIVE_HAND_TWO_UNSUITED_SEVENS;
        }
    } else if( sevens.length == 1 ) {
            return Blackjack.PROGRESSIVE_HAND_ONE_SEVEN;
    }

    return Blackjack.PROGRESSIVE_HAND_NOTHING;
}

Blackjack.get_progressive_win_for_game = function( cards, actions, progressive_bet, paytable ) {
    var hand = Blackjack.get_progressive_hand_for_game( cards, actions )
    if( hand != Blackjack.PROGRESSIVE_HAND_THREE_DIAMOND_SEVENS ) {
        return paytable[ hand ] * progressive_bet;
    }
    else {
        return paytable[ hand ];
    }
}

Blackjack.get_progressive_hand_name = function( progressive_hand ) {
    return Blackjack.PROGRESSIVE_HAND_NAMES[progressive_hand];
}

Blackjack.get_game_eval = function( dealer_hand, player_hands, original_bet, bets, insurance ) {
    var prizes = [];
    var game_eval = [];
    var won_insurance = false;
    var has_split = player_hands.length > 1;
    for( var i = 0; i < player_hands.length; i++ ) {
    
        var player_hand = player_hands[i];
        var prize = Blackjack.get_prize( dealer_hand, player_hand, bets[i], has_split );
        if( player_hands.length == 1 && Blackjack.is_blackjack( player_hand ) ) {
            if( prize == bets[i] ) {
                game_eval.push( "BJP" ); 
            }    
            else {
                game_eval.push( "BJ" );
            }
        }
        else {
            var d = "";
            if( bets[i] > original_bet ) {
                d = "D"; 
            }
            if( prize == bets[i] ) {
                game_eval.push('P' + d)
            }
            else if( prize > 0 ) {
                if( Blackjack.is_21(player_hand) ) {
                    game_eval.push('2W' + d);
                }
                else {
                    game_eval.push('W' + d); 
                }
            }
            else {
                if( Blackjack.is_bust(player_hand) ) {
                    game_eval.push('LB' + d); 
                } 
                else {
                    game_eval.push('L' + d); 
                }
            }
        }
        
        // if i == 0 and insurance is not None and blackjack.is_blackjack(dealer_hand):
        if( i == 0 && insurance == true && Blackjack.is_blackjack( dealer_hand )) {
            won_insurance = true;
        }
        
    }
    
    game_eval = game_eval.join();
    if( insurance == true ) {
        if( won_insurance ) {
            game_eval = 'IW:' + game_eval;
        }
        else {
            game_eval = 'IL:' + game_eval; 
        }
    }
    return game_eval;
}

Blackjack.get_pretty_game_eval = function( game_eval ) {
    // Get rid of insurance crap
    if( game_eval[0] == "I" ) {
        game_eval = game_eval.slice( 3 ); 
    } 
    
    if( game_eval == "BJ" ) {
        return "Blackjack";
    }
    if( game_eval == "BJP" ) {
        return "Blackjack Push";
    }
    
    games = game_eval.split(',');
    if( games.length == 1 ) {
        var g = games[0];
        // +D
        // P, 2W, W, LB, L
        if( g[0] == "P" ) {
            return "Push";
        }
        else if( g[0] == "2" ) {
            return "Twenty One";
        }
        else if( g[0] == "W" ) {
            return "Win";
        }
        else if( g[0] == "L" ) {
            if( indexOf(g, "LB") == 0 ) {
                return "Bust";
            }
            else {
                return "Nothing";
            }
        }
        else {
            console.log("Error, unknown game_eval: " + g);
        }
    }
    else {
        // Count number of wins/losses and just show that 
        var wins = 0;
        var losses = 0;
        for( var i = 0; i < games.length; i++ ) {
            var g = games[i];
            if( indexOf(g, "W") != -1 ) {
                wins += 1;
            }
            else if( indexOf(g, "L") != -1 ) {
                losses += 1; 
            }
        }
        
        return "Win " + wins + "/" + (wins+losses) + " hands";
    }
    
    return "Error";
}

// standard tables at 
// http://wizardofodds.com/games/blackjack/strategy/calculator/
// but doesn't show what player should do with 2-2 when not allowed to split (imagine getting a bunch of 2s)
// real hand I was dealt once:
// 8c 8s   (split)
// 8c7d4c (stand) 8s8h (split)
// 8c7d4c 8sjs (stand) 8h8d (split)
// 8c7d4c 8sjs 8h6h3d (stand) 8d8d (can't split any more..)
// you can imagine twos instead of eights here...so I added a 4 row
// based on the table at http://wizardofodds.com/games/blackjack/ halfway down the page.
Blackjack.player_hard_table = {
      // dealer_shows:
      //                A                 2                 3                 4                 5                 6                 7                 8                 9                T 
    4: [ Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   ],
    5: [ Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   ],
    6: [ Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   ],
    7: [ Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   ],
    8: [ Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   ],
    9: [ Blackjack.HIT   , Blackjack.HIT   , Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   ],
   10: [ Blackjack.HIT   , Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.HIT   ],
   11: [ Blackjack.HIT   , Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.HIT   ],
   12: [ Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   ],
   13: [ Blackjack.HIT   , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   ],
   14: [ Blackjack.HIT   , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   ],
   15: [ Blackjack.HIT   , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   ],
   16: [ Blackjack.HIT   , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   ],
   17: [ Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND ],
   18: [ Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND ],
   19: [ Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND ],
   20: [ Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND ],
   21: [ Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND ]
};


Blackjack.player_soft_table = {
      // dealer_shows:
      //                A                 2                 3                 4                 5                 6                 7                 8                 9                T 
   13: [ Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   ],
   14: [ Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   ],
   15: [ Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   ],
   16: [ Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   ],
   17: [ Blackjack.HIT   , Blackjack.HIT   , Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   ],
   18: [ Blackjack.HIT   , Blackjack.STAND , Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.STAND , Blackjack.STAND , Blackjack.HIT   , Blackjack.HIT   ],
   19: [ Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND ],
   20: [ Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND ],
   21: [ Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND ]
};


Blackjack.player_pair_table = {
      // dealer_shows:
      //                A                 2                 3                 4                 5                 6                 7                 8                 9                T 
    2: [ Blackjack.HIT   , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   ],
    3: [ Blackjack.HIT   , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   ],
    4: [ Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   ],
    5: [ Blackjack.HIT   , Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.DOUBLE, Blackjack.HIT   ],
    6: [ Blackjack.HIT   , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   ],
    7: [ Blackjack.HIT   , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.HIT   , Blackjack.HIT   , Blackjack.HIT   ],
    8: [ Blackjack.HIT   , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.HIT   ],
    9: [ Blackjack.STAND , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.STAND , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.STAND ],
   10: [ Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND , Blackjack.STAND ],
    1: [ Blackjack.HIT   , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT , Blackjack.SPLIT ]
};

Blackjack.player_action = function(dealer_shows, player_hands, hand_index, actions, take_insurance_freq, max_split_count, progressive_bet, original_bet, num_credits) {
    // player_action should never be called on a busted hand
    var dealer_shows_rank = Blackjack.get_card_rank_number(dealer_shows);
    if( player_hands[hand_index].length == 2 && dealer_shows_rank == 1 && indexOf(actions, 'I') < 0 && num_credits >= (original_bet/2) ) {
        if( Math.random() < take_insurance_freq ) {
            return Blackjack.INSURANCE;
        }
    }

    var has_pair = (player_hands[hand_index].length == 2) && (Blackjack.get_card_rank_number(player_hands[hand_index][0]) == Blackjack.get_card_rank_number(player_hands[hand_index][1]));
    var pair_rank = Blackjack.get_card_rank_number(player_hands[hand_index][0]);

    // player can only split if they have enough money to pay for it.
    if( has_pair ) {
        var action = Blackjack.player_pair_table[pair_rank][dealer_shows_rank-1];

        // can only split up to a certain # of times.  if we can't split, continue on
        // as if we had no pair...
        if( action != Blackjack.SPLIT || count_elem(actions, 'S') < max_split_count ) {
            if( num_credits >= original_bet || ( action == Blackjack.HIT || action == Blackjack.STAND ) ) {
                return action;
            }
        } else if( pair_rank == 1 ) {
            // we would only get here if we are allowed to hit on these aces, otherwise the
            // blackjack game would skip over that hand and not even ask for action
            // pair of aces should just get hit, if it can't be split
            // everything else falls through to regular hand evaluation
            return Blackjack.HIT;
        }
    }

    var hand_score_t = Blackjack.score_hand(player_hands[hand_index]);
    var hand_score = new Array();
    for( var i = 0; i < hand_score_t.length; i++ ) {
        if( hand_score_t[i] <= 21 ) hand_score.push(hand_score_t[i]);
    }

    var high_score = 0;
    for( var i = 0; i < hand_score.length; i++ ) {
        if( hand_score[i] <= 21 && hand_score[i] > high_score ) high_score = hand_score[i];
    }

    var is_soft = hand_score.length > 1;
    if( is_soft ) { // only happens if we have an ace AND we aren't forced into a score

        // with 1 ace, the score must be >= 13 (2+11+...)
        var action = Blackjack.player_soft_table[high_score][dealer_shows_rank-1];
        if( action == Blackjack.DOUBLE && player_hands[hand_index].length > 2 ) {

            // the chart says "Double or stand" for 18 value hands..
            if( high_score == 18 ) {
                action = Blackjack.STAND;
            } else {
                // the other slots are "double or hit"
                action = Blackjack.HIT;
            }
        }

        if( num_credits >= original_bet || ( action == Blackjack.HIT || action == Blackjack.STAND ) ) {
            return action;
        }
    } 

    //will be >=4 and <=21.  4 is only possible with 2,2 (which we will get if we hit our split limit) or A,3 (caught as soft 14)
    var action = Blackjack.player_hard_table[high_score][dealer_shows_rank-1];

    if( action == Blackjack.DOUBLE && player_hands[hand_index].length > 2 ) {
        action = Blackjack.HIT;
    }

    if( num_credits >= original_bet || ( action == Blackjack.HIT || action == Blackjack.STAND ) ) {
        return action;
    }

    if( action == Blackjack.DOUBLE ) return Blackjack.HIT;

    console.log("auto-play error. please alert the website operators that this occurred.");
    return Blackjack.STAND;
}

Blackjack.test = function() {
    var testone = function(f, v, r) {
        var cr = f(v);
        var good;
        if( typeof(cr) === "object" ) {
            good = cr.length == r.length;
            if( good ) {
                for( var i = 0; i < r.length; i++ ) {
                    if( cr[i] != r[i] ) good = false;
                }
            }
        } else {
            good = cr == r;
        }

        if( !good ) {
            //alert(f + "(" + v + ") gives " + cr + " but should give " + r );
            alert("(" + v + ") gives " + cr + " but should give " + r );
        }
    };
    var testtwo = function(f, v1, v2, r) {
        var cr = f(v1, v2);
        var good;
        if( typeof(cr) === "object" ) {
            good = cr.length == r.length;
            if( good ) {
                for( var i = 0; i < r.length; i++ ) {
                    if( cr[i] != r[i] ) good = false;
                }
            }
        } else {
            good = cr == r;
        }

        if( !good ) {
            alert(f + "(" + v1 + ", " + v2 + ") gives " + cr + " but should give " + r );
        }
    };
    var testfour = function(f, v1, v2, v3, v4, r) {
        var cr = f(v1, v2, v3, v4);
        var good;
        if( typeof(cr) === "object" ) {
            good = cr.length == r.length;
            if( good ) {
                for( var i = 0; i < r.length; i++ ) {
                    if( cr[i] != r[i] ) good = false;
                }
            }
        } else {
            good = cr == r;
        }

        if( !good ) {
            //alert(f + "(" + v1 + ", " + v2 + ", " + v3 + ", " + v4 + ") gives " + cr + " but should give " + r );
            alert("(" + v1 + ", " + v2 + ", " + v3 + ", " + v4 + ") gives " + cr + " but should give " + r );
        }
    };
    var testfive = function(f, v1, v2, v3, v4, v5, r) {
        var cr = f(v1, v2, v3, v4, v5);
        var good;
        if( typeof(cr) === "object" ) {
            good = cr.length == r.length;
            if( good ) {
                for( var i = 0; i < r.length; i++ ) {
                    if( cr[i] != r[i] ) good = false;
                }
            }
        } else {
            good = cr == r;
        }

        if( !good ) {
            //  - The f is so big I can't read the rest!
            //alert(f + "(" + v1 + ", " + v2 + ", " + v3 + ", " + v4 + ", " + v5 + ") gives " + cr + " but should give " + r );
            alert( "(" + v1 + ", " + v2 + ", " + v3 + ", " + v4 + ", " + v5 + ") gives " + cr + " but should give " + r );
        }
    };
    testone(Blackjack.get_card_rank_number, 'ad', 1);
    testone(Blackjack.get_card_rank_number, '2d', 2);
    testone(Blackjack.get_card_rank_number, '3d', 3);
    testone(Blackjack.get_card_rank_number, '4d', 4);
    testone(Blackjack.get_card_rank_number, '5d', 5);
    testone(Blackjack.get_card_rank_number, '6d', 6);
    testone(Blackjack.get_card_rank_number, '7d', 7);
    testone(Blackjack.get_card_rank_number, '8d', 8);
    testone(Blackjack.get_card_rank_number, '9d', 9);
    testone(Blackjack.get_card_rank_number, 'td', 10);
    testone(Blackjack.get_card_rank_number, 'jd', 10);
    testone(Blackjack.get_card_rank_number, 'qd', 10);
    testone(Blackjack.get_card_rank_number, 'kd', 10);
    
    var ranks = "23456789tjqk";
    for( var vi in ranks ) {
        for( var ui in ranks ) {
            var v = ranks[vi];
            var u = ranks[ui];
            var vr = Blackjack.get_card_rank_number(v);
            var ur = Blackjack.get_card_rank_number(u);
            testone(Blackjack.score_hand, [v+'d',u+'h'], [vr+ur]);
        }
    }

    for( var vi in ranks ) {
        for( var ui in ranks ) {
            for( var wi in ranks ) {
                var v = ranks[vi];
                var u = ranks[ui];
                var w = ranks[wi];
                var vr = Blackjack.get_card_rank_number(v);
                var ur = Blackjack.get_card_rank_number(u);
                var wr = Blackjack.get_card_rank_number(w);
                testone(Blackjack.score_hand, [v+'d',u+'h',w+'c'], [vr+ur+wr]);
            }
        }
    }

    testone(Blackjack.score_hand, ['ad'], [1, 11]);
    testone(Blackjack.score_hand, ['ad', 'ah'], [2, 12, 22]);
    testone(Blackjack.score_hand, ['ad', 'ah', 'ac'], [3, 13, 23, 33]);
    testone(Blackjack.score_hand, ['ad', 'ah', 'ac', 'as'], [4, 14, 24, 34, 44]);
    testone(Blackjack.score_hand, ['5h', 'ac', 'as'], [7, 17, 27]);

    testone(Blackjack.is_bust, ['2h'], false);
    testone(Blackjack.is_bust, ['2h', '5d'], false);
    testone(Blackjack.is_bust, ['2h', '5d', 'tc'], false);
    testone(Blackjack.is_bust, ['2h', '5d', 'tc', '6h'], true);
    testone(Blackjack.is_bust, ['2h', '5d', 'tc', 'ah'], false);
    testone(Blackjack.is_bust, ['2h', '5d', 'tc', 'ah', '4s'], true);

    testone(Blackjack.is_21, ['3c'], false);
    testone(Blackjack.is_21, ['3c', '7h'], false);
    testone(Blackjack.is_21, ['3c', '7h', 'tc'], false);
    testone(Blackjack.is_21, ['3c', '7h', 'tc', 'ah'], true);

    testone(Blackjack.is_blackjack, ['3c'], false);
    testone(Blackjack.is_blackjack, ['3c', '7h'], false);
    testone(Blackjack.is_blackjack, ['3c', '7h', 'tc'], false);
    testone(Blackjack.is_blackjack, ['3c', '7h', 'tc', 'ah'], false);

    testone(Blackjack.is_blackjack, ['3c'], false);
    testone(Blackjack.is_blackjack, ['jc', 'ah'], true);
    testone(Blackjack.is_blackjack, ['ac', '7h', 'tc'], false);
    testone(Blackjack.is_blackjack, ['3c', '7h', 'tc', 'ah'], false);

    testone(Blackjack.dealer_action, ['ah', '8d'], Blackjack.STAND);
    testone(Blackjack.dealer_action, ['ac', '6h'], Blackjack.STAND);
    testone(Blackjack.dealer_action, ['5h', 'ad'], Blackjack.HIT);
    testone(Blackjack.dealer_action, ['5h', 'ad', '7c'], Blackjack.HIT);
    testone(Blackjack.dealer_action, ['5h', 'ad', '7c', '5s'], Blackjack.STAND);
    try {
        Blackjack.dealer_action(['5h', 'ad', '7c', '5s', '4c']);
        throw "shouldn't get here";
    } catch (e) {}
    testtwo(Blackjack.dealer_action, ['6h', 'ad'], true, Blackjack.HIT);
    testtwo(Blackjack.dealer_action, ['4h', 'ad', '2d'], true, Blackjack.HIT);
    testtwo(Blackjack.dealer_action, ['4h', 'ad', '3d'], true, Blackjack.STAND);

    testfour(Blackjack.get_prize, ['5d', 'ac', '2h'], ['ah', 'td'], 10, false, 25);
    testfour(Blackjack.get_prize, ['qd', 'ac'], ['ah', 'td'], 10, false, 10);
    testfour(Blackjack.get_prize, ['qd', 'ac'], ['ah', '7d'], 10, false, 0);
    testfour(Blackjack.get_prize, ['qd', '4c', '5d'], ['ah', '7d'], 10, false, 0);
    testfour(Blackjack.get_prize, ['qd', '4c', '5d'], ['ah', '7d', '2c'], 10, false, 20);
    testfour(Blackjack.get_prize, ['qd', '4c', '9d'], ['3h', '7d', '2c'], 20, false, 40);
    testfour(Blackjack.get_prize, ['qd', '4c', '9d'], ['3h', '7d', '2c', 'qh'], 20, false, 0);
    testfour(Blackjack.get_prize, ['qd', '4c', '9d'], ['3h', '7d', '2c', 'qh'], 20, false, 0);
    testfour(Blackjack.get_prize, ['qd', '4c', '3d'], ['3h', '7d', '7c'], 20, false, 20);
    testfour(Blackjack.get_prize, ['5d', 'ac', '2h'], ['ah', 'td'], 10, true, 20);

    var progressive_paytable = [ 0, 5, 25, 50, 250, 1000, Blackjack.PROGRESSIVE_WIN_JACKPOT ];
    
    testtwo(Blackjack.get_progressive_hand_for_game, ['7d', '3c', '7d', '9d', '7d'], 'H', Blackjack.PROGRESSIVE_HAND_THREE_DIAMOND_SEVENS);
    testtwo(Blackjack.get_progressive_hand_for_game, ['7s', '3c', '7s', '9d', '7s'], 'H', Blackjack.PROGRESSIVE_HAND_THREE_SUITED_SEVENS);
    testtwo(Blackjack.get_progressive_hand_for_game, ['7d', '3c', '7d', '9d', '9s'], 'H', Blackjack.PROGRESSIVE_HAND_TWO_SUITED_SEVENS);
    testtwo(Blackjack.get_progressive_hand_for_game, ['7d', '3c', '7d', '9d', '6s'], 'H', Blackjack.PROGRESSIVE_HAND_TWO_SUITED_SEVENS);
    testtwo(Blackjack.get_progressive_hand_for_game, ['kc', '3c', '2d', '9d', '7d'], 'H', Blackjack.PROGRESSIVE_HAND_NOTHING);
    testtwo(Blackjack.get_progressive_hand_for_game, ['7c', '3c', '7d', '9d', '7d'], 'S', Blackjack.PROGRESSIVE_HAND_THREE_UNSUITED_SEVENS);
    testtwo(Blackjack.get_progressive_hand_for_game, ['7c', '3c', '7d', '9d', '7d'], 'IS', Blackjack.PROGRESSIVE_HAND_THREE_UNSUITED_SEVENS);
    testtwo(Blackjack.get_progressive_hand_for_game, ['7c', '3c', '7c', '9d', '7c'], 'IS', Blackjack.PROGRESSIVE_HAND_THREE_SUITED_SEVENS);
    testtwo(Blackjack.get_progressive_hand_for_game, ['7d', '3c', '7d', '9d', '7d'], 'IS', Blackjack.PROGRESSIVE_HAND_THREE_DIAMOND_SEVENS);
    testtwo(Blackjack.get_progressive_hand_for_game, ['7d', '3c', '7d', '9d', '7d'], 'ID', Blackjack.PROGRESSIVE_HAND_THREE_DIAMOND_SEVENS);
    testtwo(Blackjack.get_progressive_hand_for_game, ['7d', '3c', '7d', '9d', '7d'], 'IH', Blackjack.PROGRESSIVE_HAND_THREE_DIAMOND_SEVENS);
    testtwo(Blackjack.get_progressive_hand_for_game, ['7d', '3c', '7d', '9d', '7d'], 'D', Blackjack.PROGRESSIVE_HAND_THREE_DIAMOND_SEVENS);
    testtwo(Blackjack.get_progressive_hand_for_game, ['7d', '3c', '7d', '9d', '7d'], 'S', Blackjack.PROGRESSIVE_HAND_THREE_DIAMOND_SEVENS);
    testtwo(Blackjack.get_progressive_hand_for_game, ['6d', '3c', '7d', '9d', '7d'], 'H', Blackjack.PROGRESSIVE_HAND_NOTHING);

    testfour(Blackjack.get_progressive_win_for_game, ['7d', '3c', '7d', '9d', '7d'], 'H', 1, progressive_paytable, Blackjack.PROGRESSIVE_WIN_JACKPOT);
    testfour(Blackjack.get_progressive_win_for_game, ['7s', '3c', '7s', '9d', '7s'], 'H', 1, progressive_paytable, 1000);
    testfour(Blackjack.get_progressive_win_for_game, ['7s', '3c', '7s', '9d', '7s'], 'H', 3, progressive_paytable, 3000);
    testfour(Blackjack.get_progressive_win_for_game, ['7d', '3c', '7s', '9d', '7s'], 'H', 4, progressive_paytable, 1000);
    testfour(Blackjack.get_progressive_win_for_game, ['7d', '3c', '7d', '9d', '9s'], 'H', 1, progressive_paytable, 50);
    testfour(Blackjack.get_progressive_win_for_game, ['7d', '3c', '7d', '9d', '6s'], 'H', 1, progressive_paytable, 50);
    testfour(Blackjack.get_progressive_win_for_game, ['7d', '3c', '2d', '9d', '7d'], 'H', 2, progressive_paytable, 10);
    testfour(Blackjack.get_progressive_win_for_game, ['7s', '3c', '2d', '9d', '7d'], 'H', 2, progressive_paytable, 10);
    testfour(Blackjack.get_progressive_win_for_game, ['7c', '3c', '2d', '9d', '7d'], 'H', 3, progressive_paytable, 15);
    testfour(Blackjack.get_progressive_win_for_game, ['7c', '3c', '2d', '9d', '9d'], 'H', 3, progressive_paytable, 15);
    testfour(Blackjack.get_progressive_win_for_game, ['kc', '3c', '2d', '9d', '7d'], 'H', 1, progressive_paytable, 0);
    testfour(Blackjack.get_progressive_win_for_game, ['7c', '3c', '7d', '9d', '7d'], 'S', 1, progressive_paytable, 250);
    testfour(Blackjack.get_progressive_win_for_game, ['7c', '3c', '7d', '9d', '7d'], 'IS', 1, progressive_paytable, 250);
    testfour(Blackjack.get_progressive_win_for_game, ['7c', '3c', '7c', '9d', '7c'], 'IS', 1, progressive_paytable, 1000);
    testfour(Blackjack.get_progressive_win_for_game, ['7d', '3c', '7d', '9d', '7d'], 'IS', 1, progressive_paytable, Blackjack.PROGRESSIVE_WIN_JACKPOT);
    testfour(Blackjack.get_progressive_win_for_game, ['7d', '3c', '7d', '9d', '7d'], 'ID', 1, progressive_paytable, Blackjack.PROGRESSIVE_WIN_JACKPOT);
    testfour(Blackjack.get_progressive_win_for_game, ['7d', '3c', '7d', '9d', '7d'], 'IH', 1, progressive_paytable, Blackjack.PROGRESSIVE_WIN_JACKPOT);
    testfour(Blackjack.get_progressive_win_for_game, ['7d', '3c', '7d', '9d', '7d'], 'D', 1, progressive_paytable, Blackjack.PROGRESSIVE_WIN_JACKPOT);
    testfour(Blackjack.get_progressive_win_for_game, ['7d', '3c', '7d', '9d', '7d'], 'S', 1, progressive_paytable, Blackjack.PROGRESSIVE_WIN_JACKPOT);
    testfour(Blackjack.get_progressive_win_for_game, ['6d', '3c', '7d', '9d', '7d'], 'H', 1, progressive_paytable, 0);

    // 
    testfive( Blackjack.get_game_eval, ['5d', 'ac', '2h'], [['ah', 'td']], 100000, [100000], false, 'BJ' );
    testfive( Blackjack.get_game_eval, ['jd', 'ac'], [['ah', 'td']], 100000, [100000], false, 'BJP' );
    
    testfive( Blackjack.get_game_eval, ['jd', 'ac'], [['2h', '9h', 'td']], 100000, [100000], false, 'L' );
    testfive( Blackjack.get_game_eval, ['td', '8c'], [['2h', '9h', '4h', 'td']], 100000, [100000], false, 'LB' );
    testfive( Blackjack.get_game_eval, ['jd', 'ac'], [['2h', '9h', '4h', 'td']], 100000, [100000], false, 'LB' );
    
    testfive( Blackjack.get_game_eval, ['jd', '8c'], [['2h', '9h', 'th']], 100000, [100000], false, '2W' );
    testfive( Blackjack.get_game_eval, ['jd', '8c'], [['2h', '9h', '9h']], 100000, [100000], false, 'W' );
    
    testfive( Blackjack.get_game_eval, ['jd', '8c'], [['2h', '9h', '9h'], ['2d', '9d', '9s']], 100000, [100000,100000], false, 'W,W' );
    testfive( Blackjack.get_game_eval, ['jd', '8c'], [['2h', '9h', '9h'], ['2d', '6d', '4s']], 100000, [100000,100000], false, 'W,L' );
    testfive( Blackjack.get_game_eval, ['jd', '8c'], [['2h', '3h', '5h'], ['2d', '6d', '4s']], 100000, [100000,100000], false, 'L,L' );
    
    testfive( Blackjack.get_game_eval, ['jd', '5c', 'td'], [['2h', '3h', '5h'], ['2d', '6d', '4s']], 100000, [100000,100000], false, 'W,W' );
    testfive( Blackjack.get_game_eval, ['4d', '8c', '5c'], [['td', '7d'], ['js', '6h'], ['kd', 'qs'], ['js', '3h', '9h'], ['tc', 'kd']], 100000, [10000, 10000, 10000, 10000, 10000], false, 'P,L,W,LB,W' );

    testfive( Blackjack.get_game_eval, ['th', 'ad'], [['3c', '5c', '4d']], 100000, [100000], false, 'L' );
    
    testone( Blackjack.get_pretty_game_eval, "L", "Nothing" );
    testone( Blackjack.get_pretty_game_eval, "IW:L", "Nothing" );
    testone( Blackjack.get_pretty_game_eval, "IL:L", "Nothing" );
    testone( Blackjack.get_pretty_game_eval, "BJ", "Blackjack" );
    testone( Blackjack.get_pretty_game_eval, "W", "Win" );
    testone( Blackjack.get_pretty_game_eval, "IW:W", "Win" );
    testone( Blackjack.get_pretty_game_eval, "IL:W", "Win" );
    testone( Blackjack.get_pretty_game_eval, "2W", "Twenty One" );
    testone( Blackjack.get_pretty_game_eval, "LB", "Bust" );
    testone( Blackjack.get_pretty_game_eval, "L,L", "Win 0/2 hands" );
    testone( Blackjack.get_pretty_game_eval, "W,W", "Win 2/2 hands" );
    testone( Blackjack.get_pretty_game_eval, "W,2W,L", "Win 2/3 hands" );
    testone( Blackjack.get_pretty_game_eval, "2W,2W,L", "Win 2/3 hands" );
    testone( Blackjack.get_pretty_game_eval, "L,W,W", "Win 2/3 hands" );
    testone( Blackjack.get_pretty_game_eval, "L,W,L", "Win 1/3 hands" );
    testone( Blackjack.get_pretty_game_eval, "L,P,L", "Win 0/2 hands" );
    testone( Blackjack.get_pretty_game_eval, "LB,P,LB", "Win 0/2 hands" );
    testone( Blackjack.get_pretty_game_eval, "2W,P,LB", "Push" );
}

if( false ) {
    $(document).ready(function() {
        Blackjack.test();
    });
}

