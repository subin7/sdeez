//****************************************************************************************************\\
//*******************************************INITIALIZATIONS******************************************\\
//****************************************************************************************************\\
var socket = io.connect(window.location.href);

var initInterval = setInterval(function () {
	socket.emit("checkInit", {});
}, 1000);

socket.on("checkInit", function (data) {
	if (data.status) {
		$('#initializing').addClass('animated fadeOut').on('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function () {
			$(this).css('display', 'none');
		});
		clearInterval(initInterval);
	}
});

$(document).ready(function () {
	$('.modal-trigger').leanModal();
	socket.emit("update_request", {minimal: true});

	$(window).scroll(function () {
		if ($(this).scrollTop() > 100) {
			$('#btn_scrollToTop').fadeIn();
		} else {
			$('#btn_scrollToTop').fadeOut();
		}
	});

	$('#btn_scrollToTop').click(function () {
		$('html, body').animate({scrollTop: 0}, 800);
		return false;
	});
});

socket.emit("getChartsCountryList", {});
socket.emit("getChartsTrackListByCountry", {country: 'Germany'});

//****************************************************************************************************\\
//***********************************************MODALS***********************************************\\
//****************************************************************************************************\\

//###############################################GLOBAL###############################################\\
$('.modal-close').click(function (ev) {
	ev.preventDefault();
});

//###########################################MODAL_SETTINGS###########################################\\
$('#nav_btn_openSettingsModal').click(function () {

	var settings = getSettings();

	fillSettingsModal(settings.trackNameTemplate, settings.playlistTrackNameTemplate, settings.path, settings.createM3UFile, settings.createArtistFolder, settings.createAlbumFolder);

});

$('#modal_settings_btn_saveSettings').click(function () {

	Cookies.set('settings', {
		trackNameTemplate: $('#modal_settings_input_trackNameTemplate').val(),
		playlistTrackNameTemplate: $('#modal_settings_input_playlistTrackNameTemplate').val(),
		path: $('#modal_settings_input_path').val(),
		createM3UFile: $('#modal_settings_cbox_createM3UFile').is(':checked'),
		createArtistFolder: $('#modal_settings_cbox_createArtistFolder').is(':checked'),
		createAlbumFolder: $('#modal_settings_cbox_createAlbumFolder').is(':checked')
	}, {expires: 9999})

});

$('#modal_settings_btn_defaultSettings').click(function () {

	fillSettingsModal('%artist% - %title%', '%number% - %artist% - %title%', '', false, false, false);

});

function fillSettingsModal(trackNameTemplate, playlistTrackNameTemplate, path, createM3UFile, createArtistFolder, createAlbumFolder) {

	$('#modal_settings_input_trackNameTemplate').val(trackNameTemplate);
	$('#modal_settings_input_playlistTrackNameTemplate').val(playlistTrackNameTemplate);
	$('#modal_settings_input_path').val(path);
	$('#modal_settings_cbox_createM3UFile').prop('checked', createM3UFile);
	$('#modal_settings_cbox_createArtistFolder').prop('checked', createArtistFolder);
	$('#modal_settings_cbox_createAlbumFolder').prop('checked', createAlbumFolder);

}

function setDefaultSettings() {

	Cookies.set('settings', {
		trackNameTemplate: '%artist% - %title%',
		playlistTrackNameTemplate: '%number% - %artist% - %title%',
		path: '',
		createM3UFile: false,
		createArtistFolder: false,
		createAlbumFolder: false
	}, {expires: 9999});

}

function getSettings() {

	var settings_JSON;

	if ((settings_JSON = Cookies.get('settings')) == undefined) {
		setDefaultSettings();
		settings_JSON = Cookies.get('settings');
	}

	return jQuery.parseJSON(settings_JSON);

}

//############################################MODAL_UPDATE############################################\\
$('#nav_btn_openUpdateModal').click(function () {

	socket.emit('update_request', {});

});

//minimal update request
socket.on("update_request_minimal", function (data) {
	//data.err         -> undefined/true
	//data.update      -> true/false

	if (data.update) {
		$('#nav_btn_openUpdateModal_updateBadge').removeClass('hide');
	}

});

