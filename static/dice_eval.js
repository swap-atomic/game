Dice = function() {
}

Dice.get_win_cutoff = function( is_high, chance ) {
    if( is_high ) {
        return (1000000 - chance - 1);
    }
    else {
        return chance;
    }
}

Dice.is_rare = function( chance, prize ) {
    // This number is about 1/70 chance, which is comparable to what is rare in the other games.
    var RARE_CUTOFF = 14285;
    return( chance <= RARE_CUTOFF && prize > 0 );
}

Dice.get_lucky_number_str = function( num ) {
    num /= 10000.0;
    var num_str = "" + num;
    if( Math.floor(num) == num ) {
        num_str += ".";    
    }
    if( num < 10 ) {
        num_str = "0" + num_str;
    }
    var orig_length = num_str.length;
    for( var c = 0; c < 7 - orig_length; c++ ) {
        num_str += "0";
    }
    return num_str;
}
