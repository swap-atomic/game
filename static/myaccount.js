function init_myaccount(key, my_player_ident, my_public_id, initial_leaderboards, initial_mygames ) {

    sound_list = [];
    common_init( null, key, my_player_ident, my_public_id, initial_mygames, initial_leaderboards, null, sound_list );

    dialog_system.init_help( [] );

   	$.ajax({
	    url: '/account/gauth_shared_secret'
	}).done(function(shared_secret_result) {
	    if( shared_secret_result['result'] == 'success' ) {
	        console.log(shared_secret_result);
	        var shared_secret = shared_secret_result['shared_secret'];
	        var src = 'src="https://chart.googleapis.com/chart?chs=180x180&cht=qr&choe=UTF-8&chl=otpauth://totp/' + my_public_id + '@games.bitcoin.com?secret=' + shared_secret + '"';
	        $("#gauth_qr_content").html('<img id="google_auth_qr_image" width="150" height="150" style="border: none;" alt="' + my_public_id + '@cashgames.bitcoin.com" ' + src + ' />');
		$("#shared_secret").html($("#shared_secret").html()+shared_secret)
	    }
	});
}