//full update request
socket.on("update_request", function (data) {
	//data.err         -> undefined/true
	//data.update      -> true/false
	//if data.update -> true:
	//data.url         -> link to update;
	//data.update_info -> object with more information
	//data.update_info {
	//	changes_de: Array[1],   (Every change -> 1 item of type string)
	//	changes_en: Array[1],   (Every change -> 1 item of type string)
	//	last: "1.0.3",
	//	new: "1.0.4",
	//}

	$("#modal_update_loadingIndicator").addClass('hide');

	if (data.update) {

		$("#modal_update_message").html('' +
			'<b>New Update found!</b><br />' +
			'<b>Your Version</b>: ' + data.update_info['last'] + '<br />' +
			'<b>New Version</b>: ' + data.update_info['new'] + '<br /><br />' +
			'<b>What\'s new? (German only)</b><br />');

		for (var i = 0; i < data.update_info['changes_de'].length; i++) {

			$("#modal_update_message").append('- ' + data.update_info['changes_de'][i] + '<br />');

		}

		$('#modal_update_btn_downloadUpdate').attr('href', data.url);
		$('#modal_update_btn_downloadUpdate').removeClass('hide');

	} else if (!data.update) {

		$('#modal_update_message').html("No update available! You already using the newest version! :)");

	} else if (data.err) {

		$('#modal_update_message').html("Unable to check for update!");

	}

	$('#modal_update_message').removeClass('hide');

});

//#############################################MODAL_MSG##############################################\\
function message(title, message) {

	$('#modal_msg_title').html(title);

	$('#modal_msg_message').html(message);

	$('#modal_msg').openModal();

}

//****************************************************************************************************\\
//************************************************TABS************************************************\\
//****************************************************************************************************\\

//###############################################TAB_URL##############################################\\
$('#tab_url_form_url').submit(function (ev) {

	ev.preventDefault();

	var url = $("#song_url").val();

	//Validate URL
	if (url.indexOf('deezer.com/') < 0) {
		message('Wrong URL', 'The URL seems to be wrong. Please check it and try it again.');

		return false;
	}

	if (url.indexOf('?') > -1) {
		url = url.substring(0, url.indexOf("?"));
	}

	addToQueue(url);

});

//#############################################TAB_SEARCH#############################################\\
$('#tab_search_form_search').submit(function (ev) {

	ev.preventDefault();

	var searchString = $('#tab_search_form_search_input_searchString').val().trim();
	var mode = $('#tab_search_form_search').find('input[name=searchMode]:checked').val();

	if (searchString.length == 0) {
		message('Search can\'t be empty', 'You tried to search for nothing. But if you search nothing, you\'ll find nothing. So don\'t try it again.');

		return;
	}

	$('#tab_search_table_results').find('thead').find('tr').addClass('hide');
	$('#tab_search_table_results_tbody_results').addClass('hide');
	$('#tab_search_table_results_tbody_noResults').addClass('hide');
	$('#tab_search_table_results_tbody_loadingIndicator').removeClass('hide');


	socket.emit("search", {type: mode, text: searchString});

});

socket.on('search', function (data) {

	$('#tab_search_table_results_tbody_loadingIndicator').addClass('hide');

	if (data.items.length == 0) {
		$('#tab_search_table_results_tbody_noResults').removeClass('hide');
		return;
	}

	console.log(data);

	if (data.type == 'track') {

		showResults_table_track(data.items);

	} else if (data.type == 'album') {

		showResults_table_album(data.items);

	} else if (data.type == 'artist') {

		showResults_table_artist(data.items);

	} else if (data.type == 'playlist') {

		showResults_table_playlist(data.items);

	}

	$('#tab_search_table_results_tbody_results').removeClass('hide');

});

