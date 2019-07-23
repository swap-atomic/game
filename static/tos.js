function init_myaccount(key, my_player_ident, my_public_id, initial_leaderboards, initial_mygames ) {
	sound_list = [];
	common_init( null, key, my_player_ident, my_public_id, initial_mygames, initial_leaderboards, null, sound_list );

	dialog_system.init_help( [] );
}