function showResults_table_track(tracks) {

	var tableBody = $('#tab_search_table_results_tbody_results');

	$(tableBody).html('');

	$('#tab_search_table_results_thead_track').removeClass('hide');

	for (var i = 0; i < tracks.length; i++) {

		var currentResultTrack = tracks[i];

		$(tableBody).append(
			'<tr class="animated fadeInUp">' +
			'<td><img src="' + currentResultTrack['album']['cover_small'] + '" class="circle" /></td>' +
			'<td>' + currentResultTrack['title'] + '</td>' +
			'<td>' + currentResultTrack['artist']['name'] + '</td>' +
			'<td>' + currentResultTrack['album']['title'] + '</td>' +
			'<td>' + convertDuration(currentResultTrack['duration']) + '</td>' +
			'</tr>');

		generateDownloadLink(currentResultTrack['link']).appendTo(tableBody.children('tr:last')).wrap('<td>');

	}

}

function showResults_table_album(albums) {

	var tableBody = $('#tab_search_table_results_tbody_results');

	$(tableBody).html('');

	$('#tab_search_table_results_thead_album').removeClass('hide');

	for (var i = 0; i < albums.length; i++) {

		var currentResultAlbum = albums[i];

		$(tableBody).append(
			'<tr class="animated fadeInUp">' +
			'<td><img src="' + currentResultAlbum['cover_small'] + '" class="circle" /></td>' +
			'<td>' + currentResultAlbum['title'] + '</td>' +
			'<td>' + currentResultAlbum['artist']['name'] + '</td>' +
			'<td>' + currentResultAlbum['nb_tracks'] + '</td>' +
			'</tr>');

		generateShowTracklistButton(currentResultAlbum['link']).appendTo(tableBody.children('tr:last')).wrap('<td>');
		generateDownloadLink(currentResultAlbum['link']).appendTo(tableBody.children('tr:last')).wrap('<td>');

	}

}

function showResults_table_artist(artists) {

	var tableBody = $('#tab_search_table_results_tbody_results');

	$(tableBody).html('');

	$('#tab_search_table_results_thead_artist').removeClass('hide');

	for (var i = 0; i < artists.length; i++) {

		var currentResultArtist = artists[i];

		$(tableBody).append(
			'<tr class="animated fadeInUp">' +
			'<td><img src="' + currentResultArtist['picture_small'] + '" class="circle" /></td>' +
			'<td>' + currentResultArtist['name'] + '</td>' +
			'<td>' + currentResultArtist['nb_album'] + '</td>' +
			'</tr>');

		generateShowTracklistButton(currentResultArtist['link']).appendTo(tableBody.children('tr:last')).wrap('<td>');
		generateDownloadLink(currentResultArtist['link']).appendTo(tableBody.children('tr:last')).wrap('<td>');

	}

}

function showResults_table_playlist(playlists) {

	var tableBody = $('#tab_search_table_results_tbody_results');

	$(tableBody).html('');

	$('#tab_search_table_results_thead_playlist').removeClass('hide');

	for (var i = 0; i < playlists.length; i++) {

		var currentResultPlaylist = playlists[i];

		$(tableBody).append(
			'<tr class="animated fadeInUp">' +
			'<td><img src="' + currentResultPlaylist['picture_small'] + '" class="circle" /></td>' +
			'<td>' + currentResultPlaylist['title'] + '</td>' +
			'<td>' + currentResultPlaylist['nb_tracks'] + '</td>' +
			'</tr>');

		generateShowTracklistButton(currentResultPlaylist['link']).appendTo(tableBody.children('tr:last')).wrap('<td>');
		generateDownloadLink(currentResultPlaylist['link']).appendTo(tableBody.children('tr:last')).wrap('<td>');

	}

}

function generateShowTracklistButton(link) {

	var btn_showTrackList = $('<a href="#" class="waves-effect btn-flat"><i class="material-icons">list</i></a>');

	$(btn_showTrackList).click(function (ev) {

		ev.preventDefault();

		showTrackList(link);

	});

	return btn_showTrackList;

}

function showTrackList(link) {

	$('#modal_trackList_table_trackList_tbody_trackList').addClass('hide');
	$('#modal_trackList_table_trackList_tbody_loadingIndicator').removeClass('hide');

	$('#modal_trackList').openModal();

	socket.emit("getTrackList", {id: getIDFromLink(link), type: getTypeFromLink(link)});

}
socket.on("getTrackList", function (data) {
	//data.err      -> undefined/err
	//data.id       -> passed id
	//data.response -> API response

	var trackList = data.response.data, content = '';

	for (var i = 0; i < trackList.length; i++) {

		content += '<tr><td>' + (i + 1) + '</td><td>' + trackList[i].title + '</td><td>' + trackList[i].artist.name + '</td><td>' + convertDuration(trackList[i].duration) + '</td></tr>';

	}

	$('#modal_trackList_table_trackList_tbody_trackList').html(content);
	$('#modal_trackList_table_trackList_tbody_loadingIndicator').addClass('hide');
	$('#modal_trackList_table_trackList_tbody_trackList').removeClass('hide');


});

//#############################################TAB_CHARTS#############################################\\
socket.on("getChartsCountryList", function (data) {
	//data.countries    -> Array
	//data.countries[0].country -> String (country name)
	//data.countries[0].picture_small/picture_medium/picture_big -> url to cover

	for (var i = 0; i < data.countries.length; i++) {
		$('#tab_charts_select_country').append('<option value="' + data.countries[i]['country'] + '" data-icon="' + data.countries[i]['picture_small'] + '" class="left circle">' + data.countries[i]['country'] + '</option>');
	}

	$('#tab_charts_select_country').find('option[value="Germany"]').attr("selected", true);

	$('select').material_select();
});

$('#tab_charts_select_country').on('change', function () {

	var country = $(this).find('option:selected').val();

	$('#tab_charts_table_charts_tbody_charts').addClass('hide');
	$('#tab_charts_table_charts_tbody_loadingIndicator').removeClass('hide');

	socket.emit("getChartsTrackListByCountry", {country: country});

});

socket.on("getChartsTrackListByCountry", function (data) {
	//data.playlist    -> Object with Playlist information
	//data.tracks      -> Array
	//data.tracks[0]   -> Object of track 0

	var chartsTableBody = $('#tab_charts_table_charts_tbody_charts'), currentChartTrack;

	chartsTableBody.html('');

	for (var i = 0; i < data.tracks.length; i++) {

		currentChartTrack = data.tracks[i];

		$(chartsTableBody).append(
			'<tr>' +
			'<td>' + (i + 1) + '</td>' +
			'<td><img src="' + currentChartTrack['album']['cover_small'] + '" class="circle" /></td>' +
			'<td>' + currentChartTrack['title'] + '</td>' +
			'<td>' + currentChartTrack['artist']['name'] + '</td>' +
			'<td>' + currentChartTrack['album']['title'] + '</td>' +
			'<td>' + convertDuration(currentChartTrack['duration']) + '</td>' +
			'</tr>');

		generateDownloadLink(currentChartTrack['link']).appendTo(chartsTableBody.children('tr:last')).wrap('<td>');

	}

	$('#tab_charts_table_charts_tbody_loadingIndicator').addClass('hide');
	chartsTableBody.removeClass('hide');

});

//############################################TAB_DOWNLOADS###########################################\\
function addToQueue(url) {

	var type = getTypeFromLink(url), id = getIDFromLink(url), settings = getSettings();

	if (type == 'track') {
		settings.filename = settings.trackNameTemplate;
	} else if (type == 'playlist') {
		settings.filename = settings.playlistTrackNameTemplate;
	} else if (type == 'album') {
		settings.filename = settings.playlistTrackNameTemplate;
	} else if (type == 'artist') {
		settings.filename = settings.playlistTrackNameTemplate;
	} else {
		$('#modal_wrongURL').openModal();
		return false;
	}

	if (alreadyInQueue(id)) {
		Materialize.toast('<i class="material-icons">playlist_add_check</i>Already in download-queue!', 5000);

		return false;
	}

	if (id.match(/^[0-9]+$/) == null) {
		$('#modal_wrongURL').openModal();

		return false;
	}

	socket.emit("download" + type, {id: id, settings: settings});

	Materialize.toast('<i class="material-icons">add</i>Added to download-queue', 5000);

}

function alreadyInQueue(id) {

	var alreadyInQueue = false;

	$('#tab_downloads_table_downloads').find('tbody').find('tr').each(function () {

		if ($(this).data('deezerid') == id) {
			alreadyInQueue = true;

			return false
		}

	});

	return alreadyInQueue;

}

socket.on('addToQueue', function (data) {

	var tableBody = $('#tab_downloads_table_downloads').find('tbody');

	$(tableBody).append(
		'<tr id="' + data.queueId + '" data-deezerid="' + data.id + '">' +
		'<td class="queueTitle">' + data.name + '</td>' +
		'<td class="queueSize">' + data.size + '</td>' +
		'<td class="queueDownloaded">' + data.downloaded + '</td>' +
		'<td class="queueFailed">' + data.failed + '</td>' +
		'<td><div class="progress"><div class="indeterminate"></div></div></td>' +
		'</tr>');

	var btn_remove = $('<a href="#" class="btn-flat waves-effect"><i class="material-icons">remove</i></a>');

	$(btn_remove).click(function (ev) {

		ev.preventDefault();

		socket.emit("cancelDownload", {queueId: data.queueId});

	});

	btn_remove.appendTo(tableBody.children('tr:last')).wrap('<td class="eventBtn center">');

});

socket.on("downloadStarted", function (data) {
	//data.queueId -> queueId of started download

	//Switch progress type indeterminate to determinate
	$('#' + data.queueId).find('.indeterminate').removeClass('indeterminate').addClass('determinate');
	$('#' + data.queueId).find('.eventBtn').find('a').html('<i class="material-icons">clear</i>');

});

socket.on('updateQueue', function (data) {

	if (data.cancelFlag) {
		return;
	}

	$('#' + data.queueId).find('.queueDownloaded').html(data.downloaded);
	$('#' + data.queueId).find('.queueFailed').html(data.failed);

	if (data.failed == 0 && ((data.downloaded + data.failed) >= data.size)) {
		$('#' + data.queueId).find('.eventBtn').html('<i class="material-icons">done</i>');
		Materialize.toast('<i class="material-icons">done</i>One download completed!', 5000)
	} else if (data.downloaded == 0 && ((data.downloaded + data.failed) >= data.size)) {
		$('#' + data.queueId).find('.eventBtn').html('<i class="material-icons">error</i>');
		Materialize.toast('<i class="material-icons">error</i>One download failed!', 5000)
	}

});

socket.on("downloadProgress", function (data) {
	//data.queueId -> id (string)
	//data.percentage -> float/double, percentage
	//updated in 1% steps

	$('#' + data.queueId).find('.determinate').css('width', data.percentage + '%');

});

socket.on("emptyDownloadQueue", function () {

	Materialize.toast('<i class="material-icons">done_all</i>All downloads completed!', 5000);

});

socket.on("cancelDownload", function (data) {
	//data.queueId    -> queueId of item which was canceled
	$('#' + data.queueId).addClass('animated fadeOutRight').on('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function () {
		$(this).remove();
		Materialize.toast('<i class="material-icons">clear</i>One download removed!', 5000)
	});
});

$('#clearTracksTable').click(function (ev) {

	$('#tab_downloads_table_downloads').find('tbody').find('.finished', '.error').addClass('animated fadeOutRight').on('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function () {
		$(this).remove();
	});

	return false;

});

//****************************************************************************************************\\
//******************************************HELPER-FUNCTIONS******************************************\\
//****************************************************************************************************\\
function getIDFromLink(link) {

	return link.substring(link.lastIndexOf("/") + 1);

}

function getTypeFromLink(link) {

	var type;

	if (link.indexOf('track') > -1) {
		type = "track";
	} else if (link.indexOf('playlist') > -1) {
		type = "playlist";
	} else if (link.indexOf('album') > -1) {
		type = "album";
	} else if (link.indexOf('artist')) {
		type = "artist";
	}

	return type;

}

function generateDownloadLink(url) {

	var btn_download = $('<a href="#" class="waves-effect btn-flat"><i class="material-icons">file_download</i></a>');

	$(btn_download).click(function (ev) {

		ev.preventDefault();

		addToQueue(url);

	});

	return btn_download;

}

function convertDuration(duration) {

	//convert from seconds only to mm:ss format
	var mm, ss;
	mm = Math.floor(duration / 60);
	ss = duration - (mm * 60);

	//add leading zero if ss < 0
	if (ss < 10) {
		ss = "0" + ss;
	}

	return mm + ":" + ss;

}